"""
/meta — vocabularies from the knowledge base, so clients never hard-code them.
`lang=hi` returns Hindi labels; slugs are language-independent.
"""
from fastapi import APIRouter, Response

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
_STATIC_CACHE = "public, max-age=86400"


def _title(slug: str) -> str:
    return slug.replace("_", " ").title()


@router.get("/wardrobe-options", response_model=WardrobeOptionsOut)
async def wardrobe_options(response: Response, lang: str | None = None) -> WardrobeOptionsOut:
    hi = knowledge.hindi() if lang == "hi" else None

    def t(group: str, slug: str, default: str) -> str:
        return hi.get(group, {}).get(slug, default) if hi else default

    other = hi["other"] if hi else "Other"
    response.headers["Cache-Control"] = _STATIC_CACHE
    return WardrobeOptionsOut(
        garment_types=[
            GarmentTypeOption(
                slug=g["slug"], label=knowledge.label(g, lang), gender=g.get("gender", "unisex")
            )
            for g in knowledge.garment_types()
        ]
        + [GarmentTypeOption(slug="other", label=other, gender="unisex")],
        fabrics=[Option(slug=s, label=t("fabrics", s, _title(s))) for s in knowledge.fabric_slugs()]
        + [Option(slug="other", label=other)],
        occasions=[
            Option(slug=o["slug"], label=knowledge.label(o, lang)) for o in knowledge.occasions()
        ],
        seasons=[
            Option(slug=s, label=t("seasons", s, _SEASON_LABELS[s])) for s in knowledge.SEASONS
        ],
        colors=[Option(slug=c, label=t("colors", c, _title(c))) for c in knowledge.COLORS],
        regional_styles=[
            Option(slug=s, label=t("regional_styles", s, _STYLE_LABELS[s]))
            for s in knowledge.REGIONAL_STYLES
        ],
        conditions=[
            Option(slug=c.value, label=t("conditions", c.value, _title(c.value)))
            for c in GarmentCondition
        ],
    )


@router.get("/cities", response_model=list[CityOut])
async def cities(response: Response) -> list[CityOut]:
    """Launch cities with their default regional style and local craft notes."""
    response.headers["Cache-Control"] = _STATIC_CACHE
    keep = ("slug", "name", "state", "region", "regional_style", "aesthetic")
    return [
        CityOut(
            **{k: v for k, v in c.items() if k in keep},
            style_note=(c.get("style_profile") or {}).get("note"),
            crafts=(c.get("style_profile") or {}).get("crafts", []),
        )
        for c in knowledge.cities()
    ]


@router.get("/body-types", response_model=list[BodyTypeOut])
async def body_types(gender: str | None = None) -> list[BodyTypeOut]:
    """Body types (with fit guidance) for onboarding; men and women differ."""
    return [BodyTypeOut(**b) for b in knowledge.body_types_for(gender)]
