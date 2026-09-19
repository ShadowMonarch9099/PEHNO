import uuid
from datetime import date
from decimal import Decimal
from typing import ClassVar

from pydantic import BaseModel, Field, field_validator

from app import knowledge
from app.models.garment import ClassificationStatus, GarmentCondition
from app.schemas.common import APIModel, Money, UTCDateTime


class CareProfile(BaseModel):
    wash: str = ""
    iron: str = ""
    storage: str = ""
    dry_clean: bool = False
    notes: str = ""


class GarmentOut(APIModel):
    id: uuid.UUID
    image_url: str
    thumbnail_url: str | None
    garment_type: str
    fabric_type: str
    color_primary: str
    color_accent: str | None
    occasion_tags: list[str]
    season_tags: list[str]
    regional_style: str | None
    ai_confidence: float
    classification_status: ClassificationStatus
    user_verified: bool
    care_profile: dict
    ai_labels: dict | None
    classified_at: UTCDateTime | None
    purchase_price: Money | None
    purchase_date: date | None
    condition: GarmentCondition
    notes: str | None
    wear_count: int
    last_worn_at: UTCDateTime | None
    cost_per_wear: Money | None
    created_at: UTCDateTime
    updated_at: UTCDateTime


class GarmentListOut(BaseModel):
    items: list[GarmentOut]
    total: int
    page: int
    page_size: int


class GarmentUpdate(BaseModel):
    """
    PUT /wardrobe/{id}. Any classification field the user sets marks the garment
    user_verified (their word beats the model's).
    """

    garment_type: str | None = None
    fabric_type: str | None = None
    color_primary: str | None = None
    color_accent: str | None = None
    occasion_tags: list[str] | None = None
    season_tags: list[str] | None = None
    regional_style: str | None = None
    purchase_price: Decimal | None = Field(default=None, ge=0, le=10_000_000)
    purchase_date: date | None = None
    condition: GarmentCondition | None = None
    notes: str | None = Field(default=None, max_length=1000)

    CLASSIFICATION_FIELDS: ClassVar[frozenset[str]] = frozenset(
        {
            "garment_type",
            "fabric_type",
            "color_primary",
            "color_accent",
            "occasion_tags",
            "season_tags",
            "regional_style",
        }
    )

    @field_validator("garment_type")
    @classmethod
    def _type(cls, v):
        if v is not None and v not in knowledge.garment_type_slugs() | {"other"}:
            raise ValueError(f"Unknown garment type '{v}'")
        return v

    @field_validator("fabric_type")
    @classmethod
    def _fabric(cls, v):
        if v is not None and v not in knowledge.fabric_slugs() | {"other"}:
            raise ValueError(f"Unknown fabric '{v}'")
        return v

    @field_validator("occasion_tags")
    @classmethod
    def _occasions(cls, v):
        if v is not None:
            bad = set(v) - knowledge.occasion_slugs()
            if bad:
                raise ValueError(f"Unknown occasions: {sorted(bad)}")
            return sorted(set(v))
        return v

    @field_validator("season_tags")
    @classmethod
    def _seasons(cls, v):
        if v is not None:
            bad = set(v) - set(knowledge.SEASONS)
            if bad:
                raise ValueError(f"Unknown seasons: {sorted(bad)}")
            return sorted(set(v))
        return v

    @field_validator("regional_style")
    @classmethod
    def _style(cls, v):
        if v is not None and v not in knowledge.REGIONAL_STYLES:
            raise ValueError(f"Unknown regional style '{v}'")
        return v


class UploadResultOut(BaseModel):
    created: list[GarmentOut]
    rejected: list[dict]  # {"filename": ..., "reason": ...}
