"""
Runs the classifier for a garment and records user corrections as training data.

`run_classification_job` owns its own DB session because it executes outside a
request (Celery worker or FastAPI background task).
"""
import logging
import uuid

from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import database
from app.core.database import utcnow
from app.models.feedback import ClassificationFeedback
from app.models.garment import ClassificationStatus, Garment
from app.models.user import User
from app.schemas.garment import GarmentUpdate
from app.services.classifier import classify_image
from app.services.storage import get_storage

log = logging.getLogger(__name__)


async def classify_garment(db: AsyncSession, garment: Garment) -> Garment:
    """Classify in place. A user-verified garment keeps the user's labels; only the snapshot is refreshed."""
    user = await db.get(User, garment.user_id)
    data = await get_storage().get(garment.image_key)
    result = await run_in_threadpool(classify_image, data, user.regional_style if user else None)

    snapshot = {
        "garment_type": result.garment_type,
        "fabric_type": result.fabric_type,
        "color_primary": result.color_primary,
        "color_accent": result.color_accent,
        "occasion_tags": result.occasion_tags,
        "season_tags": result.season_tags,
        "regional_style": result.regional_style,
        "confidence": result.confidence,
        "backend": result.backend,
        "candidates": result.candidates,
    }
    garment.ai_labels = snapshot
    garment.ai_confidence = result.confidence
    garment.classified_at = utcnow()
    garment.classification_status = ClassificationStatus.complete

    if not garment.user_verified:
        garment.garment_type = result.garment_type
        garment.fabric_type = result.fabric_type
        garment.color_primary = result.color_primary
        garment.color_accent = result.color_accent
        garment.occasion_tags = result.occasion_tags
        garment.season_tags = result.season_tags
        garment.regional_style = result.regional_style
        garment.care_profile = result.care_profile
    await db.flush()
    return garment


async def run_classification_job(garment_id: uuid.UUID | str) -> None:
    """Entry point for background execution. Never raises; failures are recorded on the row."""
    gid = uuid.UUID(str(garment_id))
    async with database.SessionLocal() as db:
        garment = await db.get(Garment, gid)
        if garment is None:
            log.warning("classify: garment %s vanished before job ran", gid)
            return
        try:
            await classify_garment(db, garment)
            await db.commit()
            log.info(
                "classified %s → %s/%s (%.2f, %s)",
                gid,
                garment.garment_type,
                garment.fabric_type,
                garment.ai_confidence,
                garment.ai_labels["backend"] if garment.ai_labels else "?",
            )
        except Exception:
            await db.rollback()
            log.exception("classify: failed for garment %s", gid)
            garment = await db.get(Garment, gid)
            if garment is not None:
                garment.classification_status = ClassificationStatus.failed
                await db.commit()


async def record_feedback(db: AsyncSession, garment: Garment, changes: dict) -> int:
    """
    Persist every classification field the user changed away from the AI's value.
    Called before the change is applied. Returns rows written.
    """
    ai = garment.ai_labels or {}
    written = 0
    for field in changes.keys() & GarmentUpdate.CLASSIFICATION_FIELDS:
        new = changes[field]
        old = ai.get(field, getattr(garment, field))
        if new == old:
            continue
        db.add(
            ClassificationFeedback(
                garment_id=garment.id,
                user_id=garment.user_id,
                image_key=garment.image_key,
                field=field,
                ai_value=old,
                user_value=new,
                ai_confidence=float(ai.get("confidence", garment.ai_confidence or 0.0)),
                backend=str(ai.get("backend", "")),
                created_at=utcnow(),
            )
        )
        written += 1
    if written:
        await db.flush()
    return written
