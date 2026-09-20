from datetime import date

from sqlalchemy import Date, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.types import JSONColumn
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Festival(UUIDPrimaryKeyMixin, Base):
    """Legacy snapshot table (Phase 1 schema); the JSON knowledge base is the source of truth."""

    __tablename__ = "festivals"

    name: Mapped[str] = mapped_column(String(80), nullable=False)
    slug: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    date_this_year: Mapped[date] = mapped_column(Date, nullable=False)
    region: Mapped[list[str]] = mapped_column(JSONColumn, nullable=False, default=list)
    color_codes: Mapped[dict] = mapped_column(JSONColumn, nullable=False, default=dict)
    dress_code: Mapped[str] = mapped_column(Text, nullable=False, default="")
    occasion_tags: Mapped[list[str]] = mapped_column(JSONColumn, nullable=False, default=list)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")


class FestivalDateOverride(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    Lunar festival dates shift every year. Admins correct a given year here
    (admin dashboard → Festivals) without touching festivals.json; the service
    merges these over the JSON at startup and after every edit.
    """

    __tablename__ = "festival_date_overrides"
    __table_args__ = (UniqueConstraint("slug", "year", name="uq_festival_year"),)

    slug: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
