"""
Celery Task — Async garment classification
Triggered after every image upload.
"""
import asyncio
import logging
from app.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    name="app.tasks.classify_garment.classify_garment_task",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
)
def classify_garment_task(self, garment_id: str, image_url: str):
    """
    Classify a garment image and update the database record.
    Also triggers Supabase realtime update for mobile app.
    """
    try:
        asyncio.run(_classify_and_update(garment_id, image_url))
    except Exception as exc:
        logger.error(f"Classification failed for {garment_id}: {exc}")
        self.retry(exc=exc)


async def _classify_and_update(garment_id: str, image_url: str):
    """Async classification and DB update logic."""
    from app.core.database import AsyncSessionLocal
    from app.models.models import Garment
    from app.services.garment_classifier import classifier
    from sqlalchemy import select

    logger.info(f"Classifying garment {garment_id}")

    # Run classification
    result = await classifier.classify(image_url)

    # Update database
    async with AsyncSessionLocal() as db:
        garment_result = await db.execute(
            select(Garment).where(Garment.id == garment_id)
        )
        garment = garment_result.scalar_one_or_none()

        if not garment:
            logger.error(f"Garment {garment_id} not found in DB")
            return

        # Update with classification results
        garment.garment_type = result["garment_type"]
        garment.fabric_type = result["fabric_type"]
        garment.color_primary = result["color_primary"]
        garment.color_accent = result.get("color_accent")
        garment.occasion_tags = result["occasion_tags"]
        garment.season_tags = result["season_tags"]
        garment.regional_style = result.get("regional_style")
        garment.ai_confidence = result["confidence_score"]
        garment.care_profile = result["care_profile"]
        garment.classification_status = "complete"

        await db.commit()
        logger.info(f"✅ Garment {garment_id} classified as {result['garment_type']} ({result['confidence_score']:.2f})")

    # Log correction data for training feedback
    _log_classification_for_training(garment_id, result)


def _log_classification_for_training(garment_id: str, result: dict):
    """
    Log classification results for future model improvement.
    Every ML prediction is stored as training data.
    """
    logger.info(
        f"[TRAINING_LOG] garment_id={garment_id} "
        f"type={result['garment_type']} "
        f"fabric={result['fabric_type']} "
        f"confidence={result['confidence_score']}"
    )
