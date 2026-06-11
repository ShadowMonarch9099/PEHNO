"""
Festivals Router — Festival data, upcoming festivals, Navratri tracker
"""
from typing import List
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models.models import User, Garment, Festival
from app.schemas.schemas import (
    FestivalResponse, UpcomingFestivalResponse,
    FestivalDetailResponse, NavratriDayResponse
)
from app.services.festival_service import FestivalService

router = APIRouter()


@router.get("/upcoming", response_model=List[UpcomingFestivalResponse])
async def get_upcoming_festivals(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get next 3 upcoming festivals for user's region."""
    user_result = await db.execute(select(User).where(User.id == current_user_id))
    user = user_result.scalar_one_or_none()

    region = _city_to_region(user.city if user else "Mumbai")

    result = await db.execute(
        select(Festival).where(Festival.date_this_year >= date.today()).order_by(Festival.date_this_year)
    )
    festivals = result.scalars().all()

    upcoming = []
    for f in festivals[:3]:
        days_until = (f.date_this_year - date.today()).days
        upcoming.append(
            UpcomingFestivalResponse(
                id=str(f.id),
                name=f.name,
                slug=f.slug,
                date_this_year=f.date_this_year,
                region=f.region or [],
                color_codes=f.color_codes or {},
                dress_code=f.dress_code,
                occasion_tags=f.occasion_tags or [],
                description=f.description,
                days_until=days_until,
            )
        )

    return upcoming


@router.get("/navratri/today", response_model=NavratriDayResponse)
async def get_navratri_today(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get today's Navratri color and matching garments from wardrobe."""
    service = FestivalService()
    navratri_data = service.get_navratri_today()

    if not navratri_data:
        raise HTTPException(status_code=404, detail="Navratri is not currently active")

    # Get matching garments from wardrobe
    garments_result = await db.execute(
        select(Garment).where(Garment.user_id == current_user_id)
    )
    garments = garments_result.scalars().all()

    matching = service.find_color_matching_garments(garments, navratri_data["color_hex"])

    from app.routers.wardrobe import _garment_to_response
    return NavratriDayResponse(
        day=navratri_data["day"],
        color_name=navratri_data["color_name"],
        color_hex=navratri_data["color_hex"],
        goddess=navratri_data["goddess"],
        is_today=True,
        matching_garments=[_garment_to_response(g) for g in matching],
    )


@router.get("/{slug}", response_model=FestivalDetailResponse)
async def get_festival_detail(
    slug: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get festival details with curated looks from user's wardrobe."""
    result = await db.execute(select(Festival).where(Festival.slug == slug))
    festival = result.scalar_one_or_none()

    if not festival:
        raise HTTPException(status_code=404, detail=f"Festival '{slug}' not found")

    days_until = (festival.date_this_year - date.today()).days

    # Get user's garments for curated looks
    garments_result = await db.execute(
        select(Garment).where(
            Garment.user_id == current_user_id,
            Garment.classification_status == "complete",
        )
    )
    garments = garments_result.scalars().all()

    service = FestivalService()
    curated_looks = service.generate_curated_looks(festival, list(garments))

    # Build Navratri days if applicable
    navratri_days = None
    if slug == "navratri":
        navratri_days = service.get_all_navratri_days(festival.date_this_year)

    return FestivalDetailResponse(
        id=str(festival.id),
        name=festival.name,
        slug=festival.slug,
        date_this_year=festival.date_this_year,
        region=festival.region or [],
        color_codes=festival.color_codes or {},
        dress_code=festival.dress_code,
        occasion_tags=festival.occasion_tags or [],
        description=festival.description,
        curated_looks=curated_looks,
        navratri_days=navratri_days,
    )


# ── Helpers ────────────────────────────────────────────────────────────────────

def _city_to_region(city: str) -> str:
    """Map city to broad Indian region."""
    region_map = {
        "Mumbai": "maharashtra", "Pune": "maharashtra",
        "Delhi": "north_india", "Jaipur": "rajasthan", "Lucknow": "north_india",
        "Chandigarh": "punjab",
        "Bengaluru": "karnataka", "Chennai": "tamil_nadu",
        "Hyderabad": "andhra_pradesh", "Coimbatore": "tamil_nadu",
        "Kolkata": "west_bengal", "Bhubaneswar": "odisha",
        "Kochi": "kerala", "Ahmedabad": "gujarat",
        "Surat": "gujarat", "Bhopal": "madhya_pradesh",
        "Indore": "madhya_pradesh", "Nagpur": "maharashtra",
        "Patna": "bihar", "Visakhapatnam": "andhra_pradesh",
    }
    return region_map.get(city, "pan_india")
