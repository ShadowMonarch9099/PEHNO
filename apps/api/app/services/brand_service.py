"""
Brand partnership layer (weeks 46–48): sponsored wardrobe challenges and curated
collections, targeted by segment, with per-campaign performance tracking.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from urllib.parse import urlsplit

from fastapi import HTTPException, status
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app import knowledge
from app.core.database import utcnow
from app.models.brand import (
    BrandCampaign,
    BrandPartner,
    CampaignEntry,
    CampaignEvent,
    CampaignEventType,
    CampaignKind,
    CampaignStatus,
)
from app.models.commerce import AffiliateClick, AffiliatePlatform
from app.models.garment import Garment
from app.models.outfit import Outfit
from app.models.user import User
from app.schemas.brand import CampaignConfig
from app.services import affiliate_service, analytics

_PLATFORM_HOSTS = {
    "myntra.com": AffiliatePlatform.myntra,
    "ajio.com": AffiliatePlatform.ajio,
    "nykaafashion.com": AffiliatePlatform.nykaa,
    "nykaa.com": AffiliatePlatform.nykaa,
    "meesho.com": AffiliatePlatform.meesho,
}


def _aware(dt: datetime | None) -> datetime | None:
    return dt if dt is None or dt.tzinfo else dt.replace(tzinfo=UTC)


def config_of(c: BrandCampaign) -> CampaignConfig:
    return CampaignConfig.model_validate(c.config or {})


def is_live(c: BrandCampaign, now: datetime | None = None) -> bool:
    now = now or utcnow()
    if c.status != CampaignStatus.live.value:
        return False
    starts, ends = _aware(c.starts_at), _aware(c.ends_at)
    return (starts is None or starts <= now) and (ends is None or ends >= now)


def targets(cfg: CampaignConfig, user: User) -> bool:
    t = cfg.target
    if t.cities and user.city.lower() not in [c.lower() for c in t.cities]:
        return False
    if t.tiers and user.subscription_tier.value not in t.tiers:
        return False
    if t.regional_styles and user.regional_style not in t.regional_styles:
        return False
    return not (t.genders and user.gender.value not in t.genders)


def rules_text(c: BrandCampaign, cfg: CampaignConfig) -> str | None:
    if c.kind != CampaignKind.challenge.value:
        return None
    r = cfg.challenge
    tax = {g["slug"]: g["label"].lower() for g in knowledge.garment_types()}
    parts = []
    if r.garment_types:
        names = " or ".join(tax.get(t, t.replace("_", " ")) for t in r.garment_types)
        fab = f" in {' / '.join(f.replace('_', ' ') for f in r.fabrics)}" if r.fabrics else ""
        parts.append(f"a {names}{fab}")
    if r.brand_match:
        parts.append("any piece tagged with the brand")
    what = " — or ".join(parts) if parts else "any look"
    occ = knowledge.occasion(r.occasion) if r.occasion else None
    where = f" for {occ['label'].lower()}" if occ else ""
    return f"Style {r.goal} look{'s' if r.goal != 1 else ''}{where} using {what}."


# ── discovery ────────────────────────────────────────────────────────────────


@dataclass
class CampaignView:
    campaign: BrandCampaign
    brand: BrandPartner
    entry: CampaignEntry | None
    participants: int


async def _entries_and_counts(
    db: AsyncSession, user: User, ids: list[uuid.UUID]
) -> tuple[dict, dict]:
    if not ids:
        return {}, {}
    entries = {
        e.campaign_id: e
        for e in (
            await db.execute(
                select(CampaignEntry).where(
                    CampaignEntry.user_id == user.id, CampaignEntry.campaign_id.in_(ids)
                )
            )
        )
        .scalars()
        .all()
    }
    counts = dict(
        (
            await db.execute(
                select(CampaignEntry.campaign_id, func.count(CampaignEntry.id))
                .where(CampaignEntry.campaign_id.in_(ids))
                .group_by(CampaignEntry.campaign_id)
            )
        ).all()
    )
    return entries, counts


async def live_for(db: AsyncSession, user: User) -> list[CampaignView]:
    """Live campaigns targeting this user, newest first. Records a daily `view` per campaign."""
    rows = (
        await db.execute(
            select(BrandCampaign, BrandPartner)
            .join(BrandPartner, BrandPartner.id == BrandCampaign.brand_id)
            .where(BrandCampaign.status == CampaignStatus.live.value)
            .order_by(BrandCampaign.starts_at.desc().nullslast(), BrandCampaign.created_at.desc())
        )
    ).all()
    now = utcnow()
    keep = [(c, b) for c, b in rows if is_live(c, now) and targets(config_of(c), user)]
    entries, counts = await _entries_and_counts(db, user, [c.id for c, _ in keep])
    for c, _ in keep:
        await _track_view(db, c, user, now)
    return [CampaignView(c, b, entries.get(c.id), counts.get(c.id, 0)) for c, b in keep]


async def get_view(db: AsyncSession, user: User, campaign_id: uuid.UUID) -> CampaignView:
    row = (
        await db.execute(
            select(BrandCampaign, BrandPartner)
            .join(BrandPartner, BrandPartner.id == BrandCampaign.brand_id)
            .where(BrandCampaign.id == campaign_id)
        )
    ).first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found")
    c, b = row
    entries, counts = await _entries_and_counts(db, user, [c.id])
    entry = entries.get(c.id)
    # drafts/ended stay reachable for participants (their progress), hidden otherwise
    if not is_live(c) and entry is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found")
    return CampaignView(c, b, entry, counts.get(c.id, 0))


async def _track_view(db: AsyncSession, c: BrandCampaign, user: User, now: datetime) -> None:
    since = now - timedelta(days=1)
    seen = await db.scalar(
        select(CampaignEvent.id).where(
            CampaignEvent.campaign_id == c.id,
            CampaignEvent.user_id == user.id,
            CampaignEvent.event == CampaignEventType.view,
            CampaignEvent.created_at >= since,
        )
    )
    if not seen:
        db.add(
            CampaignEvent(
                campaign_id=c.id, user_id=user.id, event=CampaignEventType.view, created_at=now
            )
        )
        await db.flush()


def _event(db: AsyncSession, c: BrandCampaign, user: User, event: CampaignEventType, **meta):
    db.add(
        CampaignEvent(
            campaign_id=c.id,
            user_id=user.id,
            event=event,
            meta=meta or None,
            created_at=utcnow(),
        )
    )


# ── challenges ───────────────────────────────────────────────────────────────


async def join(db: AsyncSession, user: User, view: CampaignView) -> CampaignEntry:
    c = view.campaign
    if c.kind != CampaignKind.challenge.value:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Only challenges can be joined")
    if not is_live(c):
        raise HTTPException(status.HTTP_409_CONFLICT, "This challenge isn't live")
    if view.entry:
        return view.entry
    entry = CampaignEntry(campaign_id=c.id, user_id=user.id, joined_at=utcnow())
    db.add(entry)
    _event(db, c, user, CampaignEventType.join)
    await db.flush()
    analytics.track(user.id, "campaign_joined", campaign=str(c.id), brand=view.brand.slug)
    return entry


def qualifies(cfg: CampaignConfig, brand: BrandPartner, outfit: Outfit, garments: list[Garment]):
    """Does this outfit count? Returns (ok, reason)."""
    r = cfg.challenge
    if (
        r.occasion
        and outfit.occasion != r.occasion
        and knowledge.occasion_parent(outfit.occasion) != r.occasion
    ):
        occ = knowledge.occasion(r.occasion)
        return False, f"Looks must be for {occ['label'] if occ else r.occasion}"
    if not r.garment_types and not r.brand_match:
        return True, None
    for g in garments:
        if r.brand_match and (g.brand or "").strip().lower() == brand.name.lower():
            return True, None
        if r.garment_types and g.garment_type in r.garment_types:
            if not r.fabrics or g.fabric_type in r.fabrics:
                return True, None
    return False, "This look doesn't include a qualifying piece"


async def submit(db: AsyncSession, user: User, view: CampaignView, outfit: Outfit) -> CampaignEntry:
    c, cfg = view.campaign, config_of(view.campaign)
    entry = view.entry or await join(db, user, view)
    if entry.completed_at:
        return entry
    if str(outfit.id) in entry.outfit_ids:
        raise HTTPException(status.HTTP_409_CONFLICT, "You've already counted this look")
    ids = [uuid.UUID(x) for x in outfit.garment_ids]
    garments = (
        (await db.execute(select(Garment).where(Garment.id.in_(ids)))).scalars().all()
        if ids
        else []
    )
    ok, why = qualifies(cfg, view.brand, outfit, list(garments))
    if not ok:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, why)
    entry.outfit_ids = [*entry.outfit_ids, str(outfit.id)]
    entry.progress = len(entry.outfit_ids)
    _event(db, c, user, CampaignEventType.submit, outfit=str(outfit.id))
    if entry.progress >= cfg.challenge.goal:
        entry.completed_at = utcnow()
        _event(db, c, user, CampaignEventType.complete)
        analytics.track(user.id, "campaign_completed", campaign=str(c.id), brand=view.brand.slug)
    await db.flush()
    return entry


# ── click-through ────────────────────────────────────────────────────────────


def _platform_for(url: str) -> AffiliatePlatform | None:
    host = urlsplit(url).netloc.lower()
    return next((p for h, p in _PLATFORM_HOSTS.items() if host.endswith(h)), None)


def tracked_url(url: str, subid: str) -> str:
    """Affiliate deep link when the URL is on a partner platform; utm-tagged otherwise."""
    platform = _platform_for(url)
    if platform:
        return affiliate_service.affiliate_url(url, platform, subid)
    sep = "&" if "?" in url else "?"
    return f"{url}{sep}utm_source=pehno&utm_medium=brand_campaign&subid={subid}"


async def click(db: AsyncSession, user: User, view: CampaignView, product_index: int | None) -> str:
    c, cfg = view.campaign, config_of(view.campaign)
    if product_index is None:
        if not cfg.cta_url:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "No link on this campaign")
        target, label = str(cfg.cta_url), "cta"
    else:
        if product_index >= len(cfg.products):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "No such product")
        target, label = str(cfg.products[product_index].url), cfg.products[product_index].name
    ev = CampaignEvent(
        campaign_id=c.id,
        user_id=user.id,
        event=CampaignEventType.click,
        meta={"target": label, "url": target},
        created_at=utcnow(),
    )
    db.add(ev)
    await db.flush()
    platform = _platform_for(target)
    if platform:  # also an affiliate click so conversions/postbacks attribute revenue
        ac = AffiliateClick(
            user_id=user.id,
            gap_type=f"campaign:{c.id}",
            platform=platform,
            product_url=target,
            affiliate_url="",
            clicked_at=utcnow(),
        )
        db.add(ac)
        await db.flush()
        ac.affiliate_url = affiliate_service.affiliate_url(target, platform, str(ac.id))
        await db.flush()
        url = ac.affiliate_url
    else:
        url = tracked_url(target, str(ev.id))
    analytics.track(user.id, "campaign_click", campaign=str(c.id), target=label)
    return url


# ── admin: performance ───────────────────────────────────────────────────────


async def performance(db: AsyncSession, campaign_id: uuid.UUID, days: int = 30) -> dict:
    since = utcnow() - timedelta(days=days)
    rows = (
        await db.execute(
            select(
                CampaignEvent.event,
                func.count(CampaignEvent.id),
                func.count(func.distinct(CampaignEvent.user_id)),
            )
            .where(CampaignEvent.campaign_id == campaign_id, CampaignEvent.created_at >= since)
            .group_by(CampaignEvent.event)
        )
    ).all()
    totals = {e.value: {"events": 0, "users": 0} for e in CampaignEventType}
    for ev, n, u in rows:
        totals[ev.value] = {"events": n, "users": u}
    entries = await db.scalar(
        select(func.count(CampaignEntry.id)).where(CampaignEntry.campaign_id == campaign_id)
    )
    completed = await db.scalar(
        select(func.count(CampaignEntry.id)).where(
            CampaignEntry.campaign_id == campaign_id, CampaignEntry.completed_at.is_not(None)
        )
    )
    # saves: submitted outfits the user went on to save
    submitted = (
        await db.execute(
            select(CampaignEntry.outfit_ids).where(CampaignEntry.campaign_id == campaign_id)
        )
    ).scalars()
    outfit_ids = [uuid.UUID(x) for ids in submitted for x in ids]
    saves = (
        await db.scalar(
            select(func.count(Outfit.id)).where(
                Outfit.id.in_(outfit_ids), Outfit.is_saved.is_(True)
            )
        )
        if outfit_ids
        else 0
    )
    conversions = (
        await db.execute(
            select(
                func.count(AffiliateClick.id),
                func.sum(case((AffiliateClick.converted.is_(True), 1), else_=0)),
                func.coalesce(func.sum(AffiliateClick.commission_inr), 0),
            ).where(AffiliateClick.gap_type == f"campaign:{campaign_id}")
        )
    ).one()
    by_day = (
        await db.execute(
            select(
                func.date(CampaignEvent.created_at),
                CampaignEvent.event,
                func.count(CampaignEvent.id),
            )
            .where(CampaignEvent.campaign_id == campaign_id, CampaignEvent.created_at >= since)
            .group_by(func.date(CampaignEvent.created_at), CampaignEvent.event)
            .order_by(func.date(CampaignEvent.created_at))
        )
    ).all()
    series: dict[str, dict] = {}
    for d, ev, n in by_day:
        key = d.isoformat() if hasattr(d, "isoformat") else str(d)[:10]
        series.setdefault(key, {"date": key})[ev.value] = n
    views = totals["view"]["events"]
    return {
        "days": days,
        "views": views,
        "unique_viewers": totals["view"]["users"],
        "joins": totals["join"]["events"],
        "participants": entries,
        "outfits_submitted": totals["submit"]["events"],
        "completions": completed,
        "saves": saves,
        "clicks": totals["click"]["events"],
        "click_through_rate": round(totals["click"]["events"] / views, 3) if views else 0.0,
        "affiliate": {
            "clicks": conversions[0] or 0,
            "conversions": int(conversions[1] or 0),
            "commission_inr": int(conversions[2] or 0),
        },
        "by_day": list(series.values()),
    }
