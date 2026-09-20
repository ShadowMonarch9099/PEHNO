"""
/meta — vocabularies from the knowledge base, so clients never hard-code them.
"""
from fastapi import APIRouter

from app import knowledge
from app.models.garment import GarmentCondition
from app.schemas.meta import BodyTypeOut, CityOut, GarmentTypeOption, Option, WardrobeOptionsOut

router = APIRouter(prefix="/meta", tags=["meta"])

_STYLE_LABELS = {
    "rajasthani": "Rajasthani",
    "south_indian": "South Indian",
    "punjabi": "Punjabi",
    "mumbai_minimal": "Mumbai Minimal",
    "pan_india_fusion": "Pan-India Fusion",
}
_SEASON_LABELS = {
    "summer": "Summer",
    "monsoon": "Monsoon",
    "winter": "Winter",
    "all_season": "All season",
}


def _title(slug: str) -> str:
    return slug.replace("_", " ").title()


@router.get("/wardrobe-options", response_model=WardrobeOptionsOut)
async def wardrobe_options() -> WardrobeOptionsOut:
    return WardrobeOptionsOut(
        garment_types=[
            GarmentTypeOption(slug=g["slug"], label=g["label"], gender=g.get("gender", "unisex"))
            for g in knowledge.garment_types()
        ]
        + [GarmentTypeOption(slug="other", label="Other", gender="unisex")],
        fabrics=[Option(slug=s, label=_title(s)) for s in knowledge.fabric_slugs()]
        + [Option(slug="other", label="Other")],
        occasions=[Option(slug=o["slug"], label=o["label"]) for o in knowledge.occasions()],
        seasons=[Option(slug=s, label=_SEASON_LABELS[s]) for s in knowledge.SEASONS],
        colors=[Option(slug=c, label=_title(c)) for c in knowledge.COLORS],
        regional_styles=[Option(slug=s, label=_STYLE_LABELS[s]) for s in knowledge.REGIONAL_STYLES],
        conditions=[Option(slug=c.value, label=_title(c.value)) for c in GarmentCondition],
    )


@router.get("/cities", response_model=list[CityOut])
async def cities() -> list[CityOut]:
    return [CityOut(**c) for c in knowledge.cities()]


@router.get("/body-types", response_model=list[BodyTypeOut])
async def body_types(gender: str | None = None) -> list[BodyTypeOut]:
    """Body types (with fit guidance) for onboarding; men and women differ."""
    return [BodyTypeOut(**b) for b in knowledge.body_types_for(gender)]
