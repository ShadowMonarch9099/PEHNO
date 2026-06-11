"""
Celery Task — Festival alert push notifications
Runs daily at 9:00 AM IST — alerts at 14, 7, and 1 day(s) before festival
"""
import asyncio
import logging
from datetime import date, timedelta
from app.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.festival_alert.send_festival_alerts")
def send_festival_alerts():
    """Send proactive festival alerts to users at 14, 7, and 1 day before."""
    asyncio.run(_send_alerts())


async def _send_alerts():
    from app.core.database import AsyncSessionLocal
    from app.models.models import User, Festival
    from app.services.festival_service import FestivalService
    from app.tasks.daily_outfit_push import _send_fcm_push
    from sqlalchemy import select

    today = date.today()
    alert_days = [14, 7, 1]

    festival_service = FestivalService()

    async with AsyncSessionLocal() as db:
        # Get all upcoming festivals within 14 days
        upcoming_dates = [today + timedelta(days=d) for d in alert_days]
        festivals_result = await db.execute(
            select(Festival).where(Festival.date_this_year.in_(upcoming_dates))
        )
        festivals = festivals_result.scalars().all()

        if not festivals:
            logger.info("No festival alerts to send today")
            return

        # Get users with FCM tokens
        users_result = await db.execute(
            select(User).where(
                User.is_active == True,
                User.fcm_token.isnot(None),
                User.onboarding_complete == True,
            )
        )
        users = users_result.scalars().all()

        for festival in festivals:
            days_until = (festival.date_this_year - today).days
            message = festival_service.get_festival_alert_message(festival.name, days_until)

            for user in users:
                # Check if festival is relevant for user's region
                if not _is_festival_relevant(festival, user.city):
                    continue

                try:
                    await _send_fcm_push(
                        token=user.fcm_token,
                        title=message["title"],
                        body=message["body"],
                        data={
                            "screen": "FestivalDetailScreen",
                            "festival_slug": festival.slug,
                            "deep_link": f"festival://detail/{festival.slug}",
                        },
                    )
                except Exception as e:
                    logger.error(f"Festival alert failed for user {user.id}: {e}")

        logger.info(f"Festival alerts sent for {len(festivals)} festival(s)")


def _is_festival_relevant(festival, city: str) -> bool:
    """Check if a festival is applicable for the user's city/region."""
    from app.routers.festivals import _city_to_region
    user_region = _city_to_region(city)

    festival_regions = festival.region or []
    if "pan_india" in festival_regions or not festival_regions:
        return True
    if user_region in festival_regions:
        return True

    return False
