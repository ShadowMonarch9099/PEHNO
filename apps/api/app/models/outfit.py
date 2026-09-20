import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.types import GUID, JSONColumn
from app.models.base import Base, UUIDPrimaryKeyMixin


class Outfit(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "outfits"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    garment_ids: Mapped[list[str]] = mapped_column(JSONColumn, nullable=False, default=list)
    occasion: Mapped[str] = mapped_column(String(50), nullable=False)
    weather_condition: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    temperature_celsius: Mapped[int] = mapped_column(Integer, nullable=False, default=25)
    season: Mapped[str] = mapped_column(String(20), nullable=False, default="transition")
    weather_source: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    festival: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # Options generated together share a batch_id (e.g. the 3 answers to one request).
    batch_id: Mapped[uuid.UUID | None] = mapped_column(GUID, nullable=True, index=True)
    score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    rationale: Mapped[list[str]] = mapped_column(JSONColumn, nullable=False, default=list)
    for_date: Mapped[str | None] = mapped_column(
        String(10), nullable=True
    )  # YYYY-MM-DD for daily looks
    is_daily: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_saved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # Spec (wk 8-9) asks for like/dislike feedback: -1 dislike, +1 like, NULL = no feedback.
    feedback: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rating: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )  # 1–5 (spec: /outfits/{id}/rate)
    worn_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Social (weeks 29–32): nothing is public until the owner shares explicitly
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    shared_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    share_slug: Mapped[str | None] = mapped_column(
        String(16), nullable=True, unique=True, index=True
    )
    share_card_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    like_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    user = relationship("User", back_populates="outfits")
