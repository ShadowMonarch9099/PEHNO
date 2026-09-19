from datetime import date

from sqlalchemy import Date, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.types import JSONColumn
from app.models.base import Base, UUIDPrimaryKeyMixin


class Festival(UUIDPrimaryKeyMixin, Base):
    """Seeded from packages/ai/data/festivals.json; the JSON is the source of truth."""

    __tablename__ = "festivals"

    name: Mapped[str] = mapped_column(String(80), nullable=False)
    slug: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    date_this_year: Mapped[date] = mapped_column(Date, nullable=False)
    region: Mapped[list[str]] = mapped_column(JSONColumn, nullable=False, default=list)
    color_codes: Mapped[dict] = mapped_column(JSONColumn, nullable=False, default=dict)
    dress_code: Mapped[str] = mapped_column(Text, nullable=False, default="")
    occasion_tags: Mapped[list[str]] = mapped_column(JSONColumn, nullable=False, default=list)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
