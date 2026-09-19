"""
Festival intelligence: calendar, regional relevance, curated looks, Navratri tracker.
The knowledge base (festivals.json) is the source of truth.
"""
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app import knowledge
from app.models.user import User
from app.services.outfit_engine import FestivalContext

IST = timezone(timedelta(hours=5, minutes=30))
ALERT_DAYS = (14, 7, 1)

# Navratri's nine colours follow the weekday of day 1 (Pratipada): Sun→orange … Sat→grey,
# then days 8 and 9 continue with peacock green and pink/purple. (weekday(): Mon=0 … Sun=6)
_WEEKDAY_COLORS = {
    6: "orange",
    0: "white",
    1: "red",
    2: "royal_blue",
    3: "yellow",
    4: "green",
    5: "grey",
}
_TAIL_COLORS = ("peacock_green", "pink", "purple")
NAVRATRI_COLOR_INFO: dict[str, dict] = {
    "orange": {"name": "Orange", "hex": "#FF7F11", "slugs": ["orange"]},
    "white": {"name": "White", "hex": "#F8F8F8", "slugs": ["white", "cream"]},
    "red": {"name": "Red", "hex": "#D0342C", "slugs": ["red", "maroon"]},
    "royal_blue": {"name": "Royal Blue", "hex": "#2D4FA5", "slugs": ["blue", "navy"]},
    "yellow": {"name": "Yellow", "hex": "#F2C230", "slugs": ["yellow", "golden"]},
    "green": {"name": "Green", "hex": "#2E8B57", "slugs": ["green"]},
    "grey": {"name": "Grey", "hex": "#8E8E8E", "slugs": ["grey"]},
    "peacock_green": {"name": "Peacock Green", "hex": "#0E7C7B", "slugs": ["teal", "green"]},
    "pink": {"name": "Pink", "hex": "#E75480", "slugs": ["pink"]},
    "purple": {"name": "Purple", "hex": "#6A3FA0", "slugs": ["purple"]},
}


def today_ist() -> date:
    return datetime.now(IST).date()


# ── calendar ─────────────────────────────────────────────────────────────────


@dataclass
class Occurrence:
    festival: dict
    start: date
    end: date  # inclusive

    @property
    def slug(self) -> str:
        return self.festival["slug"]

    def days_until(self, today: date) -> int:
        return (self.start - today).days

    def is_active(self, today: date) -> bool:
        return self.start <= today <= self.end


def _occurrence(f: dict, year: int) -> Occurrence | None:
    iso = f.get("dates", {}).get(str(year))
    if not iso:
        return None
    start = date.fromisoformat(iso)
    return Occurrence(f, start, start + timedelta(days=int(f.get("duration_days", 1)) - 1))


def next_occurrence(slug: str, today: date | None = None) -> Occurrence | None:
    """The current (if active) or next occurrence of a festival."""
    today = today or today_ist()
    f = by_slug(slug)
    if not f:
        return None
    for year in (today.year - 1, today.year, today.year + 1):
        occ = _occurrence(f, year)
        if occ and occ.end >= today:
            return occ
    return None


def by_slug(slug: str) -> dict | None:
    return next((f for f in knowledge.festivals() if f["slug"] == slug), None)


# ── regional relevance ───────────────────────────────────────────────────────


def _city_tokens(city: str) -> set[str]:
    c = next((c for c in knowledge.cities() if c["name"].lower() == city.lower()), None)
    tokens = {city.lower().replace(" ", "_")}
    if c:
        tokens |= {c["state"].lower().replace(" ", "_"), c["region"], c["slug"]}
    return tokens


def is_relevant(f: dict, city: str) -> bool:
    regions = set(f.get("regions", []))
    return "pan_india" in regions or bool(regions & _city_tokens(city))


def upcoming(
    city: str, *, today: date | None = None, horizon_days: int = 120, limit: int = 5
) -> list[Occurrence]:
    today = today or today_ist()
    occs = [
        o
        for f in knowledge.festivals()
        if (o := next_occurrence(f["slug"], today)) and o.days_until(today) <= horizon_days
    ]
    relevant = [o for o in occs if is_relevant(o.festival, city)]
    others = [o for o in occs if not is_relevant(o.festival, city)]
    ranked = sorted(relevant, key=lambda o: o.start) + sorted(others, key=lambda o: o.start)
    return ranked[:limit]


# ── engine context ───────────────────────────────────────────────────────────


def context_for(f: dict) -> FestivalContext:
    return FestivalContext(
        slug=f["slug"],
        name=f["name"],
        colors=list(f.get("colors", [])),
        occasion_tags=[t for t in f.get("occasion_tags", []) if t in knowledge.occasion_slugs()]
        or ["festival"],
    )


async def festival_context(db: AsyncSession, slug: str) -> FestivalContext | None:  # noqa: ARG001
    f = by_slug(slug)
    return context_for(f) if f else None


def primary_occasion(f: dict) -> str:
    """Which of our occasions best represents this festival (for outfit generation)."""
    for tag in f.get("occasion_tags", []):
        if tag in knowledge.occasion_slugs():
            return tag
    return "festival"


# ── Navratri ─────────────────────────────────────────────────────────────────


def navratri_sequence(start: date) -> list[dict]:
    """Nine {day, key, name, hex, slugs, date} entries for a Navratri starting on `start`."""
    seq: list[str] = []
    for i in range(7):
        seq.append(_WEEKDAY_COLORS[(start + timedelta(days=i)).weekday()])
    # days 8-9: the two tail colours not already used, in canonical order
    seq.extend([c for c in _TAIL_COLORS if c not in seq][:2])
    ref = {c["day"]: c for c in (by_slug("navratri") or {}).get("navratri_colors") or []}
    out = []
    for i, key in enumerate(seq, start=1):
        info = NAVRATRI_COLOR_INFO[key]
        out.append(
            {
                "day": i,
                "date": (start + timedelta(days=i - 1)).isoformat(),
                "key": key,
                "name": info["name"],
                "hex": info["hex"],
                "color_slugs": info["slugs"],
                "goddess": ref.get(i, {}).get("goddess"),
            }
        )
    return out


def navratri_today(today: date | None = None) -> dict:
    today = today or today_ist()
    occ = next_occurrence("navratri", today)
    if occ is None:
        return {
            "is_active": False,
            "starts_on": None,
            "days_until": None,
            "day": None,
            "today": None,
            "sequence": [],
        }
    seq = navratri_sequence(occ.start)
    if occ.is_active(today):
        day = (today - occ.start).days + 1
        return {
            "is_active": True,
            "starts_on": occ.start.isoformat(),
            "days_until": 0,
            "day": day,
            "today": seq[day - 1],
            "sequence": seq,
        }
    return {
        "is_active": False,
        "starts_on": occ.start.isoformat(),
        "days_until": occ.days_until(today),
        "day": None,
        "today": None,
        "sequence": seq,
    }


# ── alerts ───────────────────────────────────────────────────────────────────


def alerts_due(user: User, today: date | None = None) -> list[tuple[Occurrence, int]]:
    """(occurrence, days_before) pairs whose alert day is today, for the user's region."""
    today = today or today_ist()
    due = []
    for f in knowledge.festivals():
        if not is_relevant(f, user.city):
            continue
        occ = next_occurrence(f["slug"], today)
        if occ is None:
            continue
        d = occ.days_until(today)
        if d in ALERT_DAYS:
            due.append((occ, d))
    return due
