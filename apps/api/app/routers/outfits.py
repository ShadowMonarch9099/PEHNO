"""
/outfits — daily look, occasion outfits, feedback, saved, history.
"""
import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.core.security import CurrentUser, DbSession
from app.schemas.outfit import FeedbackIn, GenerateIn, OutfitListOut, OutfitOptionsOut, OutfitOut
from app.services import outfit_service as svc
from app.services.festival_service import festival_context

router = APIRouter(prefix="/outfits", tags=["outfits"])


async def _options_out(db, weather, rows, hint, batch_id=None) -> OutfitOptionsOut:
    return OutfitOptionsOut(
        weather=svc.weather_out(weather),
        options=await svc.to_out_many(db, rows),
        batch_id=batch_id if batch_id else (rows[0].batch_id if rows else None),
        hint=hint,
    )


@router.get("/daily", response_model=OutfitOptionsOut)
async def daily(user: CurrentUser, db: DbSession, regenerate: bool = False) -> OutfitOptionsOut:
    """Today's look for the user's city and weather. `regenerate=true` asks for another."""
    weather, rows, hint = await svc.daily(db, user, regenerate=regenerate)
    return await _options_out(db, weather, rows, hint)


@router.post("/generate", response_model=OutfitOptionsOut, status_code=status.HTTP_201_CREATED)
async def generate(body: GenerateIn, user: CurrentUser, db: DbSession) -> OutfitOptionsOut:
    festival = await festival_context(db, body.festival) if body.festival else None
    if body.festival and festival is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown festival '{body.festival}'")
    weather, rows, hint = await svc.generate(
        db, user, occasion=body.occasion, festival=festival, limit=body.limit
    )
    return await _options_out(db, weather, rows, hint)


@router.get("/history", response_model=OutfitListOut)
async def history(
    user: CurrentUser,
    db: DbSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> OutfitListOut:
    rows, total = await svc.list_outfits(db, user, page=page, page_size=page_size)
    return OutfitListOut(
        items=await svc.to_out_many(db, rows), total=total, page=page, page_size=page_size
    )


@router.get("/saved", response_model=OutfitListOut)
async def saved(
    user: CurrentUser,
    db: DbSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> OutfitListOut:
    rows, total = await svc.list_outfits(db, user, saved_only=True, page=page, page_size=page_size)
    return OutfitListOut(
        items=await svc.to_out_many(db, rows), total=total, page=page, page_size=page_size
    )


@router.get("/{outfit_id}", response_model=OutfitOut)
async def get_outfit(outfit_id: uuid.UUID, user: CurrentUser, db: DbSession) -> OutfitOut:
    return await svc.to_out(db, await svc.get_owned(db, user, outfit_id))


@router.post("/{outfit_id}/feedback", response_model=OutfitOut)
async def feedback(
    outfit_id: uuid.UUID, body: FeedbackIn, user: CurrentUser, db: DbSession
) -> OutfitOut:
    """Like (+1) / dislike (-1). Feeds the personalisation layer."""
    outfit = await svc.get_owned(db, user, outfit_id)
    return await svc.to_out(db, await svc.set_feedback(db, outfit, body.value))


@router.post("/{outfit_id}/save", response_model=OutfitOut)
async def save(outfit_id: uuid.UUID, user: CurrentUser, db: DbSession) -> OutfitOut:
    outfit = await svc.get_owned(db, user, outfit_id)
    return await svc.to_out(db, await svc.toggle_saved(db, outfit, True))


@router.delete("/{outfit_id}/save", response_model=OutfitOut)
async def unsave(outfit_id: uuid.UUID, user: CurrentUser, db: DbSession) -> OutfitOut:
    outfit = await svc.get_owned(db, user, outfit_id)
    return await svc.to_out(db, await svc.toggle_saved(db, outfit, False))


@router.post("/{outfit_id}/wear", response_model=OutfitOut)
async def wear(outfit_id: uuid.UUID, user: CurrentUser, db: DbSession) -> OutfitOut:
    """'Wearing this today' — logs a wear on each garment and counts as a like."""
    outfit = await svc.get_owned(db, user, outfit_id)
    return await svc.to_out(db, await svc.wear(db, outfit))
