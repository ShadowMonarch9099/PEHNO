import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.types import GUID, JSONColumn
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class TravelPlan(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A generated packing list. `result` is the full serialised plan (garment ids,
    per-slot looks, gaps) so it re-renders without recomputing."""

    __tablename__ = "travel_plans"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    destination: Mapped[str] = mapped_column(String(80), nullable=False)
    destination_slug: Mapped[str] = mapped_column(String(80), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    activities: Mapped[list[str]] = mapped_column(JSONColumn, nullable=False, default=list)
    max_items: Mapped[int] = mapped_column(Integer, nullable=False, default=15)
    item_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    look_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    result: Mapped[dict] = mapped_column(JSONColumn, nullable=False, default=dict)
