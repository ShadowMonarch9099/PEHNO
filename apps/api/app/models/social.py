import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.types import GUID
from app.models.base import Base, UUIDPrimaryKeyMixin


class OutfitLike(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "outfit_likes"
    __table_args__ = (UniqueConstraint("outfit_id", "user_id", name="uq_outfit_like"),)

    outfit_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("outfits.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
