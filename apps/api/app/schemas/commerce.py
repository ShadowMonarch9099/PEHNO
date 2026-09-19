from pydantic import BaseModel


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
