"""Daily 02:00 IST: downgrade lapsed subscriptions."""
import logging

from app.core import database
from app.services import billing_service
from app.tasks import celery_app, run_async

log = logging.getLogger(__name__)


async def reconcile() -> dict:
    async with database.SessionLocal() as db:
        n = await billing_service.reconcile_expired(db)
        await db.commit()
    log.info("billing reconcile: downgraded=%d", n)
    return {"downgraded": n}


@celery_app.task(name="pehno.reconcile_subscriptions")
def reconcile_task() -> dict:
    return run_async(reconcile())
