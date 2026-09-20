"""
/brands — sponsored challenges and curated collections for the user's segment.
"""
import uuid

from fastapi import APIRouter

from app.core.security import CurrentUser, DbSession
from app.models.brand import CampaignKind
from app.schemas.brand import (
    BrandOut,
    CampaignOut,
    ClickIn,
    ClickOut,
    EntryOut,
    SubmitIn,
)
from app.services import brand_service as svc
from app.services import outfit_service

router = APIRouter(prefix="/brands", tags=["brands"])


def _out(view: svc.CampaignView, user) -> CampaignOut:
    c, cfg = view.campaign, svc.config_of(view.campaign)
    is_challenge = c.kind == CampaignKind.challenge.value
    entry = view.entry
    return CampaignOut(
        id=c.id,
        brand=BrandOut.model_validate(view.brand),
        title=c.title,
        kind=CampaignKind(c.kind),
        status=c.status,
        starts_at=c.starts_at,
        ends_at=c.ends_at,
        description=cfg.description,
        hero_image_url=str(cfg.hero_image_url) if cfg.hero_image_url else None,
        cta_url=svc.tracked_url(str(cfg.cta_url), f"u{str(user.id)[:8]}") if cfg.cta_url else None,
        cta_label=cfg.cta_label,
        hashtag=cfg.hashtag,
        reward_text=cfg.reward_text,
        products=cfg.products,
        challenge=cfg.challenge if is_challenge else None,
        rules_text=svc.rules_text(c, cfg),
        entry=EntryOut(
            joined_at=entry.joined_at,
            progress=entry.progress,
            goal=cfg.challenge.goal,
            outfit_ids=entry.outfit_ids,
            completed_at=entry.completed_at,
        )
        if entry
        else None,
        participants=view.participants,
    )


@router.get("/campaigns", response_model=list[CampaignOut])
async def campaigns(user: CurrentUser, db: DbSession) -> list[CampaignOut]:
    """Live challenges + collections targeted at this user (city / tier / style / gender)."""
    return [_out(v, user) for v in await svc.live_for(db, user)]


@router.get("/campaigns/{campaign_id}", response_model=CampaignOut)
async def campaign(campaign_id: uuid.UUID, user: CurrentUser, db: DbSession) -> CampaignOut:
    return _out(await svc.get_view(db, user, campaign_id), user)


@router.post("/campaigns/{campaign_id}/join", response_model=CampaignOut)
async def join(campaign_id: uuid.UUID, user: CurrentUser, db: DbSession) -> CampaignOut:
    view = await svc.get_view(db, user, campaign_id)
    await svc.join(db, user, view)
    return _out(await svc.get_view(db, user, campaign_id), user)


@router.post("/campaigns/{campaign_id}/submit", response_model=CampaignOut)
async def submit(
    campaign_id: uuid.UUID, body: SubmitIn, user: CurrentUser, db: DbSession
) -> CampaignOut:
    """Count one of your outfits toward the challenge (422 if it doesn't qualify)."""
    view = await svc.get_view(db, user, campaign_id)
    outfit = await outfit_service.get_owned(db, user, body.outfit_id)
    await svc.submit(db, user, view, outfit)
    return _out(await svc.get_view(db, user, campaign_id), user)


@router.post("/campaigns/{campaign_id}/click", response_model=ClickOut)
async def click(
    campaign_id: uuid.UUID, body: ClickIn, user: CurrentUser, db: DbSession
) -> ClickOut:
    """Record a click-through and return the tracked URL to open."""
    view = await svc.get_view(db, user, campaign_id)
    return ClickOut(url=await svc.click(db, user, view, body.product_index))
