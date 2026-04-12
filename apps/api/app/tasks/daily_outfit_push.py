"""
Celery Task — Daily outfit push notification at 7:30 AM IST
"""
import asyncio
import logging
from app.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.daily_outfit_push.push_daily_outfits")
def push_daily_outfits():
    """
    Generate daily outfits and send push notifications to all active users.
    Runs every morning at 7:30 AM IST (2:00 AM UTC).
    """
    asyncio.run(_push_to_all_users())


async def _push_to_all_users():
    """Send daily outfit push to all active users."""
    from app.core.database import AsyncSessionLocal
    from app.models.models import User, Garment, Outfit
    from app.services.weather_service import WeatherService
    from app.services.outfit_engine import OutfitEngine
    from sqlalchemy import select
    from datetime import datetime, date

    weather_service = WeatherService()

    async with AsyncSessionLocal() as db:
        # Get all active users with FCM tokens
        users_result = await db.execute(
            select(User).where(
                User.is_active == True,
                User.fcm_token.isnot(None),
                User.onboarding_complete == True,
            )
        )
        users = users_result.scalars().all()

        logger.info(f"Sending daily outfit push to {len(users)} users")

        for user in users:
            try:
                # Get weather for user's city
                weather = await weather_service.get_weather(user.city)

                # Get user's classified garments
                garments_result = await db.execute(
                    select(Garment).where(
                        Garment.user_id == user.id,
                        Garment.classification_status == "complete",
                    )
                )
                garments = garments_result.scalars().all()

                if not garments:
                    continue

                # Generate outfit
                engine = OutfitEngine(garments=list(garments), weather=weather)
                garment_ids, reason = engine.generate_daily()

                if garment_ids:
                    # Save daily outfit
                    outfit = Outfit(
                        user_id=user.id,
                        garment_ids=garment_ids,
                        occasion="casual",
                        weather_condition=weather.get("condition", ""),
                        temperature_celsius=int(weather.get("temperature_celsius", 25)),
                        is_daily=True,
                    )
                    db.add(outfit)
                    await db.flush()

                    # Send FCM push notification
                    temp = weather.get("temperature_celsius", 28)
                    condition = weather.get("condition", "pleasant")
                    await _send_fcm_push(
                        token=user.fcm_token,
                        title="Good morning! Here's your outfit for today ☀️",
                        body=f"Perfect for {int(temp)}°C {condition.lower()} weather — ready for the day!",
                        data={
                            "screen": "DailyLookScreen",
                            "outfit_id": str(outfit.id),
                            "deep_link": f"outfit://daily/{outfit.id}",
                        },
                    )

            except Exception as e:
                logger.error(f"Failed daily push for user {user.id}: {e}")
                continue

        await db.commit()
        logger.info("Daily outfit push completed")


async def _send_fcm_push(token: str, title: str, body: str, data: dict = None):
    """Send FCM push notification."""
    try:
        import firebase_admin
        from firebase_admin import messaging
        import json
        from app.core.config import settings

        # Initialize Firebase if not already done
        if not firebase_admin._apps:
            import firebase_admin
            from firebase_admin import credentials
            if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
                cred_dict = json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)

        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data=data or {},
            token=token,
            android=messaging.AndroidConfig(priority="high"),
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(sound="default", badge=1)
                )
            ),
        )
        messaging.send(message)
        logger.info(f"FCM push sent to {token[:20]}...")

    except Exception as e:
        logger.error(f"FCM push failed: {e}")
