import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.types import GUID
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.user import str_enum


class SessionType(str, enum.Enum):
    wardrobe_review = "wardrobe_review"
    occasion_curation = "occasion_curation"
    trip_packing = "trip_packing"


class BookingStatus(str, enum.Enum):
    pending = "pending"  # created, awaiting payment
    confirmed = "confirmed"  # paid
    completed = "completed"
    cancelled = "cancelled"


class StylistBooking(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "stylist_bookings"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    stylist_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    session_type: Mapped[SessionType] = mapped_column(
        str_enum(SessionType, "session_type"), nullable=False
    )
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    status: Mapped[BookingStatus] = mapped_column(
        str_enum(BookingStatus, "booking_status"), nullable=False, default=BookingStatus.pending
    )
    amount_paid: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    platform_commission: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    discount_inr: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    payment_provider: Mapped[str | None] = mapped_column(String(20), nullable=True)
    payment_ref: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    payment_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Payout ledger: none (unpaid/cancelled) → due (session completed) → paid (released to stylist)
    payout_status: Mapped[str] = mapped_column(String(10), nullable=False, default="none")
    payout_paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    payout_ref: Mapped[str | None] = mapped_column(String(80), nullable=True)


class StylistReview(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "stylist_reviews"
    __table_args__ = (UniqueConstraint("booking_id", name="uq_review_per_booking"),)

    booking_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("stylist_bookings.id", ondelete="CASCADE"), nullable=False
    )
    stylist_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
