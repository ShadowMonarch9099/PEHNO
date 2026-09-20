"""
Monday 08:00 IST: refresh the gap report for every Plus/Pro user and push a
summary ("You're missing 1 key piece that could unlock 12 new outfits").
"""
import logging

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core import database
from app.core.database import utcnow
from app.models.notification import NotificationLog
from app.models.user import SubscriptionTier, User
from app.services import analytics, gap_service
from app.services.festival_service import today_ist
from app.services.notifications import Push, get_notifier
from app.tasks import celery_app, run_async

log = logging.getLogger(__name__)


def _copy(report: dict, notification_id: str, lang: str = "en") -> Push:
    top = report["gaps"][0]
    if lang == "hi":
        title = "आपकी साप्ताहिक अलमारी रिपोर्ट तैयार है"
        body = f"1 ज़रूरी पीस से {top['new_outfits']} नए आउटफ़िट बन सकते हैं → {top['suggested_colors'][0]} {top['label'].lower()}।"
    else:
        title = "Your weekly wardrobe report is ready"
        body = (
            f"You're missing 1 key piece that could unlock {top['new_outfits']} new outfits → "
            f"a {top['suggested_colors'][0]} {top['label'].lower()}."
        )
    return Push(
        title=title,
        body=body,
        data={"url": "pehno://commerce/gap-report", "notification_id": notification_id},
    )


async def send_weekly_gap_reports() -> dict:
    sent = skipped = failed = 0
    notifier = get_notifier()
    week_key = today_ist().isoformat()
    async with database.SessionLocal() as db:
        users = (
            (
                await db.execute(
                    select(User).where(
                        User.is_active.is_(True),
                        User.subscription_tier.in_([SubscriptionTier.plus, SubscriptionTier.pro]),
                    )
                )
            )
            .scalars()
            .all()
        )
        for user in users:
            if not user.wants("gap_reports"):
                skipped += 1
                continue
            try:
                report = await gap_service.get_report(db, user, force=True)
                if not report["gaps"] or not user.fcm_token:
                    skipped += 1
                    continue
                entry = NotificationLog(
                    user_id=user.id, kind="weekly_gap_report", key=week_key, sent_at=utcnow()
                )
                db.add(entry)
                try:
                    await db.flush()
                except IntegrityError:
                    await db.rollback()
                    skipped += 1
                    continue
                if await notifier.send(user.fcm_token, _copy(report, str(entry.id), user.language)):
                    sent += 1
                    analytics.track(user.id, analytics.PUSH_SENT, kind="weekly_gap_report")
                    await db.commit()
                else:
                    failed += 1
                    await db.rollback()
            except Exception:
                failed += 1
                await db.rollback()
                log.exception("weekly gap report failed for %s", user.id)
    log.info("weekly gap reports: sent=%d skipped=%d failed=%d", sent, skipped, failed)
    return {"sent": sent, "skipped": skipped, "failed": failed}


@celery_app.task(name="pehno.weekly_gap_report")
def weekly_gap_report_task() -> dict:
    return run_async(send_weekly_gap_reports())
