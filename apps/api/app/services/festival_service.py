"""
Festival lookups for the engine. Full festival features (dates, alerts, curated
looks, Navratri tracker) arrive in weeks 10–11; this is the minimal contract
the outfit engine needs now.
"""
from sqlalchemy.ext.asyncio import AsyncSession

from app import knowledge
from app.services.outfit_engine import FestivalContext


def _by_slug(slug: str) -> dict | None:
    return next((f for f in knowledge.festivals() if f["slug"] == slug), None)


async def festival_context(db: AsyncSession, slug: str) -> FestivalContext | None:  # noqa: ARG001 (db reserved for DB-backed dates)
    f = _by_slug(slug)
    if not f:
        return None
    return FestivalContext(
        slug=f["slug"],
        name=f["name"],
        colors=list(f.get("colors", [])),
        occasion_tags=[t for t in f.get("occasion_tags", []) if t in knowledge.occasion_slugs()]
        or ["festival"],
    )
