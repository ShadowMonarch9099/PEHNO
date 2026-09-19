"""
/notifications — the app reports push opens here (deep-link payload carries notification_id).
"""
import uuid

from fastapi import APIRouter, HTTPException, status

from app.core.database import utcnow
from app.core.security import CurrentUser, DbSession
from app.models.notification import NotificationLog
from app.schemas.common import Message
from app.services import analytics

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.post("/{notification_id}/opened", response_model=Message)
async def opened(notification_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Message:
    entry = await db.get(NotificationLog, notification_id)
    if entry is None or entry.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found")
    if entry.opened_at is None:
        entry.opened_at = utcnow()
        await db.flush()
        analytics.track(user.id, analytics.PUSH_OPENED, kind=entry.kind)
    return Message(message="ok")
