"""
Pydantic v2 Schemas for PEHNO API
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from uuid import UUID
import re


# ── Auth Schemas ───────────────────────────────────────────────────────────────

class SendOtpRequest(BaseModel):
    phone: str = Field(..., pattern=r"^\+91[6-9]\d{9}$", description="Indian phone with +91")

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, v: str) -> str:
        return v.strip()


class VerifyOtpRequest(BaseModel):
    phone: str = Field(..., pattern=r"^\+91[6-9]\d{9}$")
    otp: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class AuthTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    is_new_user: bool


# ── User Schemas ───────────────────────────────────────────────────────────────

class UserUpdateRequest(BaseModel):
    city: Optional[str] = Field(None, max_length=100)
    body_type: Optional[str] = None
    skin_tone: Optional[str] = None
    regional_style: Optional[str] = None
    name: Optional[str] = Field(None, max_length=255)
    gender: Optional[str] = None
    fcm_token: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    phone: str
    email: Optional[str] = None
    name: str
    city: str
    gender: str
    body_type: str
    skin_tone: str
    regional_style: str
    subscription_tier: str
    subscription_expires_at: Optional[datetime] = None
    onboarding_complete: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserStatsResponse(BaseModel):
    wardrobe_count: int
    outfit_count: int
    avg_cost_per_wear: float
    most_worn_garment_type: Optional[str] = None
    total_wardrobe_value: Optional[float] = None


# ── Garment Schemas ────────────────────────────────────────────────────────────

class CareProfileSchema(BaseModel):
    wash: str
    iron: str
    storage: str
    dry_clean: bool = False
    notes: Optional[str] = None


class GarmentUploadResponse(BaseModel):
    garment_id: str
    status: str = "classifying"
    message: str = "Garment uploaded. AI classification in progress..."


class GarmentResponse(BaseModel):
    id: str
    user_id: str
    image_url: str
    thumbnail_url: Optional[str] = None
    garment_type: str
    fabric_type: str
    color_primary: str
    color_accent: Optional[str] = None
    occasion_tags: List[str]
    season_tags: List[str]
    regional_style: Optional[str] = None
    purchase_price: Optional[float] = None
    purchase_date: Optional[date] = None
    condition: str
    wear_count: int
    last_worn_at: Optional[datetime] = None
    ai_confidence: float
    classification_status: str
    user_verified: bool
    care_profile: Dict[str, Any]
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class GarmentUpdateRequest(BaseModel):
    garment_type: Optional[str] = None
    fabric_type: Optional[str] = None
    color_primary: Optional[str] = None
    color_accent: Optional[str] = None
    occasion_tags: Optional[List[str]] = None
    season_tags: Optional[List[str]] = None
    regional_style: Optional[str] = None
    purchase_price: Optional[float] = None
    purchase_date: Optional[date] = None
    condition: Optional[str] = None
    notes: Optional[str] = None
    user_verified: Optional[bool] = None


class WardrobeListResponse(BaseModel):
    items: List[GarmentResponse]
    total: int
    page: int
    page_size: int


# ── Outfit Schemas ─────────────────────────────────────────────────────────────

class OutfitGenerateRequest(BaseModel):
    occasion: str
    festival: Optional[str] = None
    city: Optional[str] = None


class OutfitResponse(BaseModel):
    id: str
    user_id: str
    garment_ids: List[str]
    garments: Optional[List[GarmentResponse]] = None
    occasion: str
    weather_condition: str
    temperature_celsius: int
    festival: Optional[str] = None
    worn_at: Optional[datetime] = None
    rating: Optional[int] = None
    is_saved: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class DailyOutfitResponse(BaseModel):
    outfit: OutfitResponse
    weather: Dict[str, Any]
    reason: str


class OutfitRateRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5)


# ── Weather Schema ─────────────────────────────────────────────────────────────

class WeatherResponse(BaseModel):
    city: str
    temperature_celsius: float
    feels_like: float
    humidity: int
    condition: str
    description: str
    icon: str


# ── Festival Schemas ───────────────────────────────────────────────────────────

class FestivalResponse(BaseModel):
    id: str
    name: str
    slug: str
    date_this_year: date
    region: List[str]
    color_codes: Dict[str, Any]
    dress_code: str
    occasion_tags: List[str]
    description: str

    model_config = {"from_attributes": True}


class UpcomingFestivalResponse(FestivalResponse):
    days_until: int


class NavratriDayResponse(BaseModel):
    day: int
    color_name: str
    color_hex: str
    goddess: str
    is_today: bool
    matching_garments: List[GarmentResponse] = []


class FestivalDetailResponse(FestivalResponse):
    curated_looks: List[OutfitResponse] = []
    navratri_days: Optional[List[NavratriDayResponse]] = None


# ── Generic ────────────────────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str
    success: bool = True
