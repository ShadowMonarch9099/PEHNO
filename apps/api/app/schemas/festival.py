from pydantic import BaseModel

from app.schemas.garment import GarmentOut
from app.schemas.outfit import OutfitOut


class FestivalOut(BaseModel):
    slug: str
    name: str
    start_date: str
    end_date: str
    days_until: int
    is_active: bool
    is_relevant: bool
    regions: list[str]
    colors: list[str]
    color_guidance: str
    dress_code: str
    description: str
    occasion_tags: list[str]
    lunar_calendar: bool


class FestivalDetailOut(FestivalOut):
    looks: list[OutfitOut]
    hint: str | None


class NavratriColorOut(BaseModel):
    day: int
    date: str
    key: str
    name: str
    hex: str
    color_slugs: list[str]
    goddess: str | None


class NavratriTodayOut(BaseModel):
    is_active: bool
    starts_on: str | None
    days_until: int | None
    day: int | None
    today: NavratriColorOut | None
    sequence: list[NavratriColorOut]
    matching_garments: list[GarmentOut]
