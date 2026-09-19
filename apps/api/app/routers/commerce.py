"""
/commerce — gap analysis (Plus), affiliate links and click tracking.
ROI and scan mode follow in weeks 20–24.
"""
import uuid
from typing import Annotated

from fastapi import APIRouter, Header, HTTPException, Query, status

from app import knowledge
from app.core.config import settings
from app.core.database import utcnow
from app.core.security import CurrentUser, DbSession
from app.models.commerce import AffiliateClick, AffiliatePlatform
from app.models.user import User
from app.schemas.commerce import (
    AffiliateClickIn,
    AffiliateClickOut,
    AffiliateLinksOut,
    ConversionPostbackIn,
    GapReportOut,
    ProductCardOut,
)
from app.schemas.common import Message
from app.services import affiliate_service, analytics, gap_service
from app.services.entitlements import require_feature
from app.services.notifications import Push, get_notifier

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


@router.get("/affiliate-links", response_model=AffiliateLinksOut)
async def affiliate_links(
    user: CurrentUser,
    gap_type: str,
    color: str | None = None,
    fabric: str | None = None,
    budget: Annotated[int | None, Query(ge=100, le=100_000)] = None,
    platform: str | None = None,
) -> AffiliateLinksOut:
    """Curated buying options for a gap. Plus/Pro (it belongs to the gap report)."""
    require_feature(user, "gap_report")
    if gap_type not in knowledge.garment_type_slugs():
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, f"Unknown garment type '{gap_type}'"
        )
    platforms = affiliate_service.platforms_for_budget(budget)
    if platform:
        try:
            platforms = [AffiliatePlatform(platform)]
        except ValueError as e:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY, f"Unknown platform '{platform}'"
            ) from e
    cards = affiliate_service.get_product_source().cards(
        gap_type=gap_type, color=color, fabric=fabric, budget_inr=budget, platforms=platforms
    )
    untracked = not (
        settings.AFFILIATE_NETWORK_TEMPLATE
        or any(
            [
                settings.MYNTRA_AFFILIATE_ID,
                settings.AJIO_AFFILIATE_ID,
                settings.NYKAA_AFFILIATE_ID,
                settings.MEESHO_AFFILIATE_ID,
            ]
        )
    )
    analytics.track(
        user.id, "affiliate_links_viewed", gap_type=gap_type, budget=budget, cards=len(cards)
    )
    return AffiliateLinksOut(
        gap_type=gap_type,
        color=color,
        fabric=fabric,
        budget_inr=budget,
        cards=[
            ProductCardOut(
                platform=c.platform.value,
                platform_label=c.platform_label,
                name=c.name,
                query=c.query,
                product_url=c.product_url,
                price_min_inr=c.price_min_inr,
                price_max_inr=c.price_max_inr,
                image_url=c.image_url,
                is_search=c.is_search,
            )
            for c in cards
        ],
        untracked=untracked,
    )


@router.post(
    "/affiliate-click", response_model=AffiliateClickOut, status_code=status.HTTP_201_CREATED
)
async def affiliate_click(
    body: AffiliateClickIn, user: CurrentUser, db: DbSession
) -> AffiliateClickOut:
    """Log an outbound click and return the tracked URL to open. The click id is the network subid."""
    try:
        platform = AffiliatePlatform(body.platform)
    except ValueError as e:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, f"Unknown platform '{body.platform}'"
        ) from e
    if not body.product_url.startswith("https://"):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "product_url must be https")
    click = AffiliateClick(
        user_id=user.id,
        garment_id=uuid.UUID(body.garment_id) if body.garment_id else None,
        gap_type=body.gap_type,
        platform=platform,
        product_url=body.product_url,
        affiliate_url="",
        clicked_at=utcnow(),
    )
    db.add(click)
    await db.flush()
    click.affiliate_url = affiliate_service.affiliate_url(body.product_url, platform, str(click.id))
    await db.flush()
    analytics.track(user.id, "affiliate_click", platform=platform.value, gap_type=body.gap_type)
    return AffiliateClickOut(click_id=str(click.id), affiliate_url=click.affiliate_url)


@router.post("/affiliate-conversion", response_model=Message, include_in_schema=False)
async def affiliate_conversion(
    body: ConversionPostbackIn,
    db: DbSession,
    x_postback_secret: Annotated[str | None, Header()] = None,
) -> Message:
    """Network postback: mark a click converted. Shared-secret protected; idempotent."""
    if (
        not settings.AFFILIATE_POSTBACK_SECRET
        or x_postback_secret != settings.AFFILIATE_POSTBACK_SECRET
    ):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Bad postback secret")
    try:
        click = await db.get(AffiliateClick, uuid.UUID(body.subid))
    except ValueError:
        click = None
    if click is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown subid")
    if not click.converted:
        click.converted = True
        click.converted_at = utcnow()
        click.order_value_inr = body.order_value_inr
        click.commission_inr = body.commission_inr
        await db.flush()
        if click.user_id:
            analytics.track(
                click.user_id,
                "affiliate_conversion",
                platform=click.platform.value,
                value=body.order_value_inr,
            )
            # Plan: "auto-add purchased item after click-through" — without the partner's
            # product feed we can't fabricate the garment, so prompt the user to snap it.
            user = await db.get(User, click.user_id)
            if user and user.fcm_token:
                label = (click.gap_type or "new piece").replace("_", " ")
                await get_notifier().send(
                    user.fcm_token,
                    Push(
                        title="Bought it? Add it to your wardrobe",
                        body=f"Snap a photo of your new {label} so today's looks can use it.",
                        data={"url": "pehno://wardrobe/upload", "gap_type": click.gap_type or ""},
                    ),
                )
    return Message(message="ok")
