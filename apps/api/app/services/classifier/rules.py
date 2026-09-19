"""
Knowledge-base rules layered on top of vision predictions:
occasions from the garment taxonomy ∩ fabric preferences, seasons from the
fabric×weather matrix, regional style from taxonomy associations, care from
care_profiles.json.
"""
from app import knowledge

_SEASON_KEYS = ("summer", "monsoon", "winter")


def seasons_for_fabric(fabric: str) -> list[str]:
    ratings = knowledge.fabrics().get(fabric)
    if not ratings:
        return ["all_season"]
    ok = [s for s in _SEASON_KEYS if ratings.get(s) in ("excellent", "good")]
    if len(ok) == 3:
        return ["all_season"]
    return ok or ["all_season"]


def occasions_for(garment_type: str, fabric: str) -> list[str]:
    taxonomy = {g["slug"]: g for g in knowledge.garment_types()}
    entry = taxonomy.get(garment_type)
    if not entry:
        return []
    candidates = list(entry.get("occasion_suitability", []))
    if fabric in ("unknown", "other"):
        return sorted(candidates)
    keep = []
    for occ in knowledge.occasions():
        if occ["slug"] not in candidates:
            continue
        if fabric in occ.get("avoid_fabrics", []):
            continue
        keep.append(occ["slug"])
    return sorted(keep or candidates)


def regional_style_for(garment_type: str, user_style: str | None) -> str | None:
    taxonomy = {g["slug"]: g for g in knowledge.garment_types()}
    assoc = taxonomy.get(garment_type, {}).get("regional_associations", [])
    if user_style and user_style in assoc:
        return user_style
    if len(assoc) == 1:
        return assoc[0]
    return None


def care_profile_for(fabric: str) -> dict:
    profiles = knowledge.load("care_profiles")
    return dict(profiles.get(fabric) or profiles["unknown"])


def fabric_prior(garment_type: str) -> list[str]:
    """Fabrics typically used for a garment type — used to re-rank vision guesses."""
    taxonomy = {g["slug"]: g for g in knowledge.garment_types()}
    return list(taxonomy.get(garment_type, {}).get("typical_fabrics", []))
