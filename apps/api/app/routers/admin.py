"""
/admin — data for the ops dashboard (apps/admin). Guarded by X-Admin-Key, which
the Next.js server holds; browsers never see it.
"""
import uuid
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import utcnow
from app.core.security import DbSession
from app.models.billing import Subscription, SubscriptionStatus
from app.models.brand import BrandCampaign, BrandPartner, CampaignEntry
from app.models.commerce import AffiliateClick
from app.models.garment import Garment
from app.models.outfit import Outfit
from app.models.user import SubscriptionTier, User
from app.schemas.brand import BrandIn, BrandPatch, CampaignIn, CampaignPatch
from app.services import brand_service, stylist_service, wardrobe_service
from app.services.entitlements import PLANS


async def require_admin(x_admin_key: Annotated[str | None, Header()] = None) -> None:
    if not settings.ADMIN_API_KEY or x_admin_key != settings.ADMIN_API_KEY:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")


router = APIRouter(
    prefix="/admin", tags=["admin"], include_in_schema=False, dependencies=[Depends(require_admin)]
)


def _day(dt) -> str:
    return dt.date().isoformat() if hasattr(dt, "date") else str(dt)[:10]


# ── /dashboard ───────────────────────────────────────────────────────────────


@router.get("/metrics")
async def metrics(db: DbSession) -> dict:
    now = utcnow()
    day, month = now - timedelta(days=1), now - timedelta(days=30)

    total_users = await db.scalar(select(func.count(User.id)))
    dau = await db.scalar(select(func.count(User.id)).where(User.last_login_at >= day))
    tiers = dict(
        (
            await db.execute(
                select(User.subscription_tier, func.count(User.id)).group_by(User.subscription_tier)
            )
        ).all()
    )
    mrr = sum(
        PLANS[t].price_inr_month * n
        for t, n in tiers.items()
        if t in (SubscriptionTier.plus, SubscriptionTier.pro)
    )
    active_subs = await db.scalar(
        select(func.count(Subscription.id)).where(Subscription.status == SubscriptionStatus.active)
    )
    outfits_today = await db.scalar(select(func.count(Outfit.id)).where(Outfit.created_at >= day))
    garments = await db.scalar(select(func.count(Garment.id)))
    verified = await db.scalar(
        select(func.count(Garment.id)).where(Garment.user_verified.is_(True))
    )
    # classification accuracy proxy: verified garments never corrected
    from app.models.feedback import ClassificationFeedback

    corrected = await db.scalar(
        select(func.count(func.distinct(ClassificationFeedback.garment_id))).where(
            ClassificationFeedback.garment_id.is_not(None)
        )
    )
    clicks = (
        await db.execute(
            select(
                AffiliateClick.platform,
                func.count(AffiliateClick.id),
                func.sum(case((AffiliateClick.converted.is_(True), 1), else_=0)),
                func.coalesce(func.sum(AffiliateClick.commission_inr), 0),
            )
            .where(AffiliateClick.clicked_at >= month)
            .group_by(AffiliateClick.platform)
        )
    ).all()
    affiliate_rev = sum(int(comm or 0) for _, _, _, comm in clicks)
    return {
        "users": {
            "total": total_users,
            "dau": dau,
            "by_tier": {t.value: n for t, n in tiers.items()},
        },
        "revenue": {
            "mrr_inr": mrr,
            "active_subscriptions": active_subs,
            "affiliate_30d_inr": affiliate_rev,
        },
        "activity": {
            "outfits_24h": outfits_today,
            "garments": garments,
            "garments_verified": verified,
            "classification_acceptance": round((verified - (corrected or 0)) / verified, 3)
            if verified
            else None,
        },
        "affiliate_30d": [
            {
                "platform": p.value,
                "clicks": n,
                "conversions": int(c or 0),
                "commission_inr": int(comm or 0),
            }
            for p, n, c, comm in clicks
        ],
    }


# ── /users ───────────────────────────────────────────────────────────────────


@router.get("/users")
async def users(
    db: DbSession,
    q: str | None = None,
    tier: SubscriptionTier | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=200)] = 50,
) -> dict:
    counts = (
        select(Garment.user_id, func.count(Garment.id).label("garments"))
        .group_by(Garment.user_id)
        .subquery()
    )
    stmt = select(User, func.coalesce(counts.c.garments, 0)).outerjoin(
        counts, counts.c.user_id == User.id
    )
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(User.name.ilike(like), User.phone.ilike(like), User.city.ilike(like)))
    if tier:
        stmt = stmt.where(User.subscription_tier == tier)
    total = await db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = (
        await db.execute(
            stmt.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        )
    ).all()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "id": str(u.id),
                "name": u.name,
                "phone": u.phone,
                "city": u.city,
                "tier": u.subscription_tier.value,
                "garment_count": n,
                "joined_at": u.created_at.isoformat(),
                "last_active_at": u.last_login_at.isoformat() if u.last_login_at else None,
                "onboarding_complete": u.onboarding_complete,
            }
            for u, n in rows
        ],
    }


@router.get("/users/{user_id}/wardrobe")
async def user_wardrobe(user_id: uuid.UUID, db: DbSession) -> dict:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    rows = (
        (
            await db.execute(
                select(Garment)
                .where(Garment.user_id == user_id)
                .order_by(Garment.created_at.desc())
            )
        )
        .scalars()
        .all()
    )
    return {
        "user": {
            "id": str(user.id),
            "name": user.name,
            "phone": user.phone,
            "city": user.city,
            "tier": user.subscription_tier.value,
        },
        "garments": [wardrobe_service.to_out(g).model_dump(mode="json") for g in rows],
    }


# ── /analytics ───────────────────────────────────────────────────────────────


@router.get("/analytics")
async def analytics_series(db: DbSession, days: Annotated[int, Query(ge=7, le=365)] = 30) -> dict:
    since = utcnow() - timedelta(days=days)

    signups = (
        await db.execute(
            select(func.date(User.created_at), func.count(User.id))
            .where(User.created_at >= since)
            .group_by(func.date(User.created_at))
            .order_by(func.date(User.created_at))
        )
    ).all()
    outfits = (
        await db.execute(
            select(func.date(Outfit.created_at), func.count(Outfit.id))
            .where(Outfit.created_at >= since)
            .group_by(func.date(Outfit.created_at))
            .order_by(func.date(Outfit.created_at))
        )
    ).all()
    clicks = (
        await db.execute(
            select(
                AffiliateClick.platform,
                func.count(AffiliateClick.id),
                func.sum(case((AffiliateClick.converted.is_(True), 1), else_=0)),
            )
            .where(AffiliateClick.clicked_at >= since)
            .group_by(AffiliateClick.platform)
        )
    ).all()

    # Funnel: signed up → uploaded → 10 items → 30 items → paid
    per_user = (
        select(Garment.user_id, func.count(Garment.id).label("n"))
        .group_by(Garment.user_id)
        .subquery()
    )
    total = await db.scalar(select(func.count(User.id)))
    uploaded = await db.scalar(select(func.count()).select_from(per_user))
    ten = await db.scalar(select(func.count()).select_from(per_user).where(per_user.c.n >= 10))
    thirty = await db.scalar(select(func.count()).select_from(per_user).where(per_user.c.n >= 30))
    paid = await db.scalar(
        select(func.count(User.id)).where(User.subscription_tier != SubscriptionTier.free)
    )

    # cumulative user growth
    running, growth = 0, []
    baseline = await db.scalar(select(func.count(User.id)).where(User.created_at < since))
    running = baseline or 0
    for d, n in signups:
        running += n
        growth.append({"date": _day(d), "signups": n, "users": running})

    return {
        "days": days,
        "user_growth": growth,
        "outfits_by_day": [{"date": _day(d), "outfits": n} for d, n in outfits],
        "affiliate_ctr": [
            {
                "platform": p.value,
                "clicks": n,
                "conversions": int(c or 0),
                "conversion_rate": round(int(c or 0) / n, 3) if n else 0,
            }
            for p, n, c in clicks
        ],
        "funnel": [
            {"stage": "Signed up", "users": total},
            {"stage": "Uploaded", "users": uploaded},
            {"stage": "10+ items", "users": ten},
            {"stage": "30+ items", "users": thirty},
            {"stage": "Paid", "users": paid},
        ],
    }


# ── /brands (partner CMS) ────────────────────────────────────────────────────


def _brand_row(b: BrandPartner, campaigns: int = 0) -> dict:
    return {
        "id": str(b.id),
        "name": b.name,
        "slug": b.slug,
        "status": b.status.value,
        "website": b.website,
        "contact_email": b.contact_email,
        "tagline": b.tagline,
        "logo_url": b.logo_url,
        "notes": b.notes,
        "campaign_count": campaigns,
        "created_at": b.created_at.isoformat(),
    }


def _campaign_row(c: BrandCampaign, participants: int = 0) -> dict:
    return {
        "id": str(c.id),
        "brand_id": str(c.brand_id),
        "title": c.title,
        "kind": c.kind,
        "status": c.status,
        "live": brand_service.is_live(c),
        "starts_at": c.starts_at.isoformat() if c.starts_at else None,
        "ends_at": c.ends_at.isoformat() if c.ends_at else None,
        "config": brand_service.config_of(c).model_dump(mode="json"),
        "participants": participants,
        "created_at": c.created_at.isoformat(),
    }


@router.get("/brands")
async def brands(db: DbSession) -> list[dict]:
    campaigns = (
        select(BrandCampaign.brand_id, func.count(BrandCampaign.id).label("n"))
        .group_by(BrandCampaign.brand_id)
        .subquery()
    )
    rows = (
        await db.execute(
            select(BrandPartner, func.coalesce(campaigns.c.n, 0))
            .outerjoin(campaigns, campaigns.c.brand_id == BrandPartner.id)
            .order_by(BrandPartner.name)
        )
    ).all()
    return [_brand_row(b, n) for b, n in rows]


@router.post("/brands", status_code=status.HTTP_201_CREATED)
async def create_brand(body: BrandIn, db: DbSession) -> dict:
    slug = body.name.lower().strip().replace(" ", "-")
    if await db.scalar(select(BrandPartner.id).where(BrandPartner.slug == slug)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Brand already exists")
    b = BrandPartner(
        name=body.name.strip(),
        slug=slug,
        website=str(body.website) if body.website else None,
        contact_email=body.contact_email,
        notes=body.notes,
        tagline=body.tagline,
        logo_url=str(body.logo_url) if body.logo_url else None,
    )
    db.add(b)
    await db.flush()
    return _brand_row(b)


async def _brand(db: AsyncSession, brand_id: uuid.UUID) -> BrandPartner:
    b = await db.get(BrandPartner, brand_id)
    if b is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Brand not found")
    return b


@router.get("/brands/{brand_id}")
async def brand_detail(brand_id: uuid.UUID, db: DbSession) -> dict:
    b = await _brand(db, brand_id)
    rows = (
        (
            await db.execute(
                select(BrandCampaign)
                .where(BrandCampaign.brand_id == brand_id)
                .order_by(BrandCampaign.created_at.desc())
            )
        )
        .scalars()
        .all()
    )
    counts = dict(
        (
            await db.execute(
                select(CampaignEntry.campaign_id, func.count(CampaignEntry.id))
                .where(CampaignEntry.campaign_id.in_([c.id for c in rows]))
                .group_by(CampaignEntry.campaign_id)
            )
        ).all()
        if rows
        else []
    )
    return {
        **_brand_row(b, len(rows)),
        "campaigns": [_campaign_row(c, counts.get(c.id, 0)) for c in rows],
    }


@router.patch("/brands/{brand_id}")
async def update_brand(brand_id: uuid.UUID, body: BrandPatch, db: DbSession) -> dict:
    b = await _brand(db, brand_id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(b, k, str(v) if k in ("website", "logo_url") and v is not None else v)
    await db.flush()
    return _brand_row(b)


@router.post("/brands/{brand_id}/campaigns", status_code=status.HTTP_201_CREATED)
async def create_campaign(brand_id: uuid.UUID, body: CampaignIn, db: DbSession) -> dict:
    await _brand(db, brand_id)
    c = BrandCampaign(
        brand_id=brand_id,
        title=body.title.strip(),
        kind=body.kind.value,
        status=body.status.value,
        starts_at=body.starts_at,
        ends_at=body.ends_at,
        config=body.config.model_dump(mode="json"),
    )
    db.add(c)
    await db.flush()
    return _campaign_row(c)


async def _campaign(db: AsyncSession, campaign_id: uuid.UUID) -> BrandCampaign:
    c = await db.get(BrandCampaign, campaign_id)
    if c is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Campaign not found")
    return c


@router.get("/campaigns/{campaign_id}")
async def campaign_detail(campaign_id: uuid.UUID, db: DbSession) -> dict:
    c = await _campaign(db, campaign_id)
    n = await db.scalar(
        select(func.count(CampaignEntry.id)).where(CampaignEntry.campaign_id == c.id)
    )
    return _campaign_row(c, n or 0)


@router.patch("/campaigns/{campaign_id}")
async def update_campaign(campaign_id: uuid.UUID, body: CampaignPatch, db: DbSession) -> dict:
    c = await _campaign(db, campaign_id)
    changes = body.model_dump(exclude_unset=True)
    for k, v in changes.items():
        if k == "config":
            c.config = body.config.model_dump(mode="json")  # validated
        elif k in ("kind", "status"):
            setattr(c, k, v.value if hasattr(v, "value") else v)
        else:
            setattr(c, k, v)
    await db.flush()
    return _campaign_row(c)


@router.get("/campaigns/{campaign_id}/performance")
async def campaign_performance(
    campaign_id: uuid.UUID, db: DbSession, days: Annotated[int, Query(ge=1, le=365)] = 30
) -> dict:
    await _campaign(db, campaign_id)
    return await brand_service.performance(db, campaign_id, days)


# ── /stylists (applications + verification) ─────────────────────────────────


class VerifyIn(BaseModel):
    verified: bool


def _stylist_row(u: User, bookings: int, completed: int) -> dict:
    return {
        "id": str(u.id),
        "name": u.name,
        "phone": u.phone,
        "city": u.city,
        "verified": u.stylist_verified,
        "bio": u.stylist_bio,
        "specialties": u.stylist_specialties or [],
        "price_per_session_inr": float(u.stylist_price_per_session or 0),
        "portfolio_urls": u.stylist_portfolio_urls or [],
        "applied_at": u.stylist_applied_at.isoformat() if u.stylist_applied_at else None,
        "bookings": bookings,
        "sessions_completed": completed,
    }


@router.get("/stylists")
async def stylists(db: DbSession, pending: bool = False) -> list[dict]:
    from app.models.stylist import BookingStatus, StylistBooking

    stmt = select(User).where(User.is_stylist.is_(True))
    if pending:
        stmt = stmt.where(User.stylist_verified.is_(False))
    users = (await db.execute(stmt.order_by(User.stylist_applied_at.desc()))).scalars().all()
    counts = dict(
        (
            await db.execute(
                select(StylistBooking.stylist_id, func.count(StylistBooking.id)).group_by(
                    StylistBooking.stylist_id
                )
            )
        ).all()
    )
    done = dict(
        (
            await db.execute(
                select(StylistBooking.stylist_id, func.count(StylistBooking.id))
                .where(StylistBooking.status == BookingStatus.completed)
                .group_by(StylistBooking.stylist_id)
            )
        ).all()
    )
    return [_stylist_row(u, counts.get(u.id, 0), done.get(u.id, 0)) for u in users]


@router.post("/stylists/{user_id}/verify")
async def verify_stylist(user_id: uuid.UUID, body: VerifyIn, db: DbSession) -> dict:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    await stylist_service.verify(db, user, body.verified)
    return _stylist_row(user, 0, 0)


@router.get("/stylists/bookings")
async def stylist_bookings(db: DbSession, days: Annotated[int, Query(ge=1, le=365)] = 30) -> dict:
    """Marketplace GMV + commission over the window."""
    from app.models.stylist import BookingStatus, StylistBooking

    since = utcnow() - timedelta(days=days)
    rows = (
        await db.execute(
            select(
                StylistBooking.status,
                func.count(StylistBooking.id),
                func.coalesce(func.sum(StylistBooking.amount_paid), 0),
                func.coalesce(func.sum(StylistBooking.platform_commission), 0),
            )
            .where(StylistBooking.created_at >= since)
            .group_by(StylistBooking.status)
        )
    ).all()
    paid = {BookingStatus.confirmed, BookingStatus.completed}
    return {
        "days": days,
        "by_status": {s.value: n for s, n, _, _ in rows},
        "gmv_inr": float(sum(a for s, _, a, _ in rows if s in paid)),
        "commission_inr": float(sum(c for s, _, _, c in rows if s in paid)),
    }
