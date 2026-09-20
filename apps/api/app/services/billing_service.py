"""
Subscription lifecycle: subscribe → (provider checkout) → webhook activates →
tier updated on the user; cancel lapses at period end; a daily reconcile job
downgrades expired subscriptions.
"""
import logging
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import utcnow
from app.models.billing import BillingEvent, Subscription, SubscriptionStatus
from app.models.user import SubscriptionTier, User
from app.services import analytics
from app.services.billing import ProviderEvent, get_billing_provider
from app.services.entitlements import PLANS

log = logging.getLogger(__name__)

PAID_TIERS = {SubscriptionTier.plus, SubscriptionTier.pro}


def _aware(dt: datetime | None) -> datetime | None:
    return dt if dt is None or dt.tzinfo else dt.replace(tzinfo=UTC)


async def current_subscription(db: AsyncSession, user: User) -> Subscription | None:
    """The user's most recent non-expired subscription record, if any."""
    return (
        await db.execute(
            select(Subscription)
            .where(
                Subscription.user_id == user.id, Subscription.status != SubscriptionStatus.expired
            )
            .order_by(Subscription.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()


async def start_subscription(db: AsyncSession, user: User, plan: SubscriptionTier) -> Subscription:
    if plan not in PAID_TIERS:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Choose Plus or Pro")
    existing = await current_subscription(db, user)
    if existing and existing.status == SubscriptionStatus.active and existing.plan == plan.value:
        raise HTTPException(status.HTTP_409_CONFLICT, f"You're already on {PLANS[plan].name}")

    provider = get_billing_provider()
    session = await provider.create_subscription(
        plan=plan.value, user_id=str(user.id), phone=user.phone
    )
    sub = Subscription(
        user_id=user.id,
        provider=provider.name,
        provider_subscription_id=session.provider_subscription_id,
        plan=plan.value,
        status=SubscriptionStatus.created,
        checkout_url=session.checkout_url,
    )
    db.add(sub)
    await db.flush()
    analytics.track(user.id, "subscription_started", plan=plan.value, provider=provider.name)
    return sub


async def cancel_subscription(db: AsyncSession, user: User) -> Subscription:
    sub = await current_subscription(db, user)
    if sub is None or sub.status not in (SubscriptionStatus.active, SubscriptionStatus.halted):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No active subscription to cancel")
    await get_billing_provider().cancel_subscription(
        sub.provider_subscription_id, at_period_end=True
    )
    sub.status = SubscriptionStatus.cancelled
    sub.cancel_at_period_end = True
    await db.flush()
    analytics.track(user.id, "subscription_cancelled", plan=sub.plan)
    return sub  # access continues until current_period_end; reconcile downgrades


# ── webhooks ─────────────────────────────────────────────────────────────────


async def apply_event(db: AsyncSession, event: ProviderEvent) -> str:
    """Idempotently apply a provider event. Returns what happened (for logs/tests)."""
    provider = get_billing_provider()
    db.add(
        BillingEvent(
            provider=provider.name,
            provider_event_id=event.event_id,
            event_type=event.event_type,
            payload=event.raw,
            received_at=utcnow(),
        )
    )
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        return "duplicate"

    if event.event_type == "paid":
        # one-time payment (stylist session): reference_id is our booking id
        from app.services import stylist_service

        try:
            booking_id = uuid.UUID(event.reference_id or "")
        except ValueError:
            return "ignored"
        booking = await stylist_service.confirm_paid(db, booking_id, event.amount_inr)
        return "paid" if booking else "unknown_booking"

    if not event.provider_subscription_id:
        return "ignored"
    sub = (
        await db.execute(
            select(Subscription).where(
                Subscription.provider_subscription_id == event.provider_subscription_id
            )
        )
    ).scalar_one_or_none()
    if sub is None:
        log.warning("billing: event for unknown subscription %s", event.provider_subscription_id)
        return "unknown_subscription"
    user = await db.get(User, sub.user_id)
    if user is None:
        return "unknown_user"

    if event.event_type in ("activated", "charged"):
        sub.status = SubscriptionStatus.active
        sub.current_period_end = event.current_period_end or (utcnow() + timedelta(days=30))
        user.subscription_tier = SubscriptionTier(sub.plan)
        user.subscription_expires_at = sub.current_period_end
        analytics.track(
            user.id, "subscription_activated", plan=sub.plan, provider_event=event.event_type
        )
    elif event.event_type == "cancelled":
        sub.status = SubscriptionStatus.cancelled
        sub.cancel_at_period_end = True
        # keep tier until period end; reconcile handles the downgrade
    elif event.event_type == "halted":
        sub.status = SubscriptionStatus.halted
    elif event.event_type == "completed":
        sub.status = SubscriptionStatus.expired
        _downgrade(user)
    await db.flush()
    return event.event_type


def _downgrade(user: User) -> None:
    user.subscription_tier = SubscriptionTier.free
    user.subscription_expires_at = None


async def reconcile_expired(db: AsyncSession) -> int:
    """Daily: downgrade users whose paid period has ended without renewal."""
    now = utcnow()
    rows = (
        await db.execute(
            select(Subscription).where(
                Subscription.status.in_(
                    [
                        SubscriptionStatus.cancelled,
                        SubscriptionStatus.halted,
                        SubscriptionStatus.active,
                    ]
                ),
                Subscription.current_period_end.is_not(None),
            )
        )
    ).scalars()
    n = 0
    for sub in rows:
        end = _aware(sub.current_period_end)
        if end is None or end > now:
            continue
        # active subs get a 3-day grace for late renewals; cancelled/halted lapse immediately
        if sub.status == SubscriptionStatus.active and end + timedelta(days=3) > now:
            continue
        sub.status = SubscriptionStatus.expired
        user = await db.get(User, sub.user_id)
        if user and user.subscription_tier != SubscriptionTier.free:
            _downgrade(user)
            analytics.track(user.id, "subscription_expired", plan=sub.plan)
            n += 1
    await db.flush()
    return n
