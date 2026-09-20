import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.types import GUID, JSONColumn
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.user import str_enum


class BrandStatus(str, enum.Enum):
    prospect = "prospect"
    active = "active"
    paused = "paused"


class CampaignKind(str, enum.Enum):
    challenge = "challenge"  # "style N outfits with …" — users join and submit outfits
    collection = "collection"  # curated products surfaced to a segment


class CampaignStatus(str, enum.Enum):
    draft = "draft"
    live = "live"
    ended = "ended"


class CampaignEventType(str, enum.Enum):
    view = "view"
    join = "join"
    submit = "submit"  # an outfit counted toward a challenge
    complete = "complete"
    click = "click"  # product / CTA click-through


class BrandPartner(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "brand_partners"

    name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
    slug: Mapped[str] = mapped_column(String(80), nullable=False, unique=True, index=True)
    status: Mapped[BrandStatus] = mapped_column(
        str_enum(BrandStatus, "brand_status"), nullable=False, default=BrandStatus.prospect
    )
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    tagline: Mapped[str | None] = mapped_column(String(160), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)


class BrandCampaign(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    `config` (JSON) — see schemas.brand.CampaignConfig:
      description, hero_image_url, cta_url, hashtag, reward_text,
      target {cities, tiers, regional_styles, genders},
      products [{name, url, price_inr, image_url, garment_type, color}],
      challenge {goal, occasion, garment_types, fabrics, brand_match}
    """

    __tablename__ = "brand_campaigns"

    brand_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("brand_partners.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    kind: Mapped[str] = mapped_column(String(30), nullable=False, default="challenge")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    config: Mapped[dict] = mapped_column(JSONColumn, nullable=False, default=dict)


class CampaignEntry(UUIDPrimaryKeyMixin, Base):
    """A user's participation in a challenge."""

    __tablename__ = "campaign_entries"
    __table_args__ = (UniqueConstraint("campaign_id", "user_id", name="uq_campaign_entry"),)

    campaign_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("brand_campaigns.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    progress: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    outfit_ids: Mapped[list[str]] = mapped_column(JSONColumn, nullable=False, default=list)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class CampaignEvent(UUIDPrimaryKeyMixin, Base):
    """Performance tracking: one row per view / join / submit / complete / click."""

    __tablename__ = "campaign_events"

    campaign_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("brand_campaigns.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    event: Mapped[CampaignEventType] = mapped_column(
        str_enum(CampaignEventType, "campaign_event_type"), nullable=False, index=True
    )
    meta: Mapped[dict | None] = mapped_column(JSONColumn, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
