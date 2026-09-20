import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.types import JSONColumn
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Gender(str, enum.Enum):
    female = "female"
    male = "male"
    other = "other"


class BodyType(str, enum.Enum):
    # shared
    regular = "regular"
    tall = "tall"
    plus = "plus"
    # women
    petite = "petite"
    # men
    slim = "slim"
    athletic = "athletic"
    broad = "broad"


class SkinTone(str, enum.Enum):
    fair = "fair"
    wheatish = "wheatish"
    medium = "medium"
    dark = "dark"


class SubscriptionTier(str, enum.Enum):
    free = "free"
    plus = "plus"
    pro = "pro"


def str_enum(e: type[enum.Enum], name: str) -> Enum:
    """
    VARCHAR + CHECK on every dialect (no CREATE TYPE on Postgres), so adding
    a value later is a plain ALTER rather than an enum migration.
    """
    return Enum(
        e, name=name, native_enum=False, length=20, values_callable=lambda x: [m.value for m in x]
    )


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    phone: Mapped[str] = mapped_column(String(16), unique=True, nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    city: Mapped[str] = mapped_column(String(80), nullable=False, default="Mumbai")
    gender: Mapped[Gender] = mapped_column(
        str_enum(Gender, "gender"), nullable=False, default=Gender.female
    )
    body_type: Mapped[BodyType] = mapped_column(
        str_enum(BodyType, "body_type"), nullable=False, default=BodyType.regular
    )
    skin_tone: Mapped[SkinTone] = mapped_column(
        str_enum(SkinTone, "skin_tone"), nullable=False, default=SkinTone.medium
    )
    regional_style: Mapped[str] = mapped_column(
        String(50), nullable=False, default="pan_india_fusion"
    )
    subscription_tier: Mapped[SubscriptionTier] = mapped_column(
        str_enum(SubscriptionTier, "subscription_tier"),
        nullable=False,
        default=SubscriptionTier.free,
    )
    subscription_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    fcm_token: Mapped[str | None] = mapped_column(String(512), nullable=True)
    onboarding_complete: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Social: pre-generate share cards on save (opt-in)
    social_sharing_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Stylist marketplace (weeks 33–37)
    language: Mapped[str] = mapped_column(String(5), nullable=False, default="en")  # en | hi
    # {daily_outfit, festival_alerts, care_reminders, gap_reports}: bool — missing key = on
    notification_prefs: Mapped[dict | None] = mapped_column(JSONColumn, nullable=True)

    def wants(self, kind: str) -> bool:
        """Notification opt-in: daily_outfit | festival_alerts | care_reminders | gap_reports."""
        return bool((self.notification_prefs or {}).get(kind, True))

    is_stylist: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    stylist_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    stylist_bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    stylist_specialties: Mapped[list[str] | None] = mapped_column(JSONColumn, nullable=True)
    stylist_price_per_session: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    stylist_portfolio_urls: Mapped[list[str] | None] = mapped_column(JSONColumn, nullable=True)
    stylist_applied_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    garments = relationship("Garment", back_populates="user", cascade="all, delete-orphan")
    outfits = relationship("Outfit", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship(
        "RefreshToken", back_populates="user", cascade="all, delete-orphan"
    )
