from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import settings
from app.core.security import DbSession

router = APIRouter(tags=["health"])


@router.get("/health")
async def health(db: DbSession) -> dict:
    await db.execute(text("SELECT 1"))
    return {
        "status": "ok",
        "service": "pehno-api",
        "version": settings.APP_VERSION,
        "env": settings.APP_ENV,
        "database": "sqlite" if settings.is_sqlite else "postgresql",
    }
