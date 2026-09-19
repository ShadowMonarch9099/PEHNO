import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
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
    festival: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_daily: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_saved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # Spec (wk 8-9) asks for like/dislike feedback: -1 dislike, +1 like, NULL = no feedback.
    feedback: Mapped[int | None] = mapped_column(Integer, nullable=True)
    worn_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user = relationship("User", back_populates="outfits")
