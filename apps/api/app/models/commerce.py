import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.types import GUID
from app.models.base import Base, UUIDPrimaryKeyMixin
from app.models.user import str_enum


class AffiliatePlatform(str, enum.Enum):
    myntra = "myntra"
    ajio = "ajio"
    nykaa = "nykaa"
    meesho = "meesho"


class AffiliateClick(UUIDPrimaryKeyMixin, Base):
    """One row per outbound affiliate click. `id` doubles as the network subid for postbacks."""

    __tablename__ = "affiliate_clicks"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    garment_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID, ForeignKey("garments.id", ondelete="SET NULL"), nullable=True
    )
    gap_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # the gap being filled
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)
    fabric: Mapped[str | None] = mapped_column(String(30), nullable=True)
    platform: Mapped[AffiliatePlatform] = mapped_column(
        str_enum(AffiliatePlatform, "affiliate_platform"), nullable=False, index=True
    )
    product_url: Mapped[str] = mapped_column(Text, nullable=False)
    affiliate_url: Mapped[str] = mapped_column(Text, nullable=False)
    clicked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    converted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    converted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    order_value_inr: Mapped[int | None] = mapped_column(Integer, nullable=True)
    commission_inr: Mapped[int | None] = mapped_column(Integer, nullable=True)
