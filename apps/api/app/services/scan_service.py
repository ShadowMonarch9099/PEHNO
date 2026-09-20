"""
Shopping scan mode: "Does this work with what I own?"

Reuses the garment classifier (never a second model), then treats the scanned
item as a hypothetical garment in the user's combination graph:
  - pairs_with          existing pieces it forms valid outfits with
  - new_outfits         distinct outfits it would unlock
  - compatibility 0–100 how much of the wardrobe it plays with
  - duplicate           a very similar piece already owned
  - weather_note        fabric vs the season in the user's city
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field

from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import knowledge
from app.models.garment import ClassificationStatus, Garment
from app.models.user import User
from app.services import analytics
from app.services.classifier import ClassificationResult, classify_image
from app.services.gap_analyzer import outfit_sets, suits
from app.services.image_service import process_garment_image
from app.services.outfit_engine import role_of
from app.services.weather import get_weather


@dataclass
class ScanResult:
    garment_type: str
    fabric_type: str
    color_primary: str
    color_accent: str | None
    confidence: float
    occasion_tags: list[str]
    season_tags: list[str]
    compatibility: int  # 0–100
    pairs_with: list[Garment]
    new_outfits: int
    wardrobe_size: int
    duplicate: Garment | None
    duplicate_reason: str | None
    weather_note: str
    verdict: str  # "buy" | "maybe" | "skip"
    rationale: list[str] = field(default_factory=list)


def _hypothetical(r: ClassificationResult) -> Garment:
    return Garment(
        id=uuid.uuid4(),
        image_key="scan",
        garment_type=r.garment_type,
        fabric_type=r.fabric_type,
        color_primary=r.color_primary,
        color_accent=r.color_accent,
        occasion_tags=r.occasion_tags,
        season_tags=r.season_tags,
        classification_status=ClassificationStatus.complete,
    )


def find_duplicate(item: Garment, wardrobe: list[Garment]) -> tuple[Garment | None, str | None]:
    """Same type + same primary colour is 'very similar'; same fabric too is 'near-identical'."""
    best: tuple[int, Garment] | None = None
    for g in wardrobe:
        if g.garment_type != item.garment_type or g.color_primary != item.color_primary:
            continue
        score = 2 + (
            1 if g.fabric_type == item.fabric_type and item.fabric_type != "unknown" else 0
        )
        if best is None or score > best[0]:
            best = (score, g)
    if best is None:
        return None, None
    score, g = best
    colour = g.color_primary.replace("_", " ")
    gtype = g.garment_type.replace("_", " ")
    if score == 3:
        return (
            g,
            f"You already own a near-identical {colour} {g.fabric_type.replace('_', ' ')} {gtype}.",
        )
    return g, f"You already own a very similar {colour} {gtype}."


def analyse(item: Garment, wardrobe: list[Garment]) -> tuple[int, list[Garment], int]:
    """(compatibility, pairs_with, new_outfits) for a hypothetical garment."""
    usable = [g for g in wardrobe if g.garment_type not in ("unknown", "other")]
    occasions = [o["slug"] for o in knowledge.occasions()]
    before: set[frozenset[str]] = set()
    after: set[frozenset[str]] = set()
    for o in occasions:
        before |= outfit_sets(usable, o)
        after |= outfit_sets(usable + [item], o)
    new_sets = after - before
    partner_ids = {gid for s in new_sets for gid in s if gid != str(item.id)}
    pairs = [g for g in usable if str(g.id) in partner_ids]

    role = role_of(item)
    partner_roles = {
        "top": {"bottom"},
        "bottom": {"top"},
        "layer": {"top", "full"},
        "full": {"layer"},
    }.get(role, set())
    candidates = [
        g
        for g in usable
        if role_of(g) in partner_roles and any(suits(g, o) and suits(item, o) for o in occasions)
    ]
    coverage = len(pairs) / len(candidates) if candidates else (1.0 if role == "full" else 0.0)
    # Score: how much of the eligible wardrobe it plays with, boosted by how many looks it adds.
    compat = round(100 * min(1.0, 0.7 * coverage + 0.3 * min(1.0, len(new_sets) / 6)))
    return compat, pairs, len(new_sets)


def _weather_note(fabric: str, season: str, city: str) -> str:
    ratings = knowledge.fabrics().get(fabric)
    if not ratings or season not in ratings:
        return ""
    rating = ratings[season]
    name = fabric.replace("_", " ").title()
    if rating == "excellent":
        return f"{name} is ideal for {season} in {city} right now."
    if rating == "avoid":
        return f"{name} struggles in {season} — you'd wear it mostly out of season in {city}."
    if rating == "caution":
        return f"{name} is borderline for {season} in {city}."
    return f"{name} works fine for {season} in {city}."


def _verdict(compat: int, new_outfits: int, duplicate: Garment | None) -> str:
    if duplicate is not None:
        return "skip"
    if compat >= 60 and new_outfits >= 3:
        return "buy"
    if compat >= 30 or new_outfits >= 1:
        return "maybe"
    return "skip"


async def scan(db: AsyncSession, user: User, data: bytes) -> ScanResult:
    # Same validate → orient → resize pipeline as uploads (raises InvalidImageError on junk).
    processed = await run_in_threadpool(process_garment_image, data)
    result = await run_in_threadpool(
        classify_image,
        processed.full,
        user.regional_style,
        knowledge.garment_type_slugs_for(user.gender.value),
    )
    item = _hypothetical(result)
    rows = (
        await db.execute(
            select(Garment).where(
                Garment.user_id == user.id,
                Garment.classification_status == ClassificationStatus.complete,
            )
        )
    ).scalars()
    wardrobe = list(rows)

    if item.garment_type == "unknown":
        weather = await get_weather(user.city)
        return ScanResult(
            garment_type="unknown",
            fabric_type=result.fabric_type,
            color_primary=result.color_primary,
            color_accent=result.color_accent,
            confidence=result.confidence,
            occasion_tags=[],
            season_tags=result.season_tags,
            compatibility=0,
            pairs_with=[],
            new_outfits=0,
            wardrobe_size=len(wardrobe),
            duplicate=None,
            duplicate_reason=None,
            weather_note=_weather_note(result.fabric_type, weather.season, user.city),
            verdict="maybe",
            rationale=["Couldn't tell what this is from the photo — try a clearer, front-on shot."],
        )

    compat, pairs, new_outfits = analyse(item, wardrobe)
    duplicate, dup_reason = find_duplicate(item, wardrobe)
    weather = await get_weather(user.city)
    note = _weather_note(item.fabric_type, weather.season, user.city)
    verdict = _verdict(compat, new_outfits, duplicate)

    rationale: list[str] = []
    if pairs:
        rationale.append(
            f"Works with {len(pairs)} of your items — {new_outfits} new outfit{'' if new_outfits == 1 else 's'}."
        )
    elif role_of(item) == "full":
        rationale.append("A complete look on its own; nothing in your wardrobe layers with it yet.")
    else:
        rationale.append(
            "Nothing in your wardrobe pairs with it yet — you'd need to buy a partner too."
        )
    if dup_reason:
        rationale.append(dup_reason)
    if note:
        rationale.append(note)

    analytics.track(
        user.id,
        "scan_completed",
        garment_type=item.garment_type,
        compatibility=compat,
        new_outfits=new_outfits,
        duplicate=duplicate is not None,
        verdict=verdict,
    )
    return ScanResult(
        garment_type=item.garment_type,
        fabric_type=item.fabric_type,
        color_primary=item.color_primary,
        color_accent=item.color_accent,
        confidence=result.confidence,
        occasion_tags=item.occasion_tags,
        season_tags=item.season_tags,
        compatibility=compat,
        pairs_with=pairs[:8],
        new_outfits=new_outfits,
        wardrobe_size=len(wardrobe),
        duplicate=duplicate,
        duplicate_reason=dup_reason,
        weather_note=note,
        verdict=verdict,
        rationale=rationale,
    )
