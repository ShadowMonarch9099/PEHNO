"""
Gap report use-cases: compute (expensive), cache, invalidate on 3+ new garments.

Cache: Redis when REDIS_URL is set (key gap:{user_id}), else an in-process dict.
Either way the entry stores the wardrobe size it was computed for, so a user who
adds 3+ garments gets a fresh report on the next request; otherwise reports are
refreshed weekly by the Celery job.
"""
import json
import logging
import time
from dataclasses import asdict
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app import knowledge
from app.core.config import settings
from app.core.database import utcnow
from app.models.garment import ClassificationStatus, Garment
from app.models.outfit import Outfit
from app.models.user import User
from app.services import analytics, gap_analyzer

log = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 7 * 24 * 3600
INVALIDATE_AFTER_NEW_GARMENTS = 3

_local_cache: dict[str, tuple[float, dict]] = {}


def _cache_key(user_id) -> str:
    return f"gap:{user_id}"


def _redis():
    if not settings.REDIS_URL:
        return None
    try:
        import redis

        return redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
    except Exception:  # pragma: no cover
        log.warning("gap cache: redis unavailable, using in-process cache")
        return None


def _cache_get(user_id) -> dict | None:
    key = _cache_key(user_id)
    r = _redis()
    if r is not None:
        raw = r.get(key)
        return json.loads(raw) if raw else None
    hit = _local_cache.get(key)
    if hit and time.time() - hit[0] < CACHE_TTL_SECONDS:
        return hit[1]
    return None


def _cache_set(user_id, report: dict) -> None:
    key = _cache_key(user_id)
    r = _redis()
    if r is not None:
        r.setex(key, CACHE_TTL_SECONDS, json.dumps(report))
    else:
        _local_cache[key] = (time.time(), report)


def invalidate(user_id) -> None:
    key = _cache_key(user_id)
    r = _redis()
    if r is not None:
        r.delete(key)
    _local_cache.pop(key, None)


async def _wardrobe(db: AsyncSession, user: User) -> list[Garment]:
    rows = await db.execute(
        select(Garment).where(
            Garment.user_id == user.id,
            Garment.classification_status == ClassificationStatus.complete,
        )
    )
    return list(rows.scalars().all())


async def _occasion_weights(db: AsyncSession, user: User) -> dict[str, float]:
    since = utcnow() - timedelta(days=90)
    rows = (
        await db.execute(
            select(Outfit.occasion, func.count(Outfit.id))
            .where(Outfit.user_id == user.id, Outfit.created_at >= since)
            .group_by(Outfit.occasion)
        )
    ).all()
    return gap_analyzer.occasion_weights_from_history({occ: n for occ, n in rows})


async def compute_report(db: AsyncSession, user: User, *, budget_inr: int | None = None) -> dict:
    garments = await _wardrobe(db, user)
    weights = await _occasion_weights(db, user)
    gaps = gap_analyzer.analyze(
        garments,
        occasion_weights=weights,
        budget_inr=budget_inr,
        regional_style=user.regional_style,
    )
    combos = gap_analyzer.combos_per_garment(garments)
    all_outfits: set[frozenset[str]] = set()
    for occ in knowledge.occasions():
        all_outfits |= gap_analyzer.outfit_sets(garments, occ["slug"])
    report = {
        "computed_at": utcnow().isoformat(),
        "wardrobe_size": len(garments),
        "budget_inr": budget_inr,
        "current_outfits": len(all_outfits),
        "gaps": [{**asdict(g), "rank": i + 1} for i, g in enumerate(gaps)],
        "most_versatile": sorted(combos.items(), key=lambda kv: -kv[1])[:3],
    }
    analytics.track(
        user.id,
        "gap_report_computed",
        wardrobe_size=len(garments),
        gaps=len(gaps),
        budget=budget_inr,
    )
    return report


async def get_report(
    db: AsyncSession, user: User, *, budget_inr: int | None = None, force: bool = False
) -> dict:
    """Cached unless forced, a budget is supplied, or the wardrobe grew by 3+ garments."""
    cached = None if (force or budget_inr is not None) else _cache_get(user.id)
    if cached is not None:
        count = (
            await db.execute(select(func.count(Garment.id)).where(Garment.user_id == user.id))
        ).scalar_one()
        if count - cached["wardrobe_size"] < INVALIDATE_AFTER_NEW_GARMENTS:
            return {**cached, "cached": True}
    report = await compute_report(db, user, budget_inr=budget_inr)
    if budget_inr is None:
        _cache_set(user.id, report)
    return {**report, "cached": False}
