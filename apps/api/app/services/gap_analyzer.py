"""
Wardrobe gap analysis — "which single purchase unlocks the most new outfits?"

Model: the same composition rules as the outfit engine (roles from the taxonomy):
    full                         one garment
    full + layer                 layer_ok full + dupatta
    top + bottom (+ layer)       kurta/kurti × palazzo/churidar (+ dupatta)
A garment counts for an occasion when it is tagged for it or the taxonomy says
the type suits it. For every (garment type, occasion) we simulate adding one
suitable piece and count the *new* combinations it creates, then weight by how
often the user actually dresses for that occasion and by budget.

Pure functions over Garment objects; the service layer handles DB, cache, tiering.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass, field

from app import knowledge
from app.models.garment import Garment
from app.services.outfit_engine import role_of

# Candidate colours, most versatile first. Festive occasions draw from a richer palette.
_VERSATILE = ["navy", "black", "white", "cream", "golden", "beige", "maroon"]
_FESTIVE = ["maroon", "red", "golden", "green", "pink", "navy", "purple"]
_FESTIVE_OCCASIONS = {"wedding_guest", "festival", "pooja", "temple", "night_out"}


@dataclass
class Gap:
    garment_type: str
    label: str
    occasions: list[str]  # occasions this piece would serve, best first
    new_outfits: int
    score: float
    suggested_colors: list[str]
    suggested_fabrics: list[str]
    typical_price_inr: tuple[int, int]
    rationale: str
    pairs_with: list[str] = field(default_factory=list)  # garment ids it would combine with


# ── suitability ──────────────────────────────────────────────────────────────


def _taxonomy() -> dict[str, dict]:
    return {g["slug"]: g for g in knowledge.garment_types()}


def suits(g: Garment, occasion: str) -> bool:
    tags = g.occasion_tags or []
    suitability = _taxonomy().get(g.garment_type, {}).get("occasion_suitability", [])
    if occasion in tags or occasion in suitability:
        return True
    parent = knowledge.occasion_parent(occasion)
    return bool(parent) and (parent in tags or parent in suitability)


def _harmonises(a: str, b: str) -> bool:
    """Wearable together? Only explicit clashes disqualify (mirrors the outfit engine)."""
    h = knowledge.load("color_harmony")
    if a in ("unknown", "multicolor") or b in ("unknown", "multicolor") or a == b:
        return True
    if a in h["neutrals"] or b in h["neutrals"]:
        return True
    return not any({a, b} == {x, y} for x, y in h["clashes"])


# ── combination counting ─────────────────────────────────────────────────────


def outfit_sets(garments: list[Garment], occasion: str) -> set[frozenset[str]]:
    """Distinct valid outfits (as garment-id sets) for an occasion under the composition rules."""
    usable = [g for g in garments if suits(g, occasion)]
    fulls = [g for g in usable if role_of(g) == "full"]
    tops = [g for g in usable if role_of(g) == "top"]
    bottoms = [g for g in usable if role_of(g) == "bottom"]
    layers = [g for g in usable if role_of(g) == "layer"]
    out: set[frozenset[str]] = set()
    for f in fulls:
        out.add(frozenset([str(f.id)]))
        if _taxonomy().get(f.garment_type, {}).get("layer_ok"):
            for layer in layers:
                if _harmonises(f.color_primary, layer.color_primary):
                    out.add(frozenset([str(f.id), str(layer.id)]))
    for t in tops:
        for b in bottoms:
            if not _harmonises(t.color_primary, b.color_primary):
                continue
            out.add(frozenset([str(t.id), str(b.id)]))
            for layer in layers:
                if _harmonises(t.color_primary, layer.color_primary):
                    out.add(frozenset([str(t.id), str(b.id), str(layer.id)]))
    return out


def count_outfits(garments: list[Garment], occasion: str) -> int:
    return len(outfit_sets(garments, occasion))


def _hypothetical(garment_type: str, color: str, occasions: list[str]) -> Garment:
    tax = _taxonomy().get(garment_type, {})
    return Garment(
        image_key="hypothetical",
        garment_type=garment_type,
        fabric_type=(tax.get("typical_fabrics") or ["cotton"])[0],
        color_primary=color,
        occasion_tags=sorted(set(occasions) | set(tax.get("occasion_suitability", []))),
        season_tags=["all_season"],
    )


def _best_color(garments: list[Garment], garment_type: str, occasion: str) -> tuple[str, list[str]]:
    """Colour that pairs with the most existing partners for this role/occasion."""
    role = _taxonomy().get(garment_type, {}).get("role")
    partner_roles = {
        "top": {"bottom"},
        "bottom": {"top"},
        "layer": {"top", "full"},
        "full": {"layer"},
    }.get(role, set())
    partners = [g for g in garments if suits(g, occasion) and role_of(g) in partner_roles]
    palette = (
        _FESTIVE if (occasion in _FESTIVE_OCCASIONS and role in ("full", "layer")) else _VERSATILE
    )
    ranked = sorted(
        palette,
        key=lambda c: -sum(1 for p in partners if _harmonises(c, p.color_primary)),
    )
    return ranked[0], ranked[:3]


# ── analysis ─────────────────────────────────────────────────────────────────


def _describe(garments: list[Garment], occasion: str) -> Counter:
    c: Counter = Counter()
    for g in garments:
        if suits(g, occasion):
            c[role_of(g)] += 1
    return c


def _rationale(
    gap_type: str,
    label: str,
    occasion_label: str,
    roles: Counter,
    colors: list[str],
    new: int,
    existing: int,
) -> str:
    role = _taxonomy().get(gap_type, {}).get("role")
    colour_phrase = " or ".join(colors[:2])
    name = label.lower()
    looks = f"{new} new look{'' if new == 1 else 's'}"
    if role == "bottom":
        return (
            f"You have {roles['top']} tops for {occasion_label} but only {roles['bottom']} bottom"
            f"{'' if roles['bottom'] == 1 else 's'} — a {colour_phrase} {name} would pair with all of "
            f"them, unlocking {looks}."
        )
    if role == "top":
        return (
            f"{roles['bottom']} bottom{'' if roles['bottom'] == 1 else 's'} for {occasion_label} but "
            f"only {roles['top']} top{'' if roles['top'] == 1 else 's'} — a {colour_phrase} {name} "
            f"unlocks {looks}."
        )
    if role == "layer":
        return (
            f"A {colour_phrase} {name} would finish {looks} for {occasion_label} "
            f"(you own {roles['layer']} for this occasion)."
        )
    if existing == 0:
        return (
            f"Nothing in your wardrobe is a complete {occasion_label} look yet — "
            f"a {colour_phrase} {name} fixes that ({looks})."
        )
    return (
        f"A {colour_phrase} {name} adds a one-piece option for {occasion_label} "
        f"alongside your {existing} existing look{'' if existing == 1 else 's'} ({looks})."
    )


def analyze(
    garments: list[Garment],
    *,
    occasion_weights: dict[str, float] | None = None,
    budget_inr: int | None = None,
    regional_style: str | None = None,
    limit: int = 5,
) -> list[Gap]:
    """Top gaps, most valuable first. Deterministic given inputs."""
    usable = [g for g in garments if g.garment_type not in ("unknown", "other")]
    occasions = [o["slug"] for o in knowledge.occasions()]
    weights = {o: (occasion_weights or {}).get(o, 1.0) for o in occasions}
    labels = {o["slug"]: o["label"] for o in knowledge.occasions()}
    tax = _taxonomy()

    baseline = {o: outfit_sets(usable, o) for o in occasions}
    baseline_all: set[frozenset[str]] = set().union(*baseline.values()) if baseline else set()
    per_type: dict[str, dict] = {}

    for gtype, entry in tax.items():
        lo, hi = entry.get("typical_price_inr", [0, 0])
        budget_factor = 1.0
        if budget_inr is not None:
            if lo > budget_inr:
                budget_factor = 0.15  # over budget: keep visible but rank low
            elif hi > budget_inr:
                budget_factor = 0.7
        style_factor = (
            1.15
            if regional_style and regional_style in entry.get("regional_associations", [])
            else 1.0
        )

        for occ in occasions:
            if occ not in entry.get("occasion_suitability", []):
                continue
            color, colors = _best_color(usable, gtype, occ)
            trial = usable + [_hypothetical(gtype, color, [occ])]
            served: dict[str, int] = {}
            new_sets: set[frozenset[str]] = set()
            for o2 in occasions:  # one purchase can serve several occasions
                delta = outfit_sets(trial, o2) - baseline[o2]
                if delta:
                    served[o2] = len(delta)
                    new_sets |= delta
            if served.get(occ, 0) <= 0:
                continue
            distinct_new = len(new_sets - baseline_all)
            # Rank by distinct new outfits, emphasised by the most-used occasion it serves
            # (so the score stays monotone in the "+N outfits" the user sees).
            emphasis = max(weights[o] for o in served)
            score = distinct_new * emphasis * budget_factor * style_factor
            best = per_type.get(gtype)
            if best is None or score > best["score"]:
                per_type[gtype] = {
                    "occ": occ,
                    "served": sorted(served, key=lambda o: -served[o]),
                    "new": distinct_new,
                    "score": score,
                    "colors": colors,
                }

    gaps: list[Gap] = []
    for gtype, best in per_type.items():
        entry = tax[gtype]
        occ = best["occ"]
        roles = _describe(usable, occ)
        fabrics = [f for f in entry.get("typical_fabrics", []) if f in knowledge.fabric_slugs()][:3]
        gaps.append(
            Gap(
                garment_type=gtype,
                label=entry["label"],
                occasions=best["served"],
                new_outfits=best["new"],
                score=round(best["score"], 2),
                suggested_colors=best["colors"],
                suggested_fabrics=fabrics,
                typical_price_inr=tuple(entry.get("typical_price_inr", [0, 0])),
                rationale=_rationale(
                    gtype,
                    entry["label"],
                    labels.get(occ, occ),
                    roles,
                    best["colors"],
                    best["new"],
                    len(baseline[occ]),
                ),
            )
        )
    gaps.sort(key=lambda g: (-g.score, -g.new_outfits, g.garment_type))
    return gaps[:limit]


def occasion_weights_from_history(occasion_counts: dict[str, int]) -> dict[str, float]:
    """Smoothed frequency weights: occasions the user actually dresses for count more."""
    total = sum(occasion_counts.values())
    if not total:
        return {}
    return {o: 1.0 + 2.0 * n / total for o, n in occasion_counts.items()}


def combos_per_garment(garments: list[Garment]) -> dict[str, int]:
    """How many distinct outfits each garment participates in (union across occasions)."""
    usable = [g for g in garments if g.garment_type not in ("unknown", "other")]
    all_sets: set[frozenset[str]] = set()
    for occ in knowledge.occasions():
        all_sets |= outfit_sets(usable, occ["slug"])
    counts: dict[str, int] = defaultdict(int)
    for s in all_sets:
        for gid in s:
            counts[gid] += 1
    return dict(counts)


__all__ = [
    "Gap",
    "analyze",
    "count_outfits",
    "outfit_sets",
    "combos_per_garment",
    "occasion_weights_from_history",
]
