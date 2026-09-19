import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.types import GUID, JSONColumn
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.user import str_enum


class SubscriptionStatus(str, enum.Enum):
    created = "created"  # checkout not completed yet
    active = "active"
    cancelled = "cancelled"  # will lapse at current_period_end
    halted = "halted"  # payment failures
    expired = "expired"


class Subscription(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "subscriptions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider: Mapped[str] = mapped_column(String(20), nullable=False)  # razorpay | mock
    provider_subscription_id: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    plan: Mapped[str] = mapped_column(String(10), nullable=False)  # plus | pro
    status: Mapped[SubscriptionStatus] = mapped_column(
        str_enum(SubscriptionStatus, "subscription_status"),
        nullable=False,
        default=SubscriptionStatus.created,
    )
    checkout_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    current_period_end: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class BillingEvent(UUIDPrimaryKeyMixin, Base):
    """Every webhook we accepted, keyed by provider event id so replays are no-ops."""

    __tablename__ = "billing_events"
    __table_args__ = (UniqueConstraint("provider", "provider_event_id", name="uq_billing_event"),)

    provider: Mapped[str] = mapped_column(String(20), nullable=False)
    provider_event_id: Mapped[str] = mapped_column(String(120), nullable=False)
    event_type: Mapped[str] = mapped_column(String(60), nullable=False)
    payload: Mapped[dict] = mapped_column(JSONColumn, nullable=False, default=dict)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
