"""
Morning "Today's look" push (07:30 IST by default). Generates each user's daily
outfit, logs the send (for open-rate measurement) and notifies with a deep link.
"""
import logging

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app import knowledge
from app.core import database
from app.core.database import utcnow
from app.models.notification import NotificationLog
from app.models.user import User
from app.services import analytics, outfit_service
from app.services.festival_service import today_ist
from app.services.notifications import Push, get_notifier
from app.tasks import celery_app, run_async

log = logging.getLogger(__name__)


def _copy(outfit, weather, notification_id: str, lang: str = "en") -> Push:
    """Push copy in the user's language (en | hi)."""
    hi = lang == "hi"
    tax = _tax()
    names = [
        (knowledge.label(tax[g.garment_type], lang) if hi else tax[g.garment_type]["label"].lower())
        if g.garment_type in tax
        else g.garment_type.replace("_", " ")
        for g in outfit.garments
    ]
    if hi:
        body = f"{weather.city} में {weather.temp_c:.0f}°C। "
        body += (
            f"आज {' + '.join(names[:2])} पहनकर देखें।"
            if names
            else "आपका लुक तैयार है — देखने के लिए टैप करें।"
        )
        title = "आज का लुक ✨"
    else:
        body = f"{weather.temp_c:.0f}°C in {weather.city}. "
        body += (
            f"Try your {' + '.join(names[:2])} today."
            if names
            else "Your look is ready — tap to see it."
        )
        title = "Today's look ✨"
    return Push(
        title=title,
        body=body,
        data={
            "url": "pehno://outfits/daily",
            "outfit_id": str(outfit.id),
            "notification_id": notification_id,
        },
    )


def _tax() -> dict[str, dict]:
    return {g["slug"]: g for g in knowledge.garment_types()}


async def push_daily_outfits() -> dict:
    sent = skipped = failed = 0
    notifier = get_notifier()
    day_key = today_ist().isoformat()
    async with database.SessionLocal() as db:
        users = (
            (
                await db.execute(
                    select(User).where(
                        User.is_active.is_(True),
                        User.onboarding_complete.is_(True),
                        User.fcm_token.is_not(None),
                    )
                )
            )
            .scalars()
            .all()
        )
        for user in users:
            if not user.wants("daily_outfit"):
                skipped += 1
                continue
            try:
                weather, rows, _hint = await outfit_service.daily(db, user)
                if not rows:
                    skipped += 1
                    continue
                entry = NotificationLog(
                    user_id=user.id, kind="daily_outfit", key=day_key, sent_at=utcnow()
                )
                db.add(entry)
                try:
                    await db.flush()
                except IntegrityError:  # already pushed today (job re-run)
                    await db.rollback()
                    skipped += 1
                    continue
                out = await outfit_service.to_out(db, rows[0])
                if await notifier.send(
                    user.fcm_token, _copy(out, weather, str(entry.id), user.language)
                ):
                    sent += 1
                    analytics.track(user.id, analytics.PUSH_SENT, kind="daily_outfit")
                    await db.commit()
                else:
                    failed += 1
                    await db.rollback()
                    user.fcm_token = None  # unregistered token — stop trying
                    await db.commit()
            except Exception:
                failed += 1
                await db.rollback()
                log.exception("daily push failed for user %s", user.id)
    log.info(
        "daily push: sent=%d skipped=%d failed=%d via %s", sent, skipped, failed, notifier.name
    )
    return {"sent": sent, "skipped": skipped, "failed": failed}


@celery_app.task(name="pehno.push_daily_outfits")
def push_daily_outfits_task() -> dict:
    return run_async(push_daily_outfits())
