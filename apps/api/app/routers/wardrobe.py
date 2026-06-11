"""
Wardrobe Router — Garment upload, management, and listing
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.core.config import settings
from app.models.models import Garment, User
from app.schemas.schemas import (
    GarmentUploadResponse, GarmentResponse, GarmentUpdateRequest,
    WardrobeListResponse, MessageResponse
)
from app.services.storage_service import upload_garment_image
from app.tasks.classify_garment import classify_garment_task

router = APIRouter()


@router.post("/upload", response_model=GarmentUploadResponse)
async def upload_garment(
    file: UploadFile = File(...),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a garment image. Returns garment_id immediately.
    AI classification runs asynchronously via Celery.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Upload to Supabase Storage (compresses to 800x800)
    image_url, thumbnail_url = await upload_garment_image(file, current_user_id)

    # Create garment record immediately with pending classification
    garment = Garment(
        user_id=current_user_id,
        image_url=image_url,
        thumbnail_url=thumbnail_url,
        classification_status="pending",
    )
    db.add(garment)
    await db.commit()
    await db.refresh(garment)

    # Trigger async classification
    classify_garment_task.delay(str(garment.id), image_url)

    return GarmentUploadResponse(garment_id=str(garment.id))


@router.get("", response_model=WardrobeListResponse)
async def list_garments(
    occasion: Optional[str] = Query(None),
    fabric: Optional[str] = Query(None),
    season: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """List user's garments with optional filters."""
    query = select(Garment).where(Garment.user_id == current_user_id)

    if occasion:
        query = query.where(Garment.occasion_tags.contains([occasion]))
    if fabric:
        query = query.where(Garment.fabric_type == fabric)
    if season:
        query = query.where(Garment.season_tags.contains([season]))

    # Total count
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Paginated results
    query = query.order_by(Garment.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    garments = result.scalars().all()

    return WardrobeListResponse(
        items=[_garment_to_response(g) for g in garments],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{garment_id}", response_model=GarmentResponse)
async def get_garment(
    garment_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific garment."""
    garment = await _get_garment_or_404(garment_id, current_user_id, db)
    return _garment_to_response(garment)


@router.put("/{garment_id}", response_model=GarmentResponse)
async def update_garment(
    garment_id: str,
    request: GarmentUpdateRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Update garment details (user corrections to classification)."""
    garment = await _get_garment_or_404(garment_id, current_user_id, db)

    update_data = request.model_dump(exclude_none=True)
    for field, value in update_data.items():
        if hasattr(garment, field):
            setattr(garment, field, value)

    # Mark as user-verified when user corrects it
    if update_data:
        garment.user_verified = True

    await db.commit()
    await db.refresh(garment)
    return _garment_to_response(garment)


@router.delete("/{garment_id}", response_model=MessageResponse)
async def delete_garment(
    garment_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Delete a garment."""
    garment = await _get_garment_or_404(garment_id, current_user_id, db)
    await db.delete(garment)
    await db.commit()
    return MessageResponse(message="Garment deleted successfully")


@router.post("/{garment_id}/wear", response_model=GarmentResponse)
async def log_wear(
    garment_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Increment wear count for a garment."""
    from datetime import datetime
    garment = await _get_garment_or_404(garment_id, current_user_id, db)
    garment.wear_count = (garment.wear_count or 0) + 1
    garment.last_worn_at = datetime.utcnow()
    await db.commit()
    await db.refresh(garment)
    return _garment_to_response(garment)


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _get_garment_or_404(
    garment_id: str, user_id: str, db: AsyncSession
) -> Garment:
    result = await db.execute(
        select(Garment).where(Garment.id == garment_id, Garment.user_id == user_id)
    )
    garment = result.scalar_one_or_none()
    if not garment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Garment not found")
    return garment


def _garment_to_response(g: Garment) -> GarmentResponse:
    return GarmentResponse(
        id=str(g.id),
        user_id=str(g.user_id),
        image_url=g.image_url,
        thumbnail_url=g.thumbnail_url,
        garment_type=g.garment_type,
        fabric_type=g.fabric_type,
        color_primary=g.color_primary,
        color_accent=g.color_accent,
        occasion_tags=g.occasion_tags or [],
        season_tags=g.season_tags or [],
        regional_style=g.regional_style,
        purchase_price=float(g.purchase_price) if g.purchase_price else None,
        purchase_date=g.purchase_date,
        condition=g.condition.value,
        wear_count=g.wear_count,
        last_worn_at=g.last_worn_at,
        ai_confidence=g.ai_confidence,
        classification_status=g.classification_status,
        user_verified=g.user_verified,
        care_profile=g.care_profile or {},
        notes=g.notes,
        created_at=g.created_at,
    )
