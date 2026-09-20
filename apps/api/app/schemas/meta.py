from pydantic import BaseModel


class Option(BaseModel):
    slug: str
    label: str


class GarmentTypeOption(Option):
    gender: str  # women | men | unisex — clients filter chips by the user's gender


class BodyTypeOut(BaseModel):
    slug: str
    label: str
    description: str
    silhouette: str
    prefer: list[str]
    avoid: list[str]
    tips: list[str]


class WardrobeOptionsOut(BaseModel):
    garment_types: list[GarmentTypeOption]
    fabrics: list[Option]
    occasions: list[Option]
    seasons: list[Option]
    colors: list[Option]
    regional_styles: list[Option]
    conditions: list[Option]


class CityOut(BaseModel):
    slug: str
    name: str
    state: str
    region: str
    regional_style: str = "pan_india_fusion"  # onboarding default for this city
    aesthetic: str | None = None
    style_note: str | None = None
    crafts: list[str] = []
