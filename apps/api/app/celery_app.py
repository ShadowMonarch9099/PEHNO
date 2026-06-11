"""
Celery Application Configuration
"""
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "pehno",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.tasks.classify_garment",
        "app.tasks.daily_outfit_push",
        "app.tasks.festival_alert",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    beat_schedule={
        # Daily outfit push at 7:30 AM IST
        "daily-outfit-push": {
            "task": "app.tasks.daily_outfit_push.push_daily_outfits",
            "schedule": {"hour": 2, "minute": 0},  # 7:30 AM IST = 2:00 AM UTC
        },
        # Festival alerts at 9:00 AM IST daily
        "festival-alerts": {
            "task": "app.tasks.festival_alert.send_festival_alerts",
            "schedule": {"hour": 3, "minute": 30},  # 9:00 AM IST = 3:30 AM UTC
        },
    },
)
