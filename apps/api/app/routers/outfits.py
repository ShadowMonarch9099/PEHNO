"""
Outfits Router — Daily outfit generation, history, and saved outfits
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, date
from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models.models import User, Garment, Outfit
from app.schemas.schemas import (
    OutfitGenerateRequest, OutfitResponse, DailyOutfitResponse,
    OutfitRateRequest, MessageResponse
)
from app.services.outfit_engine import OutfitEngine
from app.services.weather_service import WeatherService
from app.routers.wardrobe import _garment_to_response

router = APIRouter()


@router.get("/daily", response_model=DailyOutfitResponse)
async def get_daily_outfit(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate today's outfit recommendation based on live weather
    and user's wardrobe + preferences.
    """
    # Check for existing daily outfit today
    today_start = datetime.combine(date.today(), datetime.min.time())
    existing_result = await db.execute(
        select(Outfit).where(
            Outfit.user_id == current_user_id,
            Outfit.is_daily == True,
            Outfit.created_at >= today_start,
        )
    )
    existing = existing_result.scalar_one_or_none()

    # Get user
    user_result = await db.execute(select(User).where(User.id == current_user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get weather
    weather_service = WeatherService()
    weather = await weather_service.get_weather(user.city)

    if existing:
        garments = await _load_garments_for_outfit(existing, db)
        return DailyOutfitResponse(
            outfit=_outfit_to_response(existing, garments),
            weather=weather,
            reason=f"Today's pick for {weather['condition']} weather in {user.city}",
        )

    # Generate new daily outfit
    garments_result = await db.execute(
        select(Garment).where(
            Garment.user_id == current_user_id,
            Garment.classification_status == "complete",
        )
    )
    garments = garments_result.scalars().all()

    engine = OutfitEngine(garments=list(garments), weather=weather)
    outfit_garment_ids, reason = engine.generate_daily()

    if not outfit_garment_ids:
        raise HTTPException(
            status_code=404,
            detail="Not enough garments to generate outfit. Add more to your wardrobe.",
        )

    outfit = Outfit(
        user_id=current_user_id,
        garment_ids=outfit_garment_ids,
        occasion="casual",
        weather_condition=weather.get("condition", ""),
        temperature_celsius=int(weather.get("temperature_celsius", 25)),
        is_daily=True,
    )
    db.add(outfit)
    await db.commit()
    await db.refresh(outfit)

    outfit_garments = [g for g in garments if str(g.id) in outfit_garment_ids]

    return DailyOutfitResponse(
        outfit=_outfit_to_response(outfit, outfit_garments),
        weather=weather,
        reason=reason,
    )


@router.post("/generate", response_model=List[OutfitResponse])
async def generate_outfit(
    request: OutfitGenerateRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Generate outfit(s) for a specific occasion."""
    user_result = await db.execute(select(User).where(User.id == current_user_id))
    user = user_result.scalar_one_or_none()

    garments_result = await db.execute(
        select(Garment).where(
            Garment.user_id == current_user_id,
            Garment.classification_status == "complete",
        )
    )
    garments = garments_result.scalars().all()

    weather_service = WeatherService()
    weather = await weather_service.get_weather(user.city if user else "Mumbai")

    engine = OutfitEngine(garments=list(garments), weather=weather)
    outfit_options = engine.generate_for_occasion(request.occasion, festival=request.festival)

    saved_outfits = []
    for option in outfit_options[:3]:  # Top 3 options
        outfit = Outfit(
            user_id=current_user_id,
            garment_ids=option["garment_ids"],
            occasion=request.occasion,
            weather_condition=weather.get("condition", ""),
            temperature_celsius=int(weather.get("temperature_celsius", 25)),
            festival=request.festival,
        )
        db.add(outfit)
        await db.flush()

        outfit_garments = [g for g in garments if str(g.id) in option["garment_ids"]]
        saved_outfits.append(_outfit_to_response(outfit, outfit_garments))

    await db.commit()
    return saved_outfits


@router.get("/history", response_model=List[OutfitResponse])
async def get_outfit_history(
    page: int = Query(1, ge=1),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get outfit history."""
    result = await db.execute(
        select(Outfit)
        .where(Outfit.user_id == current_user_id)
        .order_by(Outfit.created_at.desc())
        .offset((page - 1) * 20)
        .limit(20)
    )
    outfits = result.scalars().all()
    return [_outfit_to_response(o, []) for o in outfits]


@router.post("/{outfit_id}/rate", response_model=OutfitResponse)
async def rate_outfit(
    outfit_id: str,
    request: OutfitRateRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Rate an outfit (1–5 stars)."""
    outfit = await _get_outfit_or_404(outfit_id, current_user_id, db)
    outfit.rating = request.rating
    await db.commit()
    return _outfit_to_response(outfit, [])


@router.post("/{outfit_id}/save", response_model=OutfitResponse)
async def save_outfit(
    outfit_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Save/unsave an outfit."""
    outfit = await _get_outfit_or_404(outfit_id, current_user_id, db)
    outfit.is_saved = not outfit.is_saved
    await db.commit()
    return _outfit_to_response(outfit, [])


@router.get("/saved", response_model=List[OutfitResponse])
async def get_saved_outfits(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get all saved outfits."""
    result = await db.execute(
        select(Outfit)
        .where(Outfit.user_id == current_user_id, Outfit.is_saved == True)
        .order_by(Outfit.created_at.desc())
    )
    outfits = result.scalars().all()
    return [_outfit_to_response(o, []) for o in outfits]


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _get_outfit_or_404(outfit_id: str, user_id: str, db: AsyncSession) -> Outfit:
    result = await db.execute(
        select(Outfit).where(Outfit.id == outfit_id, Outfit.user_id == user_id)
    )
    outfit = result.scalar_one_or_none()
    if not outfit:
        raise HTTPException(status_code=404, detail="Outfit not found")
    return outfit


async def _load_garments_for_outfit(outfit: Outfit, db: AsyncSession) -> List[Garment]:
    if not outfit.garment_ids:
        return []
    result = await db.execute(
        select(Garment).where(Garment.id.in_([str(gid) for gid in outfit.garment_ids]))
    )
    return result.scalars().all()


def _outfit_to_response(outfit: Outfit, garments: List[Garment]) -> OutfitResponse:
    return OutfitResponse(
        id=str(outfit.id),
        user_id=str(outfit.user_id),
        garment_ids=[str(gid) for gid in (outfit.garment_ids or [])],
        garments=[_garment_to_response(g) for g in garments] if garments else None,
        occasion=outfit.occasion,
        weather_condition=outfit.weather_condition,
        temperature_celsius=outfit.temperature_celsius,
        festival=outfit.festival,
        worn_at=outfit.worn_at,
        rating=outfit.rating,
        is_saved=outfit.is_saved,
        created_at=outfit.created_at,
    )
