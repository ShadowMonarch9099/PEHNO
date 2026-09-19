"""
Fabric care + wardrobe ROI.

- Care reminders: each fabric has `reminder_after_wears` (care_profiles.json).
  A garment is "due" when wears_since_care >= threshold and reminders are on.
- ROI: cost-per-wear = purchase_price / wear_count, worst (highest) first.
- Underutilised: not worn in 90+ days (or never, if older than 30 days) — each
  with 1–2 fresh pairing suggestions from the wardrobe.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import knowledge
from app.core.database import utcnow
from app.models.garment import ClassificationStatus, Garment
from app.models.user import User
from app.services.gap_analyzer import _harmonises, suits
from app.services.outfit_engine import role_of

UNDERUTILISED_DAYS = 90
NEVER_WORN_GRACE_DAYS = 30


def reminder_threshold(fabric: str) -> int:
    profiles = knowledge.load("care_profiles")
    return int((profiles.get(fabric) or profiles["unknown"]).get("reminder_after_wears", 5))


def care_due(g: Garment) -> bool:
    return g.care_reminders_enabled and g.wears_since_care >= reminder_threshold(g.fabric_type)


def care_instruction(g: Garment) -> str:
    profile = g.care_profile or knowledge.load("care_profiles")["unknown"]
    return profile.get("wash") or "Follow the care label"


async def mark_cared(db: AsyncSession, garment: Garment) -> Garment:
    garment.wears_since_care = 0
    garment.last_cared_at = utcnow()
    await db.flush()
    return garment


async def set_reminders(db: AsyncSession, garment: Garment, enabled: bool) -> Garment:
    garment.care_reminders_enabled = enabled
    await db.flush()
    return garment


async def due_for_user(db: AsyncSession, user: User) -> list[Garment]:
    rows = (
        await db.execute(
            select(Garment).where(
                Garment.user_id == user.id,
                Garment.care_reminders_enabled.is_(True),
                Garment.wears_since_care > 0,
            )
        )
    ).scalars()
    return [g for g in rows if care_due(g)]


# ── ROI ──────────────────────────────────────────────────────────────────────


@dataclass
class RoiRow:
    garment: Garment
    cost_per_wear: Decimal | None  # None when unworn or unpriced
    verdict: str  # "great" | "ok" | "poor" | "unworn" | "unpriced"


def roi_verdict(g: Garment) -> tuple[Decimal | None, str]:
    if g.purchase_price is None:
        return None, "unpriced"
    if g.wear_count == 0:
        return None, "unworn"
    cpw = (Decimal(g.purchase_price) / g.wear_count).quantize(Decimal("0.01"))
    band = knowledge.load("garment_labels")
    lo = next((x["typical_price_inr"][0] for x in band if x["slug"] == g.garment_type), 500)
    # ₹/wear relative to what the piece typically costs: cheap-per-wear pieces are "great".
    ratio = float(cpw) / max(lo, 1)
    return cpw, "great" if ratio <= 0.1 else "ok" if ratio <= 0.35 else "poor"


async def roi_rows(db: AsyncSession, user: User) -> list[RoiRow]:
    rows = (await db.execute(select(Garment).where(Garment.user_id == user.id))).scalars().all()
    out = [RoiRow(g, *roi_verdict(g)) for g in rows]
    order = {"poor": 0, "ok": 1, "great": 2, "unworn": 3, "unpriced": 4}
    return sorted(out, key=lambda r: (order[r.verdict], -(r.cost_per_wear or 0)))


# ── underutilised ────────────────────────────────────────────────────────────


def _aware(dt: datetime | None) -> datetime | None:
    return dt if dt is None or dt.tzinfo else dt.replace(tzinfo=UTC)


def is_underutilised(g: Garment, now: datetime | None = None) -> bool:
    now = now or utcnow()
    last = _aware(g.last_worn_at)
    if last is not None:
        return now - last >= timedelta(days=UNDERUTILISED_DAYS)
    created = _aware(g.created_at)
    return created is not None and now - created >= timedelta(days=NEVER_WORN_GRACE_DAYS)


def pairing_suggestions(
    g: Garment, wardrobe: list[Garment], limit: int = 2, now: datetime | None = None
) -> list[tuple[Garment, str]]:
    """Fresh partners for a garment: complementary roles, matching occasion, colour-compatible."""
    now = now or utcnow()
    role = role_of(g)
    partner_roles = {
        "top": {"bottom"},
        "bottom": {"top"},
        "layer": {"top", "full"},
        "full": {"layer"},
    }.get(role, set())
    occasions = [o["slug"] for o in knowledge.occasions() if suits(g, o["slug"])]
    scored: list[tuple[int, Garment, str]] = []
    for other in wardrobe:
        if other.id == g.id or role_of(other) not in partner_roles:
            continue
        if not _harmonises(g.color_primary, other.color_primary):
            continue
        shared = [o for o in occasions if suits(other, o)]
        if not shared:
            continue
        # Partners in active rotation make the idle piece likelier to be worn: weight
        # recency above breadth of shared occasions.
        last = _aware(other.last_worn_at)
        recency = 0 if last is None else 3 if now - last <= timedelta(days=30) else 1
        scored.append((len(shared) * 2 + recency, other, shared[0]))
    scored.sort(key=lambda t: -t[0])
    return [(o, occ) for _, o, occ in scored[:limit]]


async def underutilised(
    db: AsyncSession, user: User
) -> list[tuple[Garment, list[tuple[Garment, str]]]]:
    rows = (
        (
            await db.execute(
                select(Garment).where(
                    Garment.user_id == user.id,
                    Garment.classification_status == ClassificationStatus.complete,
                    Garment.garment_type.not_in(["unknown", "other"]),
                )
            )
        )
        .scalars()
        .all()
    )
    wardrobe = list(rows)
    now = utcnow()
    out = []
    for g in wardrobe:
        if is_underutilised(g, now):
            out.append((g, pairing_suggestions(g, wardrobe, now=now)))
    out.sort(key=lambda t: _aware(t[0].last_worn_at) or _aware(t[0].created_at) or now)
    return out
