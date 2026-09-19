"""
/billing — plans, subscription state, subscribe/cancel, provider webhooks.
"""
import json
import uuid

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import func, select

from app.core.config import settings
from app.core.security import CurrentUser, DbSession
from app.models.billing import Subscription
from app.models.garment import Garment
from app.models.user import SubscriptionTier
from app.schemas.common import APIModel, Message, UTCDateTime
from app.services import billing_service as svc
from app.services.billing import get_billing_provider
from app.services.entitlements import (
    FEATURE_LABELS,
    FEATURE_TIERS,
    PLANS,
    TIER_ORDER,
    entitlements_for,
)

router = APIRouter(prefix="/billing", tags=["billing"])


class PlanOut(BaseModel):
    tier: str
    name: str
    price_inr_month: int
    tagline: str
    features: list[str]  # human labels, cumulative
    garment_limit: int | None


class SubscriptionOut(APIModel):
    id: uuid.UUID
    plan: str
    status: str
    provider: str
    checkout_url: str | None
    current_period_end: UTCDateTime | None
    cancel_at_period_end: bool
    created_at: UTCDateTime


class SubscribeIn(BaseModel):
    plan: SubscriptionTier


class BillingStateOut(BaseModel):
    entitlements: dict
    subscription: SubscriptionOut | None


def _plan_out(tier: SubscriptionTier) -> PlanOut:
    p = PLANS[tier]
    labels = [
        FEATURE_LABELS[k] for k, t in FEATURE_TIERS.items() if TIER_ORDER[t] <= TIER_ORDER[tier]
    ]
    base = [
        "Wardrobe upload & AI classification",
        "Daily look for your weather",
        "Festival calendar & alerts",
    ]
    if tier != SubscriptionTier.free:
        base.append("Unlimited wardrobe")
    return PlanOut(
        tier=tier.value,
        name=p.name,
        price_inr_month=p.price_inr_month,
        tagline=p.tagline,
        features=base + labels,
        garment_limit=settings.FREE_GARMENT_LIMIT if tier == SubscriptionTier.free else None,
    )


@router.get("/plans", response_model=list[PlanOut])
async def plans() -> list[PlanOut]:
    return [
        _plan_out(t) for t in (SubscriptionTier.free, SubscriptionTier.plus, SubscriptionTier.pro)
    ]


@router.get("/subscription", response_model=BillingStateOut)
async def subscription(user: CurrentUser, db: DbSession) -> BillingStateOut:
    count = (
        await db.execute(select(func.count(Garment.id)).where(Garment.user_id == user.id))
    ).scalar_one()
    sub = await svc.current_subscription(db, user)
    return BillingStateOut(entitlements=entitlements_for(user, count), subscription=sub)


@router.post("/subscribe", response_model=SubscriptionOut, status_code=status.HTTP_201_CREATED)
async def subscribe(body: SubscribeIn, user: CurrentUser, db: DbSession) -> SubscriptionOut:
    """Create a subscription; the client opens `checkout_url` (Razorpay hosted page)."""
    return await svc.start_subscription(db, user, body.plan)


@router.post("/cancel", response_model=SubscriptionOut)
async def cancel(user: CurrentUser, db: DbSession) -> SubscriptionOut:
    """Cancel at period end — access continues until then."""
    return await svc.cancel_subscription(db, user)


@router.post("/webhook/razorpay", response_model=Message, include_in_schema=False)
async def razorpay_webhook(request: Request, db: DbSession) -> Message:
    """Provider → us. Signature is verified before anything is touched."""
    body = await request.body()
    provider = get_billing_provider()
    if not provider.verify_webhook(body, request.headers.get("X-Razorpay-Signature")):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid webhook signature")
    try:
        payload = json.loads(body)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid JSON") from e
    outcome = await svc.apply_event(db, provider.parse_event(payload))
    return Message(message=outcome)


@router.post("/dev/activate", response_model=SubscriptionOut, include_in_schema=False)
async def dev_activate(user: CurrentUser, db: DbSession) -> SubscriptionOut:
    """DEBUG + mock provider only: simulate the provider activating the pending subscription."""
    if not settings.DEBUG or settings.BILLING_PROVIDER != "mock":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    sub = await svc.current_subscription(db, user)
    if sub is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No pending subscription")
    provider = get_billing_provider()
    await svc.apply_event(
        db,
        provider.parse_event(
            {
                "id": f"dev_{uuid.uuid4().hex}",
                "event": "activated",
                "subscription_id": sub.provider_subscription_id,
            }
        ),
    )
    await db.refresh(sub)
    return sub


__all__ = ["router", "Subscription"]
