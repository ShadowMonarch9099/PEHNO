"""
Weekly (Sunday 10:00 IST): remind Plus/Pro users to care for garments that have
hit their fabric's wear threshold. One push per garment per threshold crossing.
"""
import logging

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core import database
from app.core.database import utcnow
from app.models.notification import NotificationLog
from app.models.user import SubscriptionTier, User
from app.services import analytics, care_service
from app.services.notifications import Push, get_notifier
from app.tasks import celery_app, run_async

log = logging.getLogger(__name__)


async def send_care_reminders() -> dict:
    sent = skipped = failed = 0
    notifier = get_notifier()
    async with database.SessionLocal() as db:
        users = (
            (
                await db.execute(
                    select(User).where(
                        User.is_active.is_(True),
                        User.fcm_token.is_not(None),
                        User.subscription_tier.in_([SubscriptionTier.plus, SubscriptionTier.pro]),
                    )
                )
            )
            .scalars()
            .all()
        )
        for user in users:
            if not user.wants("care_reminders"):
                skipped += 1
                continue
            for g in await care_service.due_for_user(db, user):
                key = f"{g.id}:{g.wears_since_care}"
                entry = NotificationLog(
                    user_id=user.id, kind="care_reminder", key=key, sent_at=utcnow()
                )
                db.add(entry)
                try:
                    await db.flush()
                except IntegrityError:
                    await db.rollback()
                    skipped += 1
                    continue
                fabric = g.fabric_type.replace("_", " ")
                gtype = g.garment_type.replace("_", " ")
                if user.language == "hi":
                    title = f"आपके {fabric} {gtype} की देखभाल का समय"
                    body = f"आख़िरी सफ़ाई के बाद {g.wears_since_care} बार पहना — {care_service.care_instruction(g)}"
                else:
                    title = f"Time to care for your {fabric} {gtype}"
                    body = f"Worn {g.wears_since_care}× since its last clean — {care_service.care_instruction(g)}"
                push = Push(
                    title=title,
                    body=body,
                    data={
                        "url": f"pehno://wardrobe/{g.id}",
                        "garment_id": str(g.id),
                        "notification_id": str(entry.id),
                    },
                )
                try:
                    if await notifier.send(user.fcm_token, push):
                        sent += 1
                        analytics.track(
                            user.id, analytics.PUSH_SENT, kind="care_reminder", fabric=g.fabric_type
                        )
                        await db.commit()
                    else:
                        failed += 1
                        await db.rollback()
                except Exception:
                    failed += 1
                    await db.rollback()
                    log.exception("care reminder failed for garment %s", g.id)
    log.info("care reminders: sent=%d skipped=%d failed=%d", sent, skipped, failed)
    return {"sent": sent, "skipped": skipped, "failed": failed}


@celery_app.task(name="pehno.send_care_reminders")
def send_care_reminders_task() -> dict:
    return run_async(send_care_reminders())
