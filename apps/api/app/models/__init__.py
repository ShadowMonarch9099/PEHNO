"""
ORM models. Import everything here so Alembic autogenerate and
Base.metadata.create_all see the full schema.
"""
from app.models.auth import OtpCode, RefreshToken
from app.models.billing import BillingEvent, Subscription
from app.models.feedback import ClassificationFeedback
from app.models.festival import Festival
from app.models.garment import Garment
from app.models.notification import NotificationLog
from app.models.outfit import Outfit
from app.models.user import User

__all__ = [
    "User",
    "OtpCode",
    "RefreshToken",
    "Garment",
    "Outfit",
    "Festival",
    "ClassificationFeedback",
    "NotificationLog",
    "Subscription",
    "BillingEvent",
]
