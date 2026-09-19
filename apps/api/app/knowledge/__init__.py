"""
Loader for the Indian knowledge base in packages/ai/data (the product's core IP).
Files are read once and cached; the JSON is the source of truth.
"""
import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.core.config import settings

SEASONS = ("summer", "monsoon", "winter", "all_season")
REGIONAL_STYLES = ("rajasthani", "south_indian", "punjabi", "mumbai_minimal", "pan_india_fusion")
COLORS = (
    "red",
    "maroon",
    "pink",
    "orange",
    "yellow",
    "golden",
    "green",
    "teal",
    "blue",
    "navy",
    "purple",
    "white",
    "cream",
    "beige",
    "grey",
    "black",
    "brown",
    "multicolor",
)


def _data_dir() -> Path:
    p = Path(settings.KNOWLEDGE_DIR)
    if not p.is_absolute():
        p = (Path(__file__).resolve().parents[2] / p).resolve()
    return p


@lru_cache
def load(name: str) -> Any:
    with open(_data_dir() / f"{name}.json", encoding="utf-8") as f:
        return json.load(f)


def garment_types() -> list[dict]:
    return load("garment_labels")


def fabrics() -> dict[str, dict]:
    return load("fabric_weather")


def occasions() -> list[dict]:
    return load("occasions")


def festivals() -> list[dict]:
    return load("festivals")


def cities() -> list[dict]:
    return load("cities")


def garment_type_slugs() -> set[str]:
    return {g["slug"] for g in garment_types()}


def fabric_slugs() -> set[str]:
    return set(fabrics().keys())


def occasion_slugs() -> set[str]:
    return {o["slug"] for o in occasions()}


def occasion(slug: str) -> dict | None:
    return next((o for o in occasions() if o["slug"] == slug), None)


def occasion_parent(slug: str) -> str | None:
    """Wedding sub-events (mehendi, sangeet, …) inherit tags from `wedding_guest`."""
    o = occasion(slug)
    return o.get("parent") if o else None


def city_names() -> set[str]:
    return {c["name"] for c in cities()}
