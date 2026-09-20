"""
ORM models. Import everything here so Alembic autogenerate and
Base.metadata.create_all see the full schema.
"""
from app.models.auth import OtpCode, RefreshToken
from app.models.billing import BillingEvent, Subscription
from app.models.brand import BrandCampaign, BrandPartner, CampaignEntry, CampaignEvent
from app.models.commerce import AffiliateClick
from app.models.feedback import ClassificationFeedback
from app.models.festival import Festival, FestivalDateOverride
from app.models.garment import Garment
from app.models.notification import NotificationLog
from app.models.outfit import Outfit
from app.models.social import OutfitLike
from app.models.stylist import StylistBooking, StylistReview
from app.models.travel import TravelPlan
from app.models.user import User

__all__ = [
    "User",
    "OtpCode",
    "RefreshToken",
    "Garment",
    "Outfit",
    "Festival",
    "FestivalDateOverride",
    "ClassificationFeedback",
    "NotificationLog",
    "Subscription",
    "BillingEvent",
    "AffiliateClick",
    "BrandPartner",
    "BrandCampaign",
    "CampaignEntry",
    "CampaignEvent",
    "OutfitLike",
    "StylistBooking",
    "StylistReview",
    "TravelPlan",
]
