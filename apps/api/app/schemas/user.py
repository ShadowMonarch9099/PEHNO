import uuid

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.user import BodyType, Gender, SkinTone, SubscriptionTier
from app.schemas.common import APIModel, UTCDateTime

REGIONAL_STYLES = ("rajasthani", "south_indian", "punjabi", "mumbai_minimal", "pan_india_fusion")


class NotificationPrefs(BaseModel):
    daily_outfit: bool = True
    festival_alerts: bool = True
    care_reminders: bool = True
    gap_reports: bool = True


class UserOut(APIModel):
    id: uuid.UUID
    phone: str
    email: str | None
    name: str
    city: str
    gender: Gender
    body_type: BodyType
    skin_tone: SkinTone
    regional_style: str
    subscription_tier: SubscriptionTier
    subscription_expires_at: UTCDateTime | None
    onboarding_complete: bool
    language: str = "en"
    notification_prefs: NotificationPrefs = NotificationPrefs()
    created_at: UTCDateTime

    @field_validator("notification_prefs", mode="before")
    @classmethod
    def _prefs_default(cls, v):
        return NotificationPrefs.model_validate(v or {})  # ORM column is NULL until first edit

    entitlements: dict | None = None


class UserUpdate(BaseModel):
    """PUT /users/me — every field optional; only provided fields change."""

    name: str | None = Field(default=None, max_length=120)
    email: EmailStr | None = None
    city: str | None = Field(default=None, max_length=80)
    gender: Gender | None = None
    body_type: BodyType | None = None
    skin_tone: SkinTone | None = None
    regional_style: str | None = Field(
        default=None, pattern="^(" + "|".join(REGIONAL_STYLES) + ")$"
    )
    fcm_token: str | None = Field(default=None, max_length=512)
    language: str | None = Field(default=None, pattern="^(en|hi)$")
    notification_prefs: NotificationPrefs | None = None
    onboarding_complete: bool | None = None


class UserStats(BaseModel):
    garment_count: int
    outfit_count: int
    total_wears: int
    avg_cost_per_wear: float | None
