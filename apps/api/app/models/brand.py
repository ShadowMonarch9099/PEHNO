import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.types import GUID, JSONColumn
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.user import str_enum


class BrandStatus(str, enum.Enum):
    prospect = "prospect"
    active = "active"
    paused = "paused"


class BrandPartner(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Phase 2 scaffold (schema only); campaigns/challenges arrive in Phase 3 weeks 46–48."""

    __tablename__ = "brand_partners"

    name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
    slug: Mapped[str] = mapped_column(String(80), nullable=False, unique=True, index=True)
    status: Mapped[BrandStatus] = mapped_column(
        str_enum(BrandStatus, "brand_status"), nullable=False, default=BrandStatus.prospect
    )
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class BrandCampaign(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "brand_campaigns"

    brand_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("brand_partners.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    kind: Mapped[str] = mapped_column(
        String(30), nullable=False, default="challenge"
    )  # challenge | collection
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    config: Mapped[dict] = mapped_column(JSONColumn, nullable=False, default=dict)
