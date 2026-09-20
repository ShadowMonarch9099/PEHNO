import uuid
from datetime import datetime

from pydantic import BaseModel, Field, HttpUrl

from app.models.brand import BrandStatus, CampaignKind, CampaignStatus
from app.schemas.common import APIModel, UTCDateTime

# ── campaign config (stored as JSON on BrandCampaign.config) ─────────────────


class Product(BaseModel):
    name: str = Field(max_length=120)
    url: HttpUrl
    price_inr: int | None = Field(default=None, ge=0)
    image_url: HttpUrl | None = None
    garment_type: str | None = None
    color: str | None = None


class Target(BaseModel):
    """Empty lists mean 'everyone'."""

    cities: list[str] = []
    tiers: list[str] = []  # free | plus | pro
    regional_styles: list[str] = []
    genders: list[str] = []  # female | male | other


class ChallengeRules(BaseModel):
    goal: int = Field(default=5, ge=1, le=30)  # outfits to submit
    occasion: str | None = None  # submitted outfits must be for this occasion
    garment_types: list[str] = []  # an outfit qualifies if it contains one of these …
    fabrics: list[str] = []  # … in one of these fabrics (if set)
    brand_match: bool = False  # … or a garment whose `brand` is the partner


class CampaignConfig(BaseModel):
    description: str = Field(default="", max_length=2000)
    hero_image_url: HttpUrl | None = None
    cta_url: HttpUrl | None = None
    cta_label: str = Field(default="Shop the collection", max_length=40)
    hashtag: str | None = Field(default=None, max_length=40)
    reward_text: str | None = Field(default=None, max_length=200)
    target: Target = Target()
    products: list[Product] = Field(default_factory=list, max_length=24)
    challenge: ChallengeRules = ChallengeRules()


# ── admin CMS ────────────────────────────────────────────────────────────────


class BrandIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    website: HttpUrl | None = None
    contact_email: str | None = None
    notes: str | None = None
    tagline: str | None = Field(default=None, max_length=160)
    logo_url: HttpUrl | None = None


class BrandPatch(BaseModel):
    status: BrandStatus | None = None
    website: HttpUrl | None = None
    contact_email: str | None = None
    notes: str | None = None
    tagline: str | None = Field(default=None, max_length=160)
    logo_url: HttpUrl | None = None


class CampaignIn(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    kind: CampaignKind = CampaignKind.challenge
    status: CampaignStatus = CampaignStatus.draft
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    config: CampaignConfig = CampaignConfig()


class CampaignPatch(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=160)
    kind: CampaignKind | None = None
    status: CampaignStatus | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    config: CampaignConfig | None = None


# ── app-facing ───────────────────────────────────────────────────────────────


class BrandOut(APIModel):
    id: uuid.UUID
    name: str
    slug: str
    tagline: str | None
    logo_url: str | None
    website: str | None


class EntryOut(APIModel):
    joined_at: UTCDateTime
    progress: int
    goal: int
    outfit_ids: list[str]
    completed_at: UTCDateTime | None


class CampaignOut(BaseModel):
    id: uuid.UUID
    brand: BrandOut
    title: str
    kind: CampaignKind
    status: CampaignStatus
    starts_at: UTCDateTime | None
    ends_at: UTCDateTime | None
    description: str
    hero_image_url: str | None
    cta_url: str | None  # already affiliate/utm-wrapped for this user
    cta_label: str
    hashtag: str | None
    reward_text: str | None
    products: list[Product]
    challenge: ChallengeRules | None  # None for collections
    rules_text: str | None  # human sentence: "Any look with a linen kurta or palazzo"
    entry: EntryOut | None  # the viewer's participation
    participants: int


class SubmitIn(BaseModel):
    outfit_id: uuid.UUID


class ClickIn(BaseModel):
    product_index: int | None = Field(default=None, ge=0)  # None → the CTA


class ClickOut(BaseModel):
    url: str
