"""
Share-card pre-render (plan: tasks/social_card_generator.py). Dispatched when a
user with `social_sharing_enabled` saves an outfit; in-process without a broker.
"""
from app.services.social_service import generate_card_job
from app.tasks import celery_app, run_async


@celery_app.task(name="pehno.social_card_generator", max_retries=1, default_retry_delay=30)
def social_card_task(outfit_id: str) -> None:
    run_async(generate_card_job(outfit_id))
