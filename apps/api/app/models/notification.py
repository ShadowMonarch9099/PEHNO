import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.types import GUID
from app.models.base import Base, UUIDPrimaryKeyMixin


class NotificationLog(UUIDPrimaryKeyMixin, Base):
    """Every push we sent, keyed so scheduled jobs never send the same alert twice."""

    __tablename__ = "notification_log"
    __table_args__ = (UniqueConstraint("user_id", "kind", "key", name="uq_notification_once"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    kind: Mapped[str] = mapped_column(
        String(40), nullable=False
    )  # daily_outfit | festival_alert | care_reminder
    key: Mapped[str] = mapped_column(String(120), nullable=False)  # e.g. "diwali:2026:14"
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
