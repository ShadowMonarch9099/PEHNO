"""
Wardrobe: garment lifecycle (upload → pending classification → user edits → wear log).
"""
import logging
import uuid
from decimal import Decimal

from fastapi import HTTPException, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import utcnow
from app.core.query import json_list_contains
from app.models.garment import ClassificationStatus, Garment
from app.models.user import User
from app.schemas.garment import GarmentOut, GarmentUpdate
from app.services import analytics, care_service, gap_service
from app.services.classification_service import record_feedback
from app.services.classifier import rules
from app.services.image_service import InvalidImageError, process_garment_image
from app.services.storage import get_storage

log = logging.getLogger(__name__)


def to_out(g: Garment) -> GarmentOut:
    storage = get_storage()
    cpw = (
        (Decimal(g.purchase_price) / g.wear_count).quantize(Decimal("0.01"))
        if g.purchase_price is not None and g.wear_count > 0
        else None
    )
    return GarmentOut(
        id=g.id,
        image_url=storage.url_for(g.image_key),
        thumbnail_url=storage.url_for(g.thumbnail_key) if g.thumbnail_key else None,
        garment_type=g.garment_type,
        fabric_type=g.fabric_type,
        color_primary=g.color_primary,
        color_accent=g.color_accent,
        occasion_tags=g.occasion_tags,
        season_tags=g.season_tags,
        regional_style=g.regional_style,
        ai_confidence=g.ai_confidence,
        classification_status=g.classification_status,
        user_verified=g.user_verified,
        care_profile=g.care_profile,
        ai_labels=g.ai_labels,
        classified_at=g.classified_at,
        purchase_price=g.purchase_price,
        purchase_date=g.purchase_date,
        condition=g.condition,
        notes=g.notes,
        wear_count=g.wear_count,
        last_worn_at=g.last_worn_at,
        cost_per_wear=cpw,
        wears_since_care=g.wears_since_care,
        last_cared_at=g.last_cared_at,
        care_reminders_enabled=g.care_reminders_enabled,
        care_due=care_service.care_due(g),
        care_threshold=care_service.reminder_threshold(g.fabric_type),
        created_at=g.created_at,
        updated_at=g.updated_at,
    )


async def create_from_upload(db: AsyncSession, user: User, data: bytes) -> Garment:
    """Process + store the image and create a pending garment. Raises InvalidImageError."""
    processed = await run_in_threadpool(process_garment_image, data)
    storage = get_storage()
    gid = uuid.uuid4()
    image_key = f"garments/{user.id}/{gid}.jpg"
    thumb_key = f"garments/{user.id}/{gid}_thumb.jpg"
    await storage.put(image_key, processed.full)
    await storage.put(thumb_key, processed.thumbnail)

    garment = Garment(
        id=gid,
        user_id=user.id,
        image_key=image_key,
        thumbnail_key=thumb_key,
        classification_status=ClassificationStatus.pending,
    )
    db.add(garment)
    await db.flush()
    analytics.track(user.id, analytics.GARMENT_UPLOADED, bytes=len(data))
    return garment


async def get_owned(db: AsyncSession, user: User, garment_id: uuid.UUID) -> Garment:
    g = await db.get(Garment, garment_id)
    if g is None or g.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Garment not found")
    return g


async def list_garments(
    db: AsyncSession,
    user: User,
    *,
    occasion: str | None = None,
    fabric: str | None = None,
    season: str | None = None,
    garment_type: str | None = None,
    status_: ClassificationStatus | None = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[Garment], int]:
    q = select(Garment).where(Garment.user_id == user.id)
    if occasion:
        q = q.where(json_list_contains(Garment.occasion_tags, occasion))
    if season:
        q = q.where(json_list_contains(Garment.season_tags, season))
    if fabric:
        q = q.where(Garment.fabric_type == fabric)
    if garment_type:
        q = q.where(Garment.garment_type == garment_type)
    if status_:
        q = q.where(Garment.classification_status == status_)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    rows = (
        (
            await db.execute(
                q.order_by(Garment.created_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        )
        .scalars()
        .all()
    )
    return list(rows), total


async def update_garment(db: AsyncSession, garment: Garment, patch: GarmentUpdate) -> Garment:
    changes = patch.model_dump(exclude_unset=True)
    corrections = await record_feedback(db, garment, changes)  # what the AI said vs the user
    if corrections:
        analytics.track(
            garment.user_id,
            analytics.GARMENT_CORRECTED,
            fields=sorted(changes.keys() & GarmentUpdate.CLASSIFICATION_FIELDS),
            ai_confidence=garment.ai_confidence,
        )
    for field, value in changes.items():
        setattr(garment, field, value)
    if changes.keys() & GarmentUpdate.CLASSIFICATION_FIELDS:
        garment.user_verified = True
        # Relabelling the type/fabric with no tags set → seed occasions/seasons from
        # the knowledge base so the piece is usable immediately (the user can edit).
        if {"garment_type", "fabric_type"} & changes.keys():
            if not garment.occasion_tags and "occasion_tags" not in changes:
                garment.occasion_tags = rules.occasions_for(
                    garment.garment_type, garment.fabric_type
                )
            if not garment.season_tags and "season_tags" not in changes:
                garment.season_tags = rules.seasons_for_fabric(garment.fabric_type)
        # A user-labelled garment counts as classified even if the model never ran.
        if garment.classification_status != ClassificationStatus.complete:
            garment.classification_status = ClassificationStatus.complete
    await db.flush()
    return garment


async def delete_garment(db: AsyncSession, garment: Garment) -> None:
    storage = get_storage()
    for key in (garment.image_key, garment.thumbnail_key):
        if key:
            try:
                await storage.delete(key)
            except Exception:  # storage cleanup must never block the delete
                log.exception("Failed to delete %s", key)
    await db.delete(garment)
    await db.flush()
    gap_service.invalidate(garment.user_id)


async def confirm_labels(db: AsyncSession, garment: Garment) -> Garment:
    """User says the AI got it right — a positive training signal."""
    garment.user_verified = True
    if garment.classification_status != ClassificationStatus.complete:
        garment.classification_status = ClassificationStatus.complete
    await db.flush()
    analytics.track(
        garment.user_id,
        analytics.GARMENT_CONFIRMED,
        garment_type=garment.garment_type,
        ai_confidence=garment.ai_confidence,
    )
    return garment


async def log_wear(db: AsyncSession, garment: Garment) -> Garment:
    garment.wear_count += 1
    garment.wears_since_care += 1
    garment.last_worn_at = utcnow()
    await db.flush()
    return garment


__all__ = ["InvalidImageError"]
