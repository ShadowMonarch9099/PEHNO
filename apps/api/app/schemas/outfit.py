import uuid
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app import knowledge
from app.schemas.common import APIModel, UTCDateTime
from app.schemas.garment import GarmentOut


class WeatherOut(BaseModel):
    city: str
    temp_c: float
    feels_like_c: float
    humidity: int
    condition: str
    season: str
    source: str
    description: str
    fabric_tip: str


class OutfitOut(APIModel):
    id: uuid.UUID
    occasion: str
    festival: str | None
    garments: list[GarmentOut]
    weather_condition: str
    temperature_celsius: int
    season: str
    score: float
    rationale: list[str]
    feedback: int | None
    is_saved: bool
    is_daily: bool
    for_date: str | None
    batch_id: uuid.UUID | None
    worn_at: UTCDateTime | None
    created_at: UTCDateTime


class OutfitOptionsOut(BaseModel):
    weather: WeatherOut
    options: list[OutfitOut]
    batch_id: uuid.UUID | None
    #: Set when the wardrobe can't produce an outfit yet (e.g. "Add a bottom to pair with your kurtis").
    hint: str | None = None


class GenerateIn(BaseModel):
    occasion: str = Field(..., examples=["office"])
    festival: str | None = None
    limit: int = Field(default=3, ge=1, le=5)

    @field_validator("occasion")
    @classmethod
    def _occasion(cls, v: str) -> str:
        if v not in knowledge.occasion_slugs():
            raise ValueError(f"Unknown occasion '{v}'")
        return v


class FeedbackIn(BaseModel):
    value: Literal[1, -1]


class OutfitListOut(BaseModel):
    items: list[OutfitOut]
    total: int
    page: int
    page_size: int
