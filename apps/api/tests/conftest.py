"""
Test fixtures: fresh in-memory SQLite per test, app wired to it, and an
authenticated client helper. No external services are touched.
"""
import os

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("DEBUG", "true")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite://")
os.environ.setdefault("JWT_SECRET", "test-secret-key-for-ci-32chars-long")
os.environ.setdefault("OTP_PROVIDER", "console")
os.environ.setdefault("LOCAL_MEDIA_DIR", "./.test-media")
os.environ.setdefault("CLASSIFIER_BACKEND", "rules")
os.environ.setdefault("CELERY_BROKER_URL", "")
os.environ.setdefault("SOCIAL_ENABLED", "true")

import pytest  # noqa: E402
from httpx import AsyncClient  # noqa: E402
from sqlalchemy.ext.asyncio import (  # noqa: E402
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.core import database  # noqa: E402
from app.core.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.routers import auth as auth_router  # noqa: E402


@pytest.fixture
async def engine():
    # StaticPool: one connection shared across the test so :memory: persists.
    eng = create_async_engine(
        "sqlite+aiosqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest.fixture
async def db(engine) -> AsyncSession:
    async with async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)() as s:
        yield s


@pytest.fixture
async def client(engine, monkeypatch):
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def _override_db():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = _override_db
    # Background jobs open their own session; point them at the test engine.
    monkeypatch.setattr(database, "SessionLocal", session_factory)
    for limiter in (
        auth_router.send_limiter_phone,
        auth_router.send_limiter_ip,
        auth_router.verify_limiter_ip,
    ):
        limiter.reset()
    async with AsyncClient(app=app, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


async def login(client: AsyncClient, phone: str = "9876543210") -> dict:
    """Full OTP flow; returns the token payload."""
    r = await client.post("/auth/send-otp", json={"phone": phone})
    assert r.status_code == 200, r.text
    otp = r.json()["dev_otp"]
    r = await client.post("/auth/verify-otp", json={"phone": phone, "otp": otp})
    assert r.status_code == 200, r.text
    return r.json()


def auth_headers(tokens: dict) -> dict:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


async def upgrade(client: AsyncClient, headers: dict, plan: str = "plus") -> dict:
    """Subscribe + simulate provider activation (mock billing provider)."""
    r = await client.post("/billing/subscribe", json={"plan": plan}, headers=headers)
    assert r.status_code == 201, r.text
    r = await client.post("/billing/dev/activate", headers=headers)
    assert r.status_code == 200, r.text
    return r.json()
