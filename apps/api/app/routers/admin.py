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

from app.core.config import settings
from app.core.database import utcnow
from app.core.security import DbSession
from app.models.billing import Subscription, SubscriptionStatus
from app.models.brand import BrandCampaign, BrandPartner
from app.models.commerce import AffiliateClick
from app.models.garment import Garment
from app.models.outfit import Outfit
from app.models.user import SubscriptionTier, User
from app.services import wardrobe_service
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


# ── /brands (scaffold) ───────────────────────────────────────────────────────


class BrandIn(BaseModel):
    name: str
    website: str | None = None
    contact_email: str | None = None
    notes: str | None = None


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
    return [
        {
            "id": str(b.id),
            "name": b.name,
            "slug": b.slug,
            "status": b.status.value,
            "website": b.website,
            "campaign_count": n,
            "created_at": b.created_at.isoformat(),
        }
        for b, n in rows
    ]


@router.post("/brands", status_code=status.HTTP_201_CREATED)
async def create_brand(body: BrandIn, db: DbSession) -> dict:
    slug = body.name.lower().strip().replace(" ", "-")
    if await db.scalar(select(BrandPartner.id).where(BrandPartner.slug == slug)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Brand already exists")
    b = BrandPartner(
        name=body.name.strip(),
        slug=slug,
        website=body.website,
        contact_email=body.contact_email,
        notes=body.notes,
    )
    db.add(b)
    await db.flush()
    return {
        "id": str(b.id),
        "name": b.name,
        "slug": b.slug,
        "status": b.status.value,
        "campaign_count": 0,
    }
