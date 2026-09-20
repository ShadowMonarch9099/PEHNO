import uuid
from datetime import datetime

from pydantic import BaseModel, Field, HttpUrl

from app.models.stylist import BookingStatus, SessionType
from app.schemas.common import APIModel, Money, UTCDateTime
from app.schemas.garment import GarmentOut


class ReviewOut(APIModel):
    id: uuid.UUID
    rating: int
    comment: str | None
    reviewer_first_name: str
    created_at: UTCDateTime


class StylistOut(BaseModel):
    """Public profile — phone/email never leave the server."""

    id: uuid.UUID
    name: str
    city: str
    bio: str | None
    specialties: list[str]
    price_per_session_inr: Money
    portfolio_urls: list[str]
    rating: float | None
    review_count: int
    sessions_completed: int
    session_types: list[dict]  # [{slug, label}]
    quote: dict | None = None  # {amount_inr, discount_inr, pro_discount_applied} for the viewer
    reviews: list[ReviewOut] = []


class StylistApplyIn(BaseModel):
    bio: str = Field(min_length=40, max_length=1500)
    specialties: list[str] = Field(min_length=1, max_length=5)
    price_per_session_inr: float = Field(ge=199, le=50000)
    portfolio_urls: list[HttpUrl] = Field(default_factory=list, max_length=8)


class StylistProfileOut(BaseModel):
    """The applicant's own view: verification state included."""

    is_stylist: bool
    verified: bool
    bio: str | None
    specialties: list[str]
    price_per_session_inr: Money | None
    portfolio_urls: list[str]
    applied_at: UTCDateTime | None


class BookIn(BaseModel):
    stylist_id: uuid.UUID
    session_type: SessionType
    scheduled_at: datetime
    notes: str | None = Field(default=None, max_length=1000)


class BookingOut(APIModel):
    id: uuid.UUID
    stylist_id: uuid.UUID
    stylist_name: str
    client_first_name: str
    session_type: SessionType
    session_label: str
    scheduled_at: UTCDateTime
    duration_minutes: int
    status: BookingStatus
    amount_inr: Money
    discount_inr: Money
    platform_commission_inr: Money | None = None  # stylists see their cut, clients don't
    stylist_payout_inr: Money | None = None
    notes: str | None
    payment_url: str | None
    paid_at: UTCDateTime | None
    completed_at: UTCDateTime | None
    cancelled_at: UTCDateTime | None
    reviewed: bool
    created_at: UTCDateTime


class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1000)


class ClientWardrobeOut(BaseModel):
    """What a stylist can see during a confirmed session: first name, city, garments."""

    booking_id: uuid.UUID
    client_first_name: str
    city: str
    regional_style: str
    notes: str | None
    garments: list[GarmentOut]
