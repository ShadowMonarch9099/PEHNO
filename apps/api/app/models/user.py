import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Gender(str, enum.Enum):
    female = "female"
    male = "male"
    other = "other"


class BodyType(str, enum.Enum):
    petite = "petite"
    regular = "regular"
    tall = "tall"
    plus = "plus"


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

    garments = relationship("Garment", back_populates="user", cascade="all, delete-orphan")
    outfits = relationship("Outfit", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship(
        "RefreshToken", back_populates="user", cascade="all, delete-orphan"
    )
