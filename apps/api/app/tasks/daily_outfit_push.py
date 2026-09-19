"""
Morning "Today's look" push (07:30 IST by default). Generates each user's daily
outfit and sends a notification deep-linking to it.
"""
import logging

from sqlalchemy import select

from app.core import database
from app.models.user import User
from app.services import outfit_service
from app.services.notifications import Push, get_notifier
from app.tasks import celery_app, run_async

log = logging.getLogger(__name__)


def _copy(outfit, weather) -> Push:
    names = (
        [g.garment_type.replace("_", " ") for g in outfit.garments]
        if hasattr(outfit, "garments")
        else []
    )
    body = f"{weather.temp_c:.0f}°C in {weather.city}. "
    body += (
        "Your look is ready — tap to see it."
        if not names
        else f"Try your {' + '.join(names[:2])} today."
    )
    return Push(
        title="Today's look ✨",
        body=body,
        data={"url": "pehno://outfits/daily", "outfit_id": str(outfit.id)},
    )


async def push_daily_outfits() -> dict:
    sent = skipped = failed = 0
    notifier = get_notifier()
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
            try:
                weather, rows, hint = await outfit_service.daily(db, user)
                if not rows:
                    skipped += 1
                    continue
                out = await outfit_service.to_out(db, rows[0])
                ok = await notifier.send(user.fcm_token, _copy(out, weather))
                if ok:
                    sent += 1
                else:
                    failed += 1
                    user.fcm_token = None  # unregistered token — stop trying
            except Exception:
                failed += 1
                log.exception("daily push failed for user %s", user.id)
        await db.commit()
    log.info(
        "daily push: sent=%d skipped=%d failed=%d via %s", sent, skipped, failed, notifier.name
    )
    return {"sent": sent, "skipped": skipped, "failed": failed}


@celery_app.task(name="pehno.push_daily_outfits")
def push_daily_outfits_task() -> dict:
    return run_async(push_daily_outfits())
