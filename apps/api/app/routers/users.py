"""
/users — profile + wardrobe stats.
"""
from fastapi import APIRouter
from sqlalchemy import func, select

from app.core.security import CurrentUser, DbSession
from app.models.garment import Garment
from app.models.outfit import Outfit
from app.schemas.user import UserOut, UserStats, UserUpdate
from app.services import analytics

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
async def get_me(user: CurrentUser) -> UserOut:
    return user


@router.put("/me", response_model=UserOut)
async def update_me(body: UserUpdate, user: CurrentUser, db: DbSession) -> UserOut:
    changes = body.model_dump(exclude_unset=True)
    newly_onboarded = changes.get("onboarding_complete") and not user.onboarding_complete
    for field, value in changes.items():
        setattr(user, field, value)
    await db.flush()
    if newly_onboarded:
        analytics.track(
            user.id, analytics.ONBOARDING_COMPLETED, city=user.city, style=user.regional_style
        )
    return user


@router.get("/me/stats", response_model=UserStats)
async def my_stats(user: CurrentUser, db: DbSession) -> UserStats:
    g = await db.execute(
        select(
            func.count(Garment.id),
            func.coalesce(func.sum(Garment.wear_count), 0),
            # Avg cost-per-wear across garments that have both a price and at least one wear.
            func.avg(Garment.purchase_price / func.nullif(Garment.wear_count, 0)),
        ).where(Garment.user_id == user.id)
    )
    garment_count, total_wears, avg_cpw = g.one()
    outfit_count = (
        await db.execute(select(func.count(Outfit.id)).where(Outfit.user_id == user.id))
    ).scalar_one()
    return UserStats(
        garment_count=garment_count,
        outfit_count=outfit_count,
        total_wears=int(total_wears),
        avg_cost_per_wear=round(float(avg_cpw), 2) if avg_cpw is not None else None,
    )
