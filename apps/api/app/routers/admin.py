"""
/admin — aggregate metrics for the ops dashboard. Guarded by X-Admin-Key.
(The Next.js admin app consumes these; until it exists, curl works.)
"""
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Header, HTTPException, status
from sqlalchemy import case, func, select

from app.core.config import settings
from app.core.database import utcnow
from app.core.security import DbSession
from app.models.billing import Subscription, SubscriptionStatus
from app.models.commerce import AffiliateClick
from app.models.garment import Garment
from app.models.outfit import Outfit
from app.models.user import SubscriptionTier, User
from app.services.entitlements import PLANS

router = APIRouter(prefix="/admin", tags=["admin"], include_in_schema=False)


async def require_admin(x_admin_key: Annotated[str | None, Header()] = None) -> None:
    if not settings.ADMIN_API_KEY or x_admin_key != settings.ADMIN_API_KEY:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")


@router.get("/metrics")
async def metrics(db: DbSession, x_admin_key: Annotated[str | None, Header()] = None) -> dict:
    await require_admin(x_admin_key)
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
    return {
        "users": {
            "total": total_users,
            "dau": dau,
            "by_tier": {t.value: n for t, n in tiers.items()},
        },
        "revenue": {"mrr_inr": mrr, "active_subscriptions": active_subs},
        "activity": {
            "outfits_24h": outfits_today,
            "garments": garments,
            "garments_verified": verified,
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
