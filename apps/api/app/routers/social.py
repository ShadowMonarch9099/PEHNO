"""
/social — share cards, city feed, likes (feature-flagged: SOCIAL_ENABLED).
/s/{slug} — public share page (OG tags) and card image; no auth.
"""
import html
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import HTMLResponse, Response
from pydantic import BaseModel

from app.core.config import settings
from app.core.security import CurrentUser, DbSession
from app.schemas.common import Message, UTCDateTime
from app.schemas.garment import GarmentOut
from app.services import outfit_service, social_service, wardrobe_service
from app.services.storage import get_storage


def require_social() -> None:
    if not settings.SOCIAL_ENABLED:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Social features are not enabled")


router = APIRouter(prefix="/social", tags=["social"], dependencies=[Depends(require_social)])
public = APIRouter(prefix="/s", tags=["social"], include_in_schema=False)


class ShareOut(BaseModel):
    outfit_id: uuid.UUID
    is_public: bool
    share_url: str | None
    card_url: str | None
    shared_at: UTCDateTime | None
    like_count: int


class FeedItemOut(BaseModel):
    outfit_id: uuid.UUID
    owner_first_name: str
    city: str
    aesthetic: str
    occasion: str
    festival: str | None
    card_url: str | None
    share_url: str | None
    garments: list[GarmentOut]  # metadata + images the owner chose to share
    like_count: int
    liked: bool
    shared_at: UTCDateTime | None


def _share_out(o) -> ShareOut:
    return ShareOut(
        outfit_id=o.id,
        is_public=o.is_public,
        share_url=social_service.share_url(o) if o.is_public else None,
        card_url=social_service.card_url(o) if o.is_public else None,
        shared_at=o.shared_at,
        like_count=o.like_count,
    )


@router.post("/share-card/{outfit_id}", response_model=ShareOut)
async def share_card(outfit_id: uuid.UUID, user: CurrentUser, db: DbSession) -> ShareOut:
    """Render the item-tagged card and make the look public. Returns share + card URLs."""
    outfit = await outfit_service.get_owned(db, user, outfit_id)
    return _share_out(await social_service.share(db, user, outfit))


@router.delete("/share-card/{outfit_id}", response_model=ShareOut)
async def unshare(outfit_id: uuid.UUID, user: CurrentUser, db: DbSession) -> ShareOut:
    outfit = await outfit_service.get_owned(db, user, outfit_id)
    return _share_out(await social_service.unshare(db, outfit))


@router.get("/feed/city", response_model=list[FeedItemOut])
async def city_feed(
    user: CurrentUser,
    db: DbSession,
    city: str | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[FeedItemOut]:
    """Recent shared looks from the viewer's city (or `city=`), newest first."""
    entries = await social_service.city_feed(db, user, city=city, limit=limit)
    return [
        FeedItemOut(
            outfit_id=e.outfit.id,
            owner_first_name=(e.owner.name or "Someone").split(" ")[0],
            city=e.owner.city,
            aesthetic=social_service.city_aesthetic(e.owner.city),
            occasion=e.outfit.occasion,
            festival=e.outfit.festival,
            card_url=social_service.card_url(e.outfit),
            share_url=social_service.share_url(e.outfit),
            garments=[wardrobe_service.to_out(g) for g in e.garments],
            like_count=e.outfit.like_count,
            liked=e.liked,
            shared_at=e.outfit.shared_at,
        )
        for e in entries
    ]


@router.post("/like/{outfit_id}", response_model=ShareOut)
async def like(outfit_id: uuid.UUID, user: CurrentUser, db: DbSession) -> ShareOut:
    from app.models.outfit import Outfit

    outfit = await db.get(Outfit, outfit_id)
    if outfit is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Outfit not found")
    return _share_out(await social_service.like(db, user, outfit))


@router.delete("/like/{outfit_id}", response_model=ShareOut)
async def unlike(outfit_id: uuid.UUID, user: CurrentUser, db: DbSession) -> ShareOut:
    from app.models.outfit import Outfit

    outfit = await db.get(Outfit, outfit_id)
    if outfit is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Outfit not found")
    return _share_out(await social_service.unlike(db, user, outfit))


class SharingPrefIn(BaseModel):
    enabled: bool


@router.put("/preferences", response_model=Message)
async def sharing_preferences(body: SharingPrefIn, user: CurrentUser, db: DbSession) -> Message:
    """Opt in/out of pre-generating share cards when saving looks."""
    user.social_sharing_enabled = body.enabled
    await db.flush()
    return Message(message="ok")


# ── public share page (no auth; only shared looks resolve) ───────────────────


@public.get("/{slug}/card.jpg")
async def public_card(slug: str, db: DbSession) -> Response:
    if not settings.SOCIAL_ENABLED:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    outfit, _, _ = await social_service.public_outfit(db, slug)
    if not outfit.share_card_key:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    data = await get_storage().get(outfit.share_card_key)
    return Response(
        data, media_type="image/jpeg", headers={"Cache-Control": "public, max-age=3600"}
    )


@public.get("/{slug}", response_class=HTMLResponse)
async def public_page(slug: str, db: DbSession) -> HTMLResponse:
    """Minimal page with Open Graph tags so WhatsApp/Instagram unfurl the card."""
    if not settings.SOCIAL_ENABLED:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    outfit, owner, garments = await social_service.public_outfit(db, slug)
    first = html.escape((owner.name or "A Pehno user").split(" ")[0])
    city = html.escape(owner.city)
    card = social_service.card_url(outfit) or ""
    title = f"{first}'s {html.escape(outfit.occasion.replace('_', ' '))} look on PEHNO"
    items = "".join(
        f"<li>{html.escape(g.color_primary)} {html.escape(g.fabric_type.replace('_', ' '))} "
        f"{html.escape(g.garment_type.replace('_', ' '))}</li>"
        for g in garments
    )
    page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>{title}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta property="og:title" content="{title}">
<meta property="og:description" content="Built from a real wardrobe in {city}. Every piece tagged.">
<meta property="og:image" content="{card}">
<meta property="og:type" content="article">
<meta name="twitter:card" content="summary_large_image">
<style>body{{font-family:system-ui,sans-serif;background:#fff8f1;color:#1e1b15;margin:0;padding:24px;max-width:520px;margin:auto}}
img{{width:100%;border-radius:20px}}h1{{font-size:20px}}a{{color:#964900}}li{{text-transform:capitalize}}</style></head>
<body><h1>{title}</h1><img src="{card}" alt="Outfit card"><h2>The pieces</h2><ul>{items}</ul>
<p>Never wonder what to wear again — <a href="https://pehno.in">get PEHNO</a>.</p></body></html>"""
    return HTMLResponse(page)
