"""
/commerce — gap analysis (Plus), affiliate links and click tracking.
ROI and scan mode follow in weeks 20–24.
"""
import base64
import binascii
import uuid
from typing import Annotated

from fastapi import APIRouter, File, Header, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, Field

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
    ScanOut,
)
from app.schemas.common import Message
from app.services import (
    affiliate_service,
    analytics,
    gap_service,
    purchase_service,
    scan_service,
    wardrobe_service,
)
from app.services.entitlements import require_feature
from app.services.image_service import InvalidImageError
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
        gap_type=gap_type,
        color=color,
        fabric=fabric,
        budget_inr=budget,
        platforms=platforms,
        gender=user.gender.value,
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
        color=body.color,
        fabric=body.fabric,
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
            # Plan (weeks 18–19): the purchased piece joins the wardrobe automatically
            user = await db.get(User, click.user_id)
            if user:
                garment = await purchase_service.add_purchased_garment(db, user, click)
                if garment is not None:
                    unlocked = await purchase_service.outfits_unlocked(db, user, garment)
                    await purchase_service.notify_added(user, garment, unlocked)
                elif user.fcm_token:
                    await get_notifier().send(
                        user.fcm_token,
                        Push(
                            title="Bought it? Add it to your wardrobe",
                            body="Snap a photo of your new piece so today's looks can use it.",
                            data={"url": "pehno://wardrobe/upload"},
                        ),
                    )
    return Message(message="ok")


def _scan_out(r) -> ScanOut:
    return ScanOut(
        garment_type=r.garment_type,
        fabric_type=r.fabric_type,
        color_primary=r.color_primary,
        color_accent=r.color_accent,
        confidence=r.confidence,
        occasion_tags=r.occasion_tags,
        season_tags=r.season_tags,
        compatibility=r.compatibility,
        pairs_with=[wardrobe_service.to_out(g) for g in r.pairs_with],
        new_outfits=r.new_outfits,
        wardrobe_size=r.wardrobe_size,
        duplicate=wardrobe_service.to_out(r.duplicate) if r.duplicate else None,
        duplicate_reason=r.duplicate_reason,
        weather_note=r.weather_note,
        verdict=r.verdict,
        rationale=r.rationale,
    )


class ScanBase64In(BaseModel):
    image_base64: str = Field(min_length=64)


async def _scan(db, user, data: bytes) -> ScanOut:
    require_feature(user, "scan_mode")
    if len(data) > settings.MAX_UPLOAD_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Image too large")
    try:
        r = await scan_service.scan(db, user, data)
    except InvalidImageError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(e)) from e
    return _scan_out(r)


@router.post("/scan/base64", response_model=ScanOut)
async def scan_base64(body: ScanBase64In, user: CurrentUser, db: DbSession) -> ScanOut:
    """Scan mode with the spec's JSON shape: `{image_base64}` (data-URL prefix tolerated)."""
    try:
        data = base64.b64decode(body.image_base64.split(",")[-1], validate=True)
    except (binascii.Error, ValueError) as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Bad base64 image") from e
    return await _scan(db, user, data)


@router.post("/scan", response_model=ScanOut)
async def scan(
    user: CurrentUser,
    db: DbSession,
    file: Annotated[UploadFile, File(description="Photo or screenshot of the item")],
) -> ScanOut:
    """
    Shopping scan mode (Pro): does this item work with what I own? Reuses the
    garment classifier, then scores compatibility against the user's wardrobe.
    """
    return await _scan(db, user, await file.read())
