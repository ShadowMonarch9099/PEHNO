"""
/commerce — gap analysis (Plus). Affiliate links, ROI and scan mode follow in
weeks 18–24.
"""
from typing import Annotated

from fastapi import APIRouter, Query

from app.core.security import CurrentUser, DbSession
from app.schemas.commerce import GapReportOut
from app.services import gap_service
from app.services.entitlements import require_feature

router = APIRouter(prefix="/commerce", tags=["commerce"])


@router.get("/gap-report", response_model=GapReportOut)
async def gap_report(
    user: CurrentUser,
    db: DbSession,
    budget: Annotated[int | None, Query(ge=100, le=100_000, description="Max spend in INR")] = None,
    refresh: bool = False,
) -> GapReportOut:
    """
    Top 5 missing pieces with rationale. Plus/Pro only (free users get a 402 the
    client renders as a locked preview). Cached weekly; recomputed when the
    wardrobe grows by 3+ items, when a budget is given, or with refresh=true.
    """
    require_feature(user, "gap_report")
    report = await gap_service.get_report(db, user, budget_inr=budget, force=refresh)
    hint = None
    if report["wardrobe_size"] < 5:
        hint = "Gap analysis gets sharper after ~10 labelled garments."
    elif not report["gaps"]:
        hint = "Your wardrobe already covers every occasion we know — nice."
    return GapReportOut(**report, hint=hint)
