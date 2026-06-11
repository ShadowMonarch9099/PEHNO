"""
Users Router — Profile management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models.models import User, Garment, Outfit
from app.schemas.schemas import UserResponse, UserUpdateRequest, UserStatsResponse

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get current user profile."""
    result = await db.execute(select(User).where(User.id == current_user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return UserResponse(
        id=str(user.id),
        phone=user.phone,
        email=user.email,
        name=user.name,
        city=user.city,
        gender=user.gender.value,
        body_type=user.body_type.value,
        skin_tone=user.skin_tone.value,
        regional_style=user.regional_style,
        subscription_tier=user.subscription_tier.value,
        subscription_expires_at=user.subscription_expires_at,
        onboarding_complete=user.onboarding_complete,
        created_at=user.created_at,
    )


@router.put("/me", response_model=UserResponse)
async def update_me(
    request: UserUpdateRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Update user profile fields."""
    result = await db.execute(select(User).where(User.id == current_user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = request.model_dump(exclude_none=True)
    for field, value in update_data.items():
        if hasattr(user, field):
            setattr(user, field, value)

    # Mark onboarding complete if key fields are set
    if user.name and user.city and user.body_type and user.skin_tone:
        user.onboarding_complete = True

    await db.commit()
    await db.refresh(user)

    return UserResponse(
        id=str(user.id),
        phone=user.phone,
        email=user.email,
        name=user.name,
        city=user.city,
        gender=user.gender.value,
        body_type=user.body_type.value,
        skin_tone=user.skin_tone.value,
        regional_style=user.regional_style,
        subscription_tier=user.subscription_tier.value,
        subscription_expires_at=user.subscription_expires_at,
        onboarding_complete=user.onboarding_complete,
        created_at=user.created_at,
    )


@router.get("/me/stats", response_model=UserStatsResponse)
async def get_my_stats(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get user wardrobe statistics."""
    # Count garments
    garment_count_result = await db.execute(
        select(func.count(Garment.id)).where(Garment.user_id == current_user_id)
    )
    wardrobe_count = garment_count_result.scalar() or 0

    # Count outfits
    outfit_count_result = await db.execute(
        select(func.count(Outfit.id)).where(Outfit.user_id == current_user_id)
    )
    outfit_count = outfit_count_result.scalar() or 0

    # Average cost per wear
    garment_result = await db.execute(
        select(Garment).where(
            Garment.user_id == current_user_id,
            Garment.purchase_price.isnot(None),
            Garment.wear_count > 0,
        )
    )
    garments = garment_result.scalars().all()

    avg_cpw = 0.0
    if garments:
        total_cpw = sum(
            float(g.purchase_price) / g.wear_count for g in garments
        )
        avg_cpw = round(total_cpw / len(garments), 2)

    # Total wardrobe value
    value_result = await db.execute(
        select(func.sum(Garment.purchase_price)).where(Garment.user_id == current_user_id)
    )
    total_value = value_result.scalar()

    return UserStatsResponse(
        wardrobe_count=wardrobe_count,
        outfit_count=outfit_count,
        avg_cost_per_wear=avg_cpw,
        total_wardrobe_value=float(total_value) if total_value else None,
    )
