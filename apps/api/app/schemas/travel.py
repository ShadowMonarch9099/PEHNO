import uuid
from datetime import date

from pydantic import BaseModel, Field, model_validator

from app.schemas.commerce import GapOut
from app.schemas.common import APIModel, UTCDateTime
from app.schemas.garment import GarmentOut
from app.schemas.outfit import WeatherOut


class DestinationOut(BaseModel):
    slug: str
    name: str
    vibe: str
    context: str
    default_activities: list[str]


class PackingRequest(BaseModel):
    destination: str = Field(min_length=2, max_length=80)
    start_date: date
    end_date: date
    #: occasion slugs; day-type ones (casual/office/temple…) fill days, the rest are event evenings
    activities: list[str] = Field(default_factory=list, max_length=12)
    max_items: int = Field(default=15, ge=6, le=30)

    @model_validator(mode="after")
    def _dates(self):
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        if (self.end_date - self.start_date).days + 1 > 21:
            raise ValueError("Plans cover up to 21 days")
        return self


class DayWeatherOut(BaseModel):
    day: int
    date: date
    weather: WeatherOut


class LookOut(BaseModel):
    day: int
    date: date
    part: str  # day | evening
    occasion: str
    occasion_label: str
    garment_ids: list[str]
    score: float
    rationale: list[str]


class PackedItemOut(BaseModel):
    garment: GarmentOut
    role: str  # full | top | bottom | layer — for grouping the list
    wears: int  # how many trip looks use it
    days: list[int]


class TravelPlanOut(APIModel):
    id: uuid.UUID
    destination: str
    destination_slug: str
    vibe: str
    context: str
    tips: list[str]
    palette: list[str]
    start_date: date
    end_date: date
    days: int
    activities: list[str]
    weather_summary: str
    weather: list[DayWeatherOut]
    items: list[PackedItemOut]
    item_count: int
    look_count: int  # distinct looks the capsule can make on this trip
    looks: list[LookOut]  # one per day / event evening
    unfilled: list[LookOut]  # slots nothing in the wardrobe could dress
    gaps: list[GapOut]
    hint: str | None = None
    created_at: UTCDateTime


class TravelPlanSummaryOut(APIModel):
    id: uuid.UUID
    destination: str
    start_date: date
    end_date: date
    days: int
    item_count: int
    look_count: int
    gap_count: int
    created_at: UTCDateTime
