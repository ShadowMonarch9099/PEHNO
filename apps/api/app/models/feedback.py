import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.types import GUID, JSONColumn
from app.models.base import Base, UUIDPrimaryKeyMixin


class ClassificationFeedback(UUIDPrimaryKeyMixin, Base):
    """
    One row per user correction of an AI label. This is the retraining dataset:
    (image, field, what the model said, what the user said).
    """

    __tablename__ = "classification_feedback"

    garment_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("garments.id", ondelete="SET NULL"), nullable=True, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    image_key: Mapped[str] = mapped_column(String(512), nullable=False)
    field: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    ai_value: Mapped[dict | list | str | None] = mapped_column(JSONColumn, nullable=True)
    user_value: Mapped[dict | list | str | None] = mapped_column(JSONColumn, nullable=True)
    ai_confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    backend: Mapped[str] = mapped_column(String(40), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
