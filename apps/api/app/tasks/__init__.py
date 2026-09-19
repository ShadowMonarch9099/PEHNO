"""
Background jobs.

With CELERY_BROKER_URL set, jobs go to Celery workers (production). Without it,
`dispatch` runs the coroutine as a FastAPI background task in-process — the
response still returns immediately and the mobile client polls for status.
"""
import asyncio
import logging
from collections.abc import Awaitable, Callable
from typing import Any

from celery import Celery
from celery.schedules import crontab
from fastapi import BackgroundTasks

from app.core.config import settings

log = logging.getLogger(__name__)

celery_app = Celery(
    "pehno",
    broker=settings.CELERY_BROKER_URL or "memory://",
    backend=None,
    include=[
        "app.tasks.classify",
        "app.tasks.daily_outfit_push",
        "app.tasks.festival_alert",
        "app.tasks.billing_reconcile",
        "app.tasks.weekly_gap_report",
    ],
)
celery_app.conf.update(
    task_always_eager=not settings.CELERY_BROKER_URL,
    task_serializer="json",
    accept_content=["json"],
    timezone="Asia/Kolkata",
    enable_utc=True,
    worker_prefetch_multiplier=1,  # classification is CPU-heavy; don't hoard tasks
    task_acks_late=True,
    beat_schedule={
        "weekly-gap-report": {
            "task": "pehno.weekly_gap_report",
            "schedule": crontab(day_of_week="mon", hour=8, minute=0),
        },
        "billing-reconcile": {
            "task": "pehno.reconcile_subscriptions",
            "schedule": crontab(hour=2, minute=0),
        },
        "festival-alerts": {
            "task": "pehno.send_festival_alerts",
            "schedule": crontab(hour=9, minute=0),
        },
        "daily-outfit-push": {
            "task": "pehno.push_daily_outfits",
            # Celery beat uses the app timezone (Asia/Kolkata) for crontab.
            "schedule": crontab(
                hour=settings.DAILY_PUSH_HOUR_IST, minute=settings.DAILY_PUSH_MINUTE_IST
            ),
        },
    },
)

CELERY_ENABLED = bool(settings.CELERY_BROKER_URL)


def run_async(coro: Awaitable[Any]) -> Any:
    """Run a coroutine from a sync Celery task (each task gets a fresh loop)."""
    return asyncio.run(coro)


def dispatch(
    background: BackgroundTasks, celery_task, job: Callable[..., Awaitable[None]], *args
) -> None:
    if CELERY_ENABLED:
        celery_task.delay(*[str(a) for a in args])
    else:
        background.add_task(job, *args)
