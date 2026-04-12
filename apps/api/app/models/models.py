"""
SQLAlchemy ORM Models for PEHNO
"""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column, String, Boolean, Integer, Float, Numeric,
    DateTime, Date, ForeignKey, Text, JSON, Enum as SqlEnum
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


# ── Enums ──────────────────────────────────────────────────────────────────────

class GenderEnum(enum.Enum):
    female = "female"
    male = "male"
    other = "other"


class BodyTypeEnum(enum.Enum):
    petite = "petite"
    regular = "regular"
    tall = "tall"
    plus = "plus"


class SkinToneEnum(enum.Enum):
    fair = "fair"
    wheatish = "wheatish"
    medium = "medium"
    dark = "dark"


class SubscriptionTierEnum(enum.Enum):
    free = "free"
    plus = "plus"
    pro = "pro"


class GarmentConditionEnum(enum.Enum):
    new = "new"
    good = "good"
    worn = "worn"


# ── User Model ─────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    phone = Column(String(20), unique=True, nullable=False, index=True)
    email = Column(String(255), nullable=True)
    name = Column(String(255), nullable=False, default="")
    city = Column(String(100), nullable=False, default="Mumbai")
    gender = Column(SqlEnum(GenderEnum), nullable=False, default=GenderEnum.female)
    body_type = Column(SqlEnum(BodyTypeEnum), nullable=False, default=BodyTypeEnum.regular)
    skin_tone = Column(SqlEnum(SkinToneEnum), nullable=False, default=SkinToneEnum.medium)
    regional_style = Column(String(100), nullable=False, default="pan_india_fusion")
    subscription_tier = Column(SqlEnum(SubscriptionTierEnum), nullable=False, default=SubscriptionTierEnum.free)
    subscription_expires_at = Column(DateTime, nullable=True)
    fcm_token = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    onboarding_complete = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    garments = relationship("Garment", back_populates="user", cascade="all, delete-orphan")
    outfits = relationship("Outfit", back_populates="user", cascade="all, delete-orphan")


# ── OTP Store ──────────────────────────────────────────────────────────────────

class OtpStore(Base):
    __tablename__ = "otp_store"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone = Column(String(20), nullable=False, index=True)
    otp_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


# ── Garment Model ──────────────────────────────────────────────────────────────

class Garment(Base):
    __tablename__ = "garments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url = Column(String(2000), nullable=False)
    thumbnail_url = Column(String(2000), nullable=True)
    garment_type = Column(String(100), nullable=False, default="unknown")
    fabric_type = Column(String(100), nullable=False, default="unknown")
    color_primary = Column(String(50), nullable=False, default="unknown")
    color_accent = Column(String(50), nullable=True)
    occasion_tags = Column(ARRAY(Text), nullable=False, default=[])
    season_tags = Column(ARRAY(Text), nullable=False, default=[])
    regional_style = Column(String(100), nullable=True)
    purchase_price = Column(Numeric(10, 2), nullable=True)
    purchase_date = Column(Date, nullable=True)
    condition = Column(SqlEnum(GarmentConditionEnum), nullable=False, default=GarmentConditionEnum.good)
    wear_count = Column(Integer, nullable=False, default=0)
    last_worn_at = Column(DateTime, nullable=True)
    ai_confidence = Column(Float, nullable=False, default=0.0)
    classification_status = Column(String(50), nullable=False, default="pending")
    user_verified = Column(Boolean, nullable=False, default=False)
    care_profile = Column(JSON, nullable=False, default={})
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="garments")


# ── Outfit Model ───────────────────────────────────────────────────────────────

class Outfit(Base):
    __tablename__ = "outfits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    garment_ids = Column(ARRAY(UUID(as_uuid=True)), nullable=False)
    occasion = Column(String(100), nullable=False)
    weather_condition = Column(String(100), nullable=False, default="")
    temperature_celsius = Column(Integer, nullable=False, default=25)
    festival = Column(String(100), nullable=True)
    worn_at = Column(DateTime, nullable=True)
    rating = Column(Integer, nullable=True)
    is_saved = Column(Boolean, nullable=False, default=False)
    is_daily = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="outfits")


# ── Festival Model ─────────────────────────────────────────────────────────────

class Festival(Base):
    __tablename__ = "festivals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    date_this_year = Column(Date, nullable=False)
    region = Column(ARRAY(Text), nullable=False, default=[])
    color_codes = Column(JSON, nullable=False, default={})
    dress_code = Column(Text, nullable=False)
    occasion_tags = Column(ARRAY(Text), nullable=False, default=[])
    description = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
