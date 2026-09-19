from app.services.classification_service import run_classification_job
from app.tasks import celery_app, run_async


@celery_app.task(name="pehno.classify_garment", max_retries=2, default_retry_delay=30)
def classify_garment_task(garment_id: str) -> None:
    run_async(run_classification_job(garment_id))
