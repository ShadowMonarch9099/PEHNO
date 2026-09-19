from pydantic import BaseModel


class Option(BaseModel):
    slug: str
    label: str


class WardrobeOptionsOut(BaseModel):
    garment_types: list[Option]
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
