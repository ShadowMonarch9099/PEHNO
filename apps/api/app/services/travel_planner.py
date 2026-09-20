"""
Travel packing planner (weeks 38–41).

Given a destination, dates and planned activities, pick the smallest capsule
from the user's wardrobe that dresses every day (and every event evening),
then count how many looks that capsule yields. Destination context (weather,
modesty, local palette) comes from packages/ai/data/destinations.json and the
climatology table; hill stations carry a temperature offset.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, date, datetime, timedelta

from app import knowledge
from app.core.config import settings
from app.models.garment import Garment
from app.services import gap_analyzer
from app.services import outfit_engine as engine
from app.services.weather import get_weather
from app.services.weather.base import Weather, season_for

MAX_DAYS = 21
DEFAULT_MAX_ITEMS = 15
CANDIDATES_PER_SLOT = 60
W_NEW_ITEM = 0.35  # capsule pressure: each new item has to earn its place
W_REPEAT_LOOK = 1.2  # wearing the exact same look twice on a trip
MIN_MARGINAL_LOOKS = 2  # an extra item must unlock at least this many new looks
W_PALETTE = 0.4  # destination palette nudge

#: activities that fill daytime slots (one per day, cycled) vs one-off event evenings
DAY_OCCASIONS = ("casual", "office", "campus", "temple", "pooja")
LAYER_TYPES = ("dupatta", "nehru_jacket")  # taxonomy 'layer' roles suggested for cold trips


@dataclass
class Destination:
    slug: str
    name: str
    region: str
    vibe: str
    context: str
    tips: list[str]
    palette: list[str]
    avoid: list[str]
    default_activities: list[str]
    temp_offset_c: int = 0
    known: bool = True


@dataclass
class Slot:
    index: int
    day: int  # 1-based
    on: date
    part: str  # "day" | "evening"
    occasion: str
    weather: Weather


@dataclass
class Look:
    slot: Slot
    garment_ids: list[str]
    score: float
    rationale: list[str]


@dataclass
class PlanResult:
    destination: Destination
    slots: list[Slot]
    looks: list[Look]
    packed_ids: list[str]  # order of first use
    total_looks: int  # distinct looks the capsule can make across the trip's occasions
    gaps: list[gap_analyzer.Gap]
    unfilled: list[Slot] = field(default_factory=list)


# ── destination + climate ────────────────────────────────────────────────────


def destinations() -> list[Destination]:
    return [
        Destination(
            slug=d["slug"],
            name=d["name"],
            region=d["region"],
            vibe=d["vibe"],
            context=d["context"],
            tips=d["tips"],
            palette=d.get("palette", []),
            avoid=d.get("avoid", []),
            default_activities=d.get("default_activities", ["casual"]),
            temp_offset_c=d.get("temp_offset_c", 0),
        )
        for d in knowledge.load("destinations")
    ]


def resolve_destination(name: str) -> Destination:
    key = name.strip().lower()
    for d in knowledge.load("destinations"):
        if key in (d["slug"], d["name"].lower()) or key in [
            a.lower() for a in d.get("aliases", [])
        ]:
            return next(x for x in destinations() if x.slug == d["slug"])
    city = next((c for c in knowledge.cities() if c["name"].lower() == key), None)
    region = city["region"] if city else "west"
    pretty = city["name"] if city else name.strip().title()
    return Destination(
        slug=key.replace(" ", "-"),
        name=pretty,
        region=region,
        vibe=city["aesthetic"] if city else "Trip",
        context=f"No local notes for {pretty} yet — packing for typical {region} India weather.",
        tips=["Check dress codes for any temples or heritage sites on your itinerary."],
        palette=[],
        avoid=[],
        default_activities=["casual"],
        known=False,
    )


def climate(dest: Destination, on: date) -> Weather:
    """Climatology for the destination's region with the hill-station offset applied."""
    temp, condition, humidity = knowledge.load("climatology")[dest.region][str(on.month)]
    temp = float(temp) + dest.temp_offset_c
    if temp <= 12 and condition not in ("rain",):
        condition = "cold"
    return Weather(
        city=dest.name,
        temp_c=temp,
        feels_like_c=temp + (3 if humidity >= 75 else 0),
        humidity=int(humidity),
        condition=condition,
        season=season_for(temp, condition, humidity),
        source="climatology",
        description=f"Typical {on.strftime('%B')} weather for {dest.name}",
    )


async def weather_for(dest: Destination, on: date) -> Weather:
    if settings.OPENWEATHER_API_KEY and 0 <= (on - date.today()).days <= 3:
        try:
            return await get_weather(dest.name, on)
        except Exception:  # pragma: no cover - degrade to climatology
            pass
    return climate(dest, on)


# ── slots ────────────────────────────────────────────────────────────────────


def build_slots(
    start: date, end: date, activities: list[str], weather_by_day: dict[date, Weather]
) -> list[Slot]:
    days = (end - start).days + 1
    day_acts = [a for a in activities if a in DAY_OCCASIONS] or ["casual"]
    events = [a for a in activities if a not in DAY_OCCASIONS]
    slots: list[Slot] = []
    for i in range(days):
        on = start + timedelta(days=i)
        slots.append(
            Slot(len(slots), i + 1, on, "day", day_acts[i % len(day_acts)], weather_by_day[on])
        )
    for j, occ in enumerate(events):
        i = j % days
        on = start + timedelta(days=i)
        slots.append(Slot(len(slots), i + 1, on, "evening", occ, weather_by_day[on]))
    return slots


# ── capsule selection ────────────────────────────────────────────────────────


def _candidates(
    garments: list[Garment],
    slot: Slot,
    user: engine.UserContext,
    history: engine.History,
    dest: Destination,
) -> list[engine.OutfitOption]:
    now = datetime.now(UTC)
    scored = [
        engine.score_garment(
            g,
            occasion=slot.occasion,
            weather=slot.weather,
            user=user,
            festival=None,
            history=history,
            now=now,
        )
        for g in garments
    ]
    for s in scored:  # destination palette nudge
        if dest.palette and s.garment.color_primary in dest.palette:
            s.score += W_PALETTE
            s.reasons.append(f"{s.garment.color_primary.title()} suits {dest.name}")
        if dest.avoid and s.garment.color_primary in dest.avoid:
            s.score -= W_PALETTE
    options = engine.compose(scored, limit=CANDIDATES_PER_SLOT, seed=slot.index)
    options.sort(key=lambda o: -o.score)
    return options


def _by_role(garments: list[Garment]) -> dict[str, int]:
    out: dict[str, int] = {}
    for g in garments:
        out[engine.role_of(g)] = out.get(engine.role_of(g), 0) + 1
    return out


def plan(
    garments: list[Garment],
    *,
    dest: Destination,
    slots: list[Slot],
    user: engine.UserContext,
    history: engine.History | None = None,
    max_items: int = DEFAULT_MAX_ITEMS,
) -> PlanResult:
    """Capsule for the trip. `user.gender` limits gap suggestions to that taxonomy."""
    history = history or engine.History()
    usable = [g for g in garments if g.garment_type not in ("unknown", "other")]
    cands = {s.index: _candidates(usable, s, user, history, dest) for s in slots}
    all_options = [o for s in slots for o in cands[s.index]]

    def sets_within(packed: set[str]) -> set[frozenset[str]]:
        return {frozenset(o.garment_ids) for o in all_options if set(o.garment_ids) <= packed}

    # Pass 1 — cover: greedy weighted set cover, hardest slots (fewest candidates) first
    # so a wedding evening isn't starved by seven casual days spending the item budget.
    packed: list[str] = []
    used_sets: set[frozenset[str]] = set()
    for slot in sorted(slots, key=lambda s: (len(cands[s.index]), s.index)):
        best: tuple[float, engine.OutfitOption] | None = None
        for o in cands[slot.index]:
            new = [g for g in o.garment_ids if g not in packed]
            if len(packed) + len(new) > max_items:
                continue
            value = o.score - W_NEW_ITEM * len(new)
            if frozenset(o.garment_ids) in used_sets:
                value -= W_REPEAT_LOOK
            if best is None or value > best[0]:
                best = (value, o)
        if best is None:
            continue
        used_sets.add(frozenset(best[1].garment_ids))
        packed.extend(g for g in best[1].garment_ids if g not in packed)

    # Pass 2 — expand: spend leftover budget on the piece that unlocks the most extra
    # looks, while each addition still earns MIN_MARGINAL_LOOKS. This is what turns
    # "6 items, 4 looks" into "12 items, 20 looks".
    packed_set = set(packed)
    have = sets_within(packed_set)
    candidates_ids = {g for o in all_options for g in o.garment_ids} - packed_set
    while len(packed) < max_items and candidates_ids:
        gains = {g: len(sets_within(packed_set | {g}) - have) for g in candidates_ids}
        g, gain = max(gains.items(), key=lambda kv: kv[1])
        if gain < MIN_MARGINAL_LOOKS:
            break
        packed.append(g)
        packed_set.add(g)
        candidates_ids.discard(g)
        have = sets_within(packed_set)

    # Pass 3 — assign: with the capsule fixed, pick each slot's look from what's packed,
    # spreading variety across the trip (day order this time).
    used_sets = set()
    looks: list[Look] = []
    unfilled: list[Slot] = []
    for slot in slots:
        within = [o for o in cands[slot.index] if set(o.garment_ids) <= packed_set]
        if not within:
            unfilled.append(slot)
            continue
        fresh = [o for o in within if frozenset(o.garment_ids) not in used_sets]
        o = (fresh or within)[0]
        used_sets.add(frozenset(o.garment_ids))
        looks.append(Look(slot, o.garment_ids, round(o.score, 2), o.rationale))

    gaps = _gaps(usable, dest, unfilled, slots, gender=user.gender)
    return PlanResult(dest, slots, looks, packed, len(have), gaps, unfilled)


# ── gaps ─────────────────────────────────────────────────────────────────────


def _gaps(
    garments: list[Garment],
    dest: Destination,
    unfilled: list[Slot],
    slots: list[Slot],
    *,
    gender: str | None = None,
) -> list[gap_analyzer.Gap]:
    """One suggestion per uncovered occasion: the piece that would unlock the most looks."""
    suggest_for = knowledge.gender_for_wardrobe(gender, [g.garment_type for g in garments])
    tax = {g["slug"]: g for g in knowledge.garment_types_for(suggest_for)}
    gaps: list[gap_analyzer.Gap] = []
    seen: set[str] = set()
    occasions = [s.occasion for s in unfilled]
    # cold trip with nothing to layer → suggest a layer even if every slot is dressed
    if any(s.weather.season == "winter" for s in slots) and _by_role(garments).get("layer", 0) == 0:
        occasions.append("__layer__")
    for occ in occasions:
        if occ in seen:
            continue
        seen.add(occ)
        if occ == "__layer__":
            candidates = [t for t in LAYER_TYPES if t in tax]
            target_occ = next((s.occasion for s in slots), "casual")
        else:
            parent = knowledge.occasion_parent(occ)
            candidates = [
                slug
                for slug, t in tax.items()
                if occ in t.get("occasion_suitability", [])
                or (parent and parent in t.get("occasion_suitability", []))
            ]
            target_occ = occ
        best: tuple[int, str, str, list[str], int] | None = None
        for slug in candidates:
            color, colors = gap_analyzer._best_color(garments, slug, target_occ)
            if dest.palette:  # local palette first, then what pairs with the wardrobe
                colors = list(
                    dict.fromkeys(
                        sorted(colors + dest.palette, key=lambda c: c not in dest.palette)
                    )
                )[:3]
                color = colors[0]
            hyp = gap_analyzer._hypothetical(slug, color, [target_occ])
            n = gap_analyzer.count_outfits(garments + [hyp], target_occ)
            price = (tax[slug].get("typical_price_inr") or [0, 0])[0]
            # most looks unlocked; on a tie the cheaper piece is the better buy
            if best is None or (n, -price) > (best[0], -best[4]):
                best = (n, slug, color, colors, price)
        if best is None:
            continue
        n, slug, color, colors, _ = best
        t = tax[slug]
        label = t["label"]
        why = (
            f"Nothing in your wardrobe layers for {dest.name}'s cold evenings"
            if occ == "__layer__"
            else f"No complete look for {knowledge.occasion(occ)['label'].lower() if knowledge.occasion(occ) else occ} in {dest.name}"
        )
        gaps.append(
            gap_analyzer.Gap(
                garment_type=slug,
                label=label,
                occasions=[target_occ],
                new_outfits=n,
                score=float(n),
                suggested_colors=colors or [color],
                suggested_fabrics=list(t.get("typical_fabrics", []))[:3],
                typical_price_inr=tuple(t.get("typical_price_inr", [0, 0])),
                rationale=f"{why}. A {color} {label.lower()} would give you {n} option{'s' if n != 1 else ''} there.",
            )
        )
    return gaps


# ── summaries ────────────────────────────────────────────────────────────────


def weather_summary(slots: list[Slot]) -> str:
    temps = [s.weather.temp_c for s in slots if s.part == "day"]
    conds = {s.weather.condition for s in slots}
    lo, hi = min(temps), max(temps)
    rng = f"{lo:.0f}°C" if abs(hi - lo) < 1 else f"{lo:.0f}–{hi:.0f}°C"
    return f"{rng}, {' / '.join(sorted(conds))}"
