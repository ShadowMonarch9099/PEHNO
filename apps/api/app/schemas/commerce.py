from pydantic import BaseModel

from app.schemas.garment import GarmentOut


class GapOut(BaseModel):
    rank: int
    garment_type: str
    label: str
    occasions: list[str]
    new_outfits: int
    score: float
    suggested_colors: list[str]
    suggested_fabrics: list[str]
    typical_price_inr: tuple[int, int]
    rationale: str


class GapReportOut(BaseModel):
    computed_at: str
    cached: bool
    wardrobe_size: int
    current_outfits: int
    budget_inr: int | None
    gaps: list[GapOut]
    #: [garment_id, combinations] — the pieces doing the most work in the wardrobe
    most_versatile: list[tuple[str, int]]
    hint: str | None = None


class ProductCardOut(BaseModel):
    platform: str
    platform_label: str
    name: str
    query: str
    product_url: str
    price_min_inr: int | None
    price_max_inr: int | None
    image_url: str | None
    is_search: bool


class AffiliateLinksOut(BaseModel):
    gap_type: str
    color: str | None
    fabric: str | None
    budget_inr: int | None
    cards: list[ProductCardOut]
    #: True when no network/affiliate ids are configured — links are plain (untracked) searches
    untracked: bool


class AffiliateClickIn(BaseModel):
    platform: str
    product_url: str
    gap_type: str | None = None
    garment_id: str | None = None
    color: str | None = None
    fabric: str | None = None


class AffiliateClickOut(BaseModel):
    click_id: str
    affiliate_url: str


class ConversionPostbackIn(BaseModel):
    subid: str
    order_value_inr: int | None = None
    commission_inr: int | None = None


class ScanOut(BaseModel):
    garment_type: str
    fabric_type: str
    color_primary: str
    color_accent: str | None
    confidence: float
    occasion_tags: list[str]
    season_tags: list[str]
    compatibility: int
    pairs_with: list[GarmentOut]
    new_outfits: int
    wardrobe_size: int
    duplicate: GarmentOut | None
    duplicate_reason: str | None
    weather_note: str
    verdict: str  # buy | maybe | skip
    rationale: list[str]
