"""
Social OOTD layer: explicit sharing, share cards, public share pages, likes,
city feed. Privacy: an outfit (and its garment images) is visible to others
only after the owner shares it; unsharing hides it again.
"""
from __future__ import annotations

import secrets
import uuid
from dataclasses import dataclass

from fastapi import HTTPException, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app import knowledge
from app.core.config import settings
from app.core.database import utcnow
from app.models.garment import Garment
from app.models.outfit import Outfit
from app.models.social import OutfitLike
from app.models.user import User
from app.services import analytics
from app.services.share_card import CardItem, render_card
from app.services.storage import get_storage

FEED_LIMIT = 50
FEED_MIN_CONFIDENCE = 0.80  # rule: feed shows only user-verified or high-confidence pieces


def share_base_url() -> str:
    return (settings.SHARE_BASE_URL or settings.PUBLIC_BASE_URL).rstrip("/")


def share_url(outfit: Outfit) -> str | None:
    return f"{share_base_url()}/s/{outfit.share_slug}" if outfit.share_slug else None


def card_url(outfit: Outfit) -> str | None:
    return (
        f"{share_base_url()}/s/{outfit.share_slug}/card.jpg"
        if outfit.share_slug and outfit.share_card_key
        else None
    )


def city_aesthetic(city: str) -> str:
    c = next((c for c in knowledge.cities() if c["name"].lower() == city.lower()), None)
    return c["aesthetic"] if c else f"{city} ethnic"


def _pretty(g: Garment) -> str:
    fabric = (
        ""
        if g.fabric_type in ("unknown", "other")
        else g.fabric_type.replace("_", " ").title() + " "
    )
    return f"{fabric}{g.garment_type.replace('_', ' ')}"


async def _garments(db: AsyncSession, outfit: Outfit) -> list[Garment]:
    ids = [uuid.UUID(g) for g in outfit.garment_ids]
    rows = (
        (await db.execute(select(Garment).where(Garment.id.in_(ids)))).scalars().all()
        if ids
        else []
    )
    by_id = {str(g.id): g for g in rows}
    return [by_id[g] for g in outfit.garment_ids if g in by_id]


# ── cards ────────────────────────────────────────────────────────────────────


async def generate_card(db: AsyncSession, user: User, outfit: Outfit) -> str:
    """Render + store the share card; returns the storage key."""
    storage = get_storage()
    items = []
    for g in await _garments(db, outfit):
        try:
            data = await storage.get(g.image_key)
        except Exception:
            data = b""
        items.append(CardItem(image=data, label=_pretty(g)))
    if not items:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Outfit has no garments to show")
    label = knowledge.occasion(outfit.occasion)
    title = (
        outfit.festival.replace("-", " ").title()
        if outfit.festival
        else (label["label"] if label else outfit.occasion)
    )
    subtitle = (
        f"{len(items)}-piece look · {outfit.temperature_celsius}°C {outfit.weather_condition}"
    )
    png = await run_in_threadpool(
        render_card, items, title=title, subtitle=subtitle, city=user.city
    )
    key = f"cards/{user.id}/{outfit.id}.jpg"
    await storage.put(key, png)
    outfit.share_card_key = key
    await db.flush()
    return key


# ── sharing ──────────────────────────────────────────────────────────────────


async def share(db: AsyncSession, user: User, outfit: Outfit) -> Outfit:
    if outfit.share_card_key is None:
        await generate_card(db, user, outfit)
    if not outfit.share_slug:
        for _ in range(5):
            slug = secrets.token_urlsafe(8)[:11]
            exists = await db.scalar(select(Outfit.id).where(Outfit.share_slug == slug))
            if not exists:
                outfit.share_slug = slug
                break
    outfit.is_public = True
    outfit.shared_at = utcnow()
    await db.flush()
    analytics.track(user.id, "outfit_shared", occasion=outfit.occasion, festival=outfit.festival)
    return outfit


async def unshare(db: AsyncSession, outfit: Outfit) -> Outfit:
    outfit.is_public = False
    await db.flush()
    return outfit


async def public_outfit(db: AsyncSession, slug: str) -> tuple[Outfit, User, list[Garment]]:
    outfit = (
        await db.execute(select(Outfit).where(Outfit.share_slug == slug))
    ).scalar_one_or_none()
    if outfit is None or not outfit.is_public:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This look isn't shared")
    owner = await db.get(User, outfit.user_id)
    if owner is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This look isn't shared")
    return outfit, owner, await _garments(db, outfit)


# ── likes ────────────────────────────────────────────────────────────────────


async def like(db: AsyncSession, user: User, outfit: Outfit) -> Outfit:
    if not outfit.is_public and outfit.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Outfit not found")
    already = await db.scalar(
        select(OutfitLike.id).where(
            OutfitLike.outfit_id == outfit.id, OutfitLike.user_id == user.id
        )
    )
    if already:
        return outfit  # idempotent
    db.add(OutfitLike(outfit_id=outfit.id, user_id=user.id, created_at=utcnow()))
    outfit.like_count += 1
    await db.flush()
    analytics.track(user.id, "outfit_liked", owner=str(outfit.user_id))
    return outfit


async def unlike(db: AsyncSession, user: User, outfit: Outfit) -> Outfit:
    row = (
        await db.execute(
            select(OutfitLike).where(
                OutfitLike.outfit_id == outfit.id, OutfitLike.user_id == user.id
            )
        )
    ).scalar_one_or_none()
    if row is not None:
        await db.delete(row)
        outfit.like_count = max(0, outfit.like_count - 1)
        await db.flush()
    return outfit


async def liked_ids(db: AsyncSession, user: User, outfit_ids: list[uuid.UUID]) -> set[str]:
    if not outfit_ids:
        return set()
    rows = await db.execute(
        select(OutfitLike.outfit_id).where(
            OutfitLike.user_id == user.id, OutfitLike.outfit_id.in_(outfit_ids)
        )
    )
    return {str(x) for x in rows.scalars().all()}


# ── feed ─────────────────────────────────────────────────────────────────────


@dataclass
class FeedEntry:
    outfit: Outfit
    owner: User
    garments: list[Garment]
    liked: bool


def feed_quality_ok(garments: list[Garment]) -> bool:
    """Plan rule 3: every piece must be user-verified or classified with confidence > 0.80."""
    return bool(garments) and all(
        g.user_verified or (g.ai_confidence or 0) > FEED_MIN_CONFIDENCE for g in garments
    )


async def city_feed(
    db: AsyncSession, viewer: User, city: str | None = None, limit: int = FEED_LIMIT
) -> list[FeedEntry]:
    city = city or viewer.city
    rows = (
        await db.execute(
            select(Outfit, User)
            .join(User, User.id == Outfit.user_id)
            .where(Outfit.is_public.is_(True), func.lower(User.city) == city.lower())
            .order_by(Outfit.shared_at.desc())
            .limit(limit * 2)  # some drop out at the quality gate
        )
    ).all()
    liked = await liked_ids(db, viewer, [o.id for o, _ in rows])
    out = []
    for outfit, owner in rows:
        garments = await _garments(db, outfit)
        if not feed_quality_ok(garments):
            continue
        out.append(FeedEntry(outfit, owner, garments, str(outfit.id) in liked))
        if len(out) == limit:
            break
    return out


async def generate_card_job(outfit_id: uuid.UUID | str) -> None:
    """Background (plan: social_card_generator): pre-render the card when a look is saved
    by a user who opted into sharing, then tell them it's ready."""
    from app.core import database
    from app.services.notifications import Push, get_notifier

    async with database.SessionLocal() as db:
        outfit = await db.get(Outfit, uuid.UUID(str(outfit_id)))
        if outfit is None or outfit.share_card_key:
            return
        user = await db.get(User, outfit.user_id)
        if user is None or not user.social_sharing_enabled:
            return
        try:
            await generate_card(db, user, outfit)
            await db.commit()
        except Exception:  # never let a card failure surface to the user
            await db.rollback()
            return
        if user.fcm_token:
            await get_notifier().send(
                user.fcm_token,
                Push(
                    title="Your outfit card is ready to share!",
                    body="Tap to preview it and share to Instagram or WhatsApp.",
                    data={"url": f"pehno://outfits/share/{outfit.id}", "outfit_id": str(outfit.id)},
                ),
            )
