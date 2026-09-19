"""
Async SQLAlchemy engine + session dependency.
"""
from collections.abc import AsyncIterator
from datetime import UTC, datetime

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


def utcnow() -> datetime:
    """Timezone-aware UTC now. Stored naive-UTC in SQLite, tz-aware in Postgres."""
    return datetime.now(UTC)


def _make_engine(url: str):
    if url.startswith("sqlite"):
        engine = create_async_engine(url, echo=False, connect_args={"check_same_thread": False})

        # SQLite doesn't enforce FKs unless told to, per connection.
        @event.listens_for(engine.sync_engine, "connect")
        def _fk_pragma(dbapi_conn, _record):
            dbapi_conn.execute("PRAGMA foreign_keys=ON")

        return engine
    return create_async_engine(url, echo=False, pool_size=10, max_overflow=20, pool_pre_ping=True)


engine = _make_engine(settings.DATABASE_URL)

SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency: one session per request; commits on success."""
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
