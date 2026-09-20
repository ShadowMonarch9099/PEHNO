"""
Outfit engine v1 — five scoring layers over the user's wardrobe, then outfit
composition using Indian garment roles.

    1. Weather        fabric × season suitability (fabric_weather.json)
    2. Occasion       garment tags + taxonomy + occasion fabric preferences
    3. Colour         harmony between pieces, skin-tone flattering colours
    4. Festival       boost garments in the festival's colours / occasion tags
    5. Personal       recency, novelty, verified labels, regional style, feedback

Composition (roles from garment_labels.json):
    full                       saree · lehenga · anarkali · salwar suit · indo-western
    full + layer               a dupatta on top of a layer_ok full garment
    top + bottom (+ layer)     kurta/kurti with palazzo/churidar

Everything here is pure and synchronous; the service layer feeds it data.
"""
from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, timedelta

from app import knowledge
from app.models.garment import Garment
from app.services.weather.base import Weather

# ── tunables ─────────────────────────────────────────────────────────────────
W_SEASON = {"excellent": 1.0, "good": 0.6, "caution": -0.5, "avoid": -1.6}
W_OCCASION_TAGGED = 1.5
W_OCCASION_TAXONOMY = 0.5
W_OCCASION_MISS = -1.2
W_FABRIC_PREF = 0.5
W_FABRIC_AVOID = -1.0
W_COLOR_MATCH = 0.6
W_COLOR_CLASH = -0.7
W_SKIN_TONE = 0.25
W_FESTIVAL_COLOR = 1.0
W_FESTIVAL_TAG = 0.6
W_PALETTE_MATCH = 0.8  # occasion palette (wedding sub-events)
W_PALETTE_AVOID = -1.2
W_RECENT_WEAR = -1.0
W_NEVER_WORN = 0.3
W_VERIFIED = 0.2
W_STYLE_MATCH = 0.3
W_DISLIKE = -0.8
W_FIT_PREFER = 0.35  # silhouette guidance for the user's body type (fit_guidance.json)
W_FIT_AVOID = -0.45
W_LIKE = 0.4
W_LAYER_BONUS = 0.3
RECENT_DAYS = 7
#: Options scoring below this are 'clearly wrong for this occasion/weather' and never shown.
MIN_OPTION_SCORE = -0.5


@dataclass
class UserContext:
    body_type: str = "regular"
    skin_tone: str = "medium"
    regional_style: str = "pan_india_fusion"
    gender: str = "female"


@dataclass
class FestivalContext:
    slug: str
    name: str
    colors: list[str] = field(default_factory=list)
    occasion_tags: list[str] = field(default_factory=list)


@dataclass
class History:
    """Signals from the user's past outfits."""

    disliked_garment_ids: set[str] = field(default_factory=set)
    liked_garment_ids: set[str] = field(default_factory=set)


@dataclass
class ScoredGarment:
    garment: Garment
    score: float
    reasons: list[str]


@dataclass
class OutfitOption:
    garments: list[Garment]
    score: float
    rationale: list[str]

    @property
    def garment_ids(self) -> list[str]:
        return [str(g.id) for g in self.garments]


# ── knowledge lookups (cached per process) ───────────────────────────────────


def _taxonomy() -> dict[str, dict]:
    return {g["slug"]: g for g in knowledge.garment_types()}


def _occasion(slug: str) -> dict:
    return next((o for o in knowledge.occasions() if o["slug"] == slug), {})


def _harmony() -> dict:
    return knowledge.load("color_harmony")


def role_of(garment: Garment) -> str:
    return _taxonomy().get(garment.garment_type, {}).get("role", "unknown")


def _layer_ok(garment: Garment) -> bool:
    return bool(_taxonomy().get(garment.garment_type, {}).get("layer_ok"))


# ── layer scoring ─────────────────────────────────────────────────────────────


def score_garment(
    g: Garment,
    *,
    occasion: str,
    weather: Weather,
    user: UserContext,
    festival: FestivalContext | None,
    history: History,
    now: datetime,
) -> ScoredGarment:
    score = 0.0
    reasons: list[str] = []
    fabric = g.fabric_type
    season = weather.season

    # 1. Weather
    ratings = knowledge.fabrics().get(fabric)
    if ratings and season in ("summer", "monsoon", "winter"):
        rating = ratings.get(season, "good")
        score += W_SEASON[rating]
        if rating == "excellent":
            reasons.append(
                f"{fabric.replace('_', ' ').title()} is ideal for {season} ({weather.temp_c:.0f}°C)"
            )
        elif rating == "avoid":
            reasons.append(f"{fabric.replace('_', ' ').title()} struggles in {season}")
    elif ratings and season == "transition":
        score += 0.3  # pleasant weather: most fabrics fine

    # 2. Occasion (wedding sub-events fall back to their parent's tags)
    occ = _occasion(occasion)
    parent = occ.get("parent")
    suitability = _taxonomy().get(g.garment_type, {}).get("occasion_suitability", [])
    tags = g.occasion_tags or []
    if occasion in tags:
        score += W_OCCASION_TAGGED
        reasons.append(f"Tagged for {occ.get('label', occasion)}")
    elif parent and parent in tags:
        score += W_OCCASION_TAGGED * 0.8
        reasons.append(f"Wedding-ready piece for the {occ.get('label', occasion).lower()}")
    elif occasion in suitability or (parent and parent in suitability):
        score += W_OCCASION_TAXONOMY
    else:
        score += W_OCCASION_MISS
    if g.garment_type in occ.get("garment_preference", []):
        score += W_OCCASION_TAXONOMY
    if occ.get("palette"):
        if g.color_primary in occ["palette"]:
            score += W_PALETTE_MATCH
            reasons.append(f"{g.color_primary.title()} is a {occ.get('label', occasion)} colour")
        elif g.color_primary in occ.get("avoid_colors", []):
            score += W_PALETTE_AVOID
            reasons.append(
                f"{g.color_primary.title()} is best avoided at a {occ.get('label', occasion).lower()}"
            )
    if fabric in occ.get("fabric_preference", []):
        score += W_FABRIC_PREF
    if fabric in occ.get("avoid_fabrics", []):
        score += W_FABRIC_AVOID
        reasons.append(
            f"{fabric.replace('_', ' ').title()} is unusual for {occ.get('label', occasion)}"
        )

    # 3. Colour (skin tone; pairwise harmony is applied at outfit level)
    if g.color_primary in _harmony()["skin_tone_flatters"].get(user.skin_tone, []):
        score += W_SKIN_TONE
        reasons.append(f"{g.color_primary.title()} flatters your skin tone")

    # 4. Festival
    if festival:
        if g.color_primary in festival.colors or (
            g.color_accent and g.color_accent in festival.colors
        ):
            score += W_FESTIVAL_COLOR
            reasons.append(f"{g.color_primary.title()} is a {festival.name} colour")
        if set(g.occasion_tags or []) & set(festival.occasion_tags):
            score += W_FESTIVAL_TAG

    # 5. Personalisation
    last = g.last_worn_at
    if last is not None:
        last = last if last.tzinfo else last.replace(tzinfo=UTC)
        if now - last < timedelta(days=RECENT_DAYS):
            score += W_RECENT_WEAR
            reasons.append("Worn recently")
    if g.wear_count == 0:
        score += W_NEVER_WORN
        reasons.append("Never worn yet")
    if g.user_verified:
        score += W_VERIFIED
    if g.regional_style and g.regional_style == user.regional_style:
        score += W_STYLE_MATCH
    gid = str(g.id)
    if gid in history.disliked_garment_ids:
        score += W_DISLIKE
    if gid in history.liked_garment_ids:
        score += W_LIKE

    # 6. Fit — silhouette guidance for the user's body type
    fit = knowledge.fit_guidance(user.gender, user.body_type)
    if fit:
        if g.garment_type in fit.get("prefer", []):
            score += W_FIT_PREFER
            reasons.append(f"Flattering cut for a {fit['label'].lower()} frame")
        elif g.garment_type in fit.get("avoid", []):
            score += W_FIT_AVOID

    return ScoredGarment(g, round(score, 3), reasons)


# ── outfit composition ────────────────────────────────────────────────────────


def color_pair_score(a: Garment, b: Garment) -> tuple[float, str | None]:
    h = _harmony()
    ca, cb = a.color_primary, b.color_primary
    if ca in ("unknown",) or cb in ("unknown",):
        return 0.0, None
    if ca in h["neutrals"] or cb in h["neutrals"]:
        return W_COLOR_MATCH * 0.5, None
    if ca == cb:
        return 0.2, f"Tonal {ca} look"
    for x, y in h["clashes"]:
        if {ca, cb} == {x, y}:
            return W_COLOR_CLASH, None
    if cb in h["pairs"].get(ca, []) or ca in h["pairs"].get(cb, []):
        return W_COLOR_MATCH, f"{ca.title()} and {cb} complement each other"
    return 0.0, None


def _combine(parts: list[ScoredGarment], extra: float, extra_reasons: list[str]) -> OutfitOption:
    base = sum(p.score for p in parts) / len(parts)
    reasons: list[str] = []
    for p in parts:
        for r in p.reasons:
            if r not in reasons:
                reasons.append(r)
    reasons.extend(r for r in extra_reasons if r and r not in reasons)
    return OutfitOption([p.garment for p in parts], round(base + extra, 3), reasons[:5])


def compose(
    scored: list[ScoredGarment],
    *,
    limit: int = 3,
    seed: int | None = None,
    exclude: set[frozenset[str]] | None = None,
) -> list[OutfitOption]:
    """Build every valid outfit from scored garments and return the best distinct ones."""
    fulls = [s for s in scored if role_of(s.garment) == "full"]
    tops = [s for s in scored if role_of(s.garment) == "top"]
    bottoms = [s for s in scored if role_of(s.garment) == "bottom"]
    layers = sorted((s for s in scored if role_of(s.garment) == "layer"), key=lambda s: -s.score)

    def best_layer_for(core: list[ScoredGarment]) -> tuple[ScoredGarment | None, float, str | None]:
        if not layers or not any(_layer_ok(c.garment) for c in core):
            return None, 0.0, None
        best = None
        for layer in layers[:4]:
            pair, why = color_pair_score(core[0].garment, layer.garment)
            total = layer.score + pair
            if best is None or total > best[1]:
                best = (layer, total, why)
        assert best is not None
        if best[0].score < 0:
            return None, 0.0, None
        return best[0], W_LAYER_BONUS + best[1] - best[0].score, best[2]

    options: list[OutfitOption] = []
    for f in fulls:
        layer, bonus, why = best_layer_for([f])
        parts = [f] + ([layer] if layer else [])
        options.append(_combine(parts, bonus, [why]))
    for t in tops:
        for b in bottoms:
            pair, why = color_pair_score(t.garment, b.garment)
            layer, bonus, why2 = best_layer_for([t, b])
            parts = [t, b] + ([layer] if layer else [])
            options.append(_combine(parts, pair + bonus, [why, why2]))

    options = [o for o in options if o.score >= MIN_OPTION_SCORE]
    if exclude:  # 'show me another': drop combinations already shown
        options = [o for o in options if frozenset(o.garment_ids) not in exclude]

    rng = random.Random(seed)
    options.sort(key=lambda o: (-o.score, rng.random()))

    chosen: list[OutfitOption] = []
    used: set[str] = set()
    for o in options:  # prefer options that don't reuse garments
        if used.isdisjoint(o.garment_ids):
            chosen.append(o)
            used.update(o.garment_ids)
        if len(chosen) == limit:
            break
    if len(chosen) < limit:  # small wardrobes: allow overlap rather than return nothing
        for o in options:
            if o not in chosen:
                chosen.append(o)
            if len(chosen) == limit:
                break
    return chosen


def generate(
    garments: list[Garment],
    *,
    occasion: str,
    weather: Weather,
    user: UserContext,
    festival: FestivalContext | None = None,
    history: History | None = None,
    now: datetime | None = None,
    limit: int = 3,
    seed: int | None = None,
    exclude: set[frozenset[str]] | None = None,
) -> list[OutfitOption]:
    now = now or datetime.now(UTC)
    history = history or History()
    usable = [g for g in garments if g.garment_type not in ("unknown", "other")]
    scored = [
        score_garment(
            g,
            occasion=occasion,
            weather=weather,
            user=user,
            festival=festival,
            history=history,
            now=now,
        )
        for g in usable
    ]
    return compose(scored, limit=limit, seed=seed, exclude=exclude)


def daily_seed(user_id, on: date) -> int:
    """Stable per user per day so 'today's look' doesn't reshuffle on every open."""
    return int(hashlib.sha256(f"{user_id}:{on.isoformat()}".encode()).hexdigest()[:8], 16)
