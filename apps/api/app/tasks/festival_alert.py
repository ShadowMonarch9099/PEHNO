"""
Festival alerts 14, 7 and 1 day(s) before each festival relevant to the user's
region (09:00 IST). The notification_log guarantees one push per (user, festival, year, lead).
"""
import logging

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core import database
from app.core.database import utcnow
from app.models.notification import NotificationLog
from app.models.user import User
from app.services import festival_service as fs
from app.services.notifications import Push, get_notifier
from app.tasks import celery_app, run_async

log = logging.getLogger(__name__)


def _copy(occ: fs.Occurrence, days: int, notification_id: str, lang: str = "en") -> Push:
    f = occ.festival
    if lang == "hi":
        when = "कल" if days == 1 else f"{days} दिन में"
        title = f"🪔 {f['name']} {when}"
        body = f"{f['name']} {when} है। अपनी अलमारी से लुक देखें।"
    else:
        when = "tomorrow" if days == 1 else f"in {days} days"
        title = f"🪔 {f['name']} {when}"
        body = f"{f['name']} is {when}. See looks from your own wardrobe — {f.get('color_guidance', '')[:80].rstrip('. ')}."
    return Push(
        title=title,
        body=body,
        data={
            "url": f"pehno://festivals/{f['slug']}",
            "festival": f["slug"],
            "notification_id": notification_id,
        },
    )


async def send_festival_alerts() -> dict:
    sent = skipped = failed = 0
    notifier = get_notifier()
    today = fs.today_ist()
    async with database.SessionLocal() as db:
        users = (
            (
                await db.execute(
                    select(User).where(User.is_active.is_(True), User.fcm_token.is_not(None))
                )
            )
            .scalars()
            .all()
        )
        for user in users:
            if not user.wants("festival_alerts"):
                skipped += 1
                continue
            for occ, days in fs.alerts_due(user, today):
                key = f"{occ.slug}:{occ.start.year}:{days}"
                entry = NotificationLog(
                    user_id=user.id, kind="festival_alert", key=key, sent_at=utcnow()
                )
                db.add(entry)
                try:
                    await db.flush()
                except IntegrityError:
                    await db.rollback()
                    skipped += 1  # already sent
                    continue
                ok = await notifier.send(
                    user.fcm_token, _copy(occ, days, str(entry.id), user.language)
                )
                if ok:
                    sent += 1
                    await db.commit()
                else:
                    failed += 1
                    await db.rollback()
    log.info("festival alerts: sent=%d skipped=%d failed=%d", sent, skipped, failed)
    return {"sent": sent, "skipped": skipped, "failed": failed}


@celery_app.task(name="pehno.send_festival_alerts")
def send_festival_alerts_task() -> dict:
    return run_async(send_festival_alerts())
