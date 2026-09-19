import enum
import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.types import GUID, JSONColumn
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.user import str_enum


class GarmentCondition(str, enum.Enum):
    new = "new"
    good = "good"
    worn = "worn"


class ClassificationStatus(str, enum.Enum):
    pending = "pending"
    complete = "complete"
    failed = "failed"


class Garment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "garments"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Image: storage keys; URLs are resolved by the storage backend at read time.
    image_key: Mapped[str] = mapped_column(String(512), nullable=False)
    thumbnail_key: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # Classification (AI-filled, user-correctable)
    garment_type: Mapped[str] = mapped_column(String(50), nullable=False, default="unknown")
    fabric_type: Mapped[str] = mapped_column(String(50), nullable=False, default="unknown")
    color_primary: Mapped[str] = mapped_column(String(30), nullable=False, default="unknown")
    color_accent: Mapped[str | None] = mapped_column(String(30), nullable=True)
    occasion_tags: Mapped[list[str]] = mapped_column(JSONColumn, nullable=False, default=list)
    season_tags: Mapped[list[str]] = mapped_column(JSONColumn, nullable=False, default=list)
    regional_style: Mapped[str | None] = mapped_column(String(50), nullable=True)
    ai_confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    classification_status: Mapped[ClassificationStatus] = mapped_column(
        str_enum(ClassificationStatus, "classification_status"),
        nullable=False,
        default=ClassificationStatus.pending,
    )
    user_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    care_profile: Mapped[dict] = mapped_column(JSONColumn, nullable=False, default=dict)
    # Snapshot of what the model said (labels, candidates, backend) — survives user edits
    # so corrections can be diffed against the original prediction.
    ai_labels: Mapped[dict | None] = mapped_column(JSONColumn, nullable=True)
    classified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # User metadata
    purchase_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    purchase_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    condition: Mapped[GarmentCondition] = mapped_column(
        str_enum(GarmentCondition, "garment_condition"),
        nullable=False,
        default=GarmentCondition.good,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Wear tracking
    wear_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_worn_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Care tracking (weeks 20–21): wears since the last clean drive reminders
    wears_since_care: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_cared_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    care_reminders_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    user = relationship("User", back_populates="garments")
