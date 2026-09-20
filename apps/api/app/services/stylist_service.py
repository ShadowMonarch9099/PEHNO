"""
Stylist marketplace: apply → admin verifies → users book paid sessions.

Money: session price is set by the stylist; Pro members get a discount; the
platform keeps STYLIST_COMMISSION_RATE of what's paid. Payment is a one-time
provider payment link; the `paid` webhook (or the dev endpoint) confirms.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import utcnow
from app.models.garment import ClassificationStatus, Garment
from app.models.stylist import BookingStatus, SessionType, StylistBooking, StylistReview
from app.models.user import SubscriptionTier, User
from app.services import analytics
from app.services.billing import get_billing_provider
from app.services.entitlements import has_feature

SESSION_LABELS = {
    SessionType.wardrobe_review: "Wardrobe review",
    SessionType.occasion_curation: "Occasion curation",
    SessionType.trip_packing: "Trip packing plan",
}
SPECIALTIES = (
    "bridal",
    "festive",
    "office",
    "fusion",
    "sarees",
    "menswear",
    "petite",
    "plus_size",
    "sustainable",
    "budget",
)


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=UTC)


# ── profiles ─────────────────────────────────────────────────────────────────


@dataclass
class StylistCard:
    user: User
    rating: float | None
    reviews: int
    sessions_completed: int


async def _ratings(
    db: AsyncSession, stylist_ids: list[uuid.UUID]
) -> dict[uuid.UUID, tuple[float, int]]:
    if not stylist_ids:
        return {}
    rows = (
        await db.execute(
            select(
                StylistReview.stylist_id,
                func.avg(StylistReview.rating),
                func.count(StylistReview.id),
            )
            .where(StylistReview.stylist_id.in_(stylist_ids))
            .group_by(StylistReview.stylist_id)
        )
    ).all()
    return {sid: (round(float(avg), 1), n) for sid, avg, n in rows}


async def _completed_counts(db: AsyncSession, stylist_ids: list[uuid.UUID]) -> dict[uuid.UUID, int]:
    if not stylist_ids:
        return {}
    rows = (
        await db.execute(
            select(StylistBooking.stylist_id, func.count(StylistBooking.id))
            .where(
                StylistBooking.stylist_id.in_(stylist_ids),
                StylistBooking.status == BookingStatus.completed,
            )
            .group_by(StylistBooking.stylist_id)
        )
    ).all()
    return dict(rows)


async def list_verified(
    db: AsyncSession, *, city: str | None = None, specialty: str | None = None
) -> list[StylistCard]:
    q = select(User).where(
        User.is_stylist.is_(True), User.stylist_verified.is_(True), User.is_active.is_(True)
    )
    if city:
        q = q.where(func.lower(User.city) == city.lower())
    users = list((await db.execute(q.order_by(User.name))).scalars().all())
    if specialty:
        users = [u for u in users if specialty in (u.stylist_specialties or [])]
    ids = [u.id for u in users]
    ratings, done = await _ratings(db, ids), await _completed_counts(db, ids)
    cards = [StylistCard(u, *(ratings.get(u.id, (None, 0))), done.get(u.id, 0)) for u in users]
    cards.sort(key=lambda c: (-(c.rating or 0), -c.reviews, c.user.name))
    return cards


async def get_stylist(db: AsyncSession, stylist_id: uuid.UUID) -> StylistCard:
    u = await db.get(User, stylist_id)
    if u is None or not (u.is_stylist and u.stylist_verified and u.is_active):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Stylist not found")
    ratings, done = await _ratings(db, [u.id]), await _completed_counts(db, [u.id])
    return StylistCard(u, *(ratings.get(u.id, (None, 0))), done.get(u.id, 0))


async def apply(
    db: AsyncSession,
    user: User,
    *,
    bio: str,
    specialties: list[str],
    price_inr: float,
    portfolio_urls: list[str],
) -> User:
    bad = set(specialties) - set(SPECIALTIES)
    if bad:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, f"Unknown specialties: {sorted(bad)}"
        )
    user.is_stylist = True
    user.stylist_verified = False  # admin review
    user.stylist_bio = bio
    user.stylist_specialties = specialties
    user.stylist_price_per_session = Decimal(str(price_inr))
    user.stylist_portfolio_urls = portfolio_urls
    user.stylist_applied_at = utcnow()
    await db.flush()
    analytics.track(user.id, "stylist_applied", price=price_inr, specialties=specialties)
    return user


async def verify(db: AsyncSession, stylist: User, verified: bool) -> User:
    if not stylist.is_stylist:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "User has not applied as a stylist"
        )
    stylist.stylist_verified = verified
    await db.flush()
    return stylist


# ── bookings ─────────────────────────────────────────────────────────────────


def quote(stylist: User, client: User) -> tuple[Decimal, Decimal, Decimal]:
    """(amount_to_pay, discount, platform_commission)."""
    price = Decimal(stylist.stylist_price_per_session or 0)
    discount = Decimal("0")
    if (
        has_feature(client, "stylist_discounts")
        and client.subscription_tier == SubscriptionTier.pro
    ):
        discount = (price * Decimal(str(settings.PRO_STYLIST_DISCOUNT_RATE))).quantize(
            Decimal("0.01")
        )
    amount = price - discount
    commission = (amount * Decimal(str(settings.STYLIST_COMMISSION_RATE))).quantize(Decimal("0.01"))
    return amount, discount, commission


async def book(
    db: AsyncSession,
    client: User,
    *,
    stylist_id: uuid.UUID,
    session_type: SessionType,
    scheduled_at: datetime,
    notes: str | None,
) -> StylistBooking:
    card = await get_stylist(db, stylist_id)
    stylist = card.user
    if stylist.id == client.id:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "You can't book yourself")
    scheduled_at = _aware(scheduled_at)
    if scheduled_at < utcnow() + timedelta(hours=2):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "Pick a slot at least 2 hours from now"
        )
    if not stylist.stylist_price_per_session:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "This stylist hasn't set a price yet"
        )

    # No overlapping confirmed/pending session for the stylist
    window = timedelta(minutes=settings.STYLIST_SESSION_MINUTES)
    clash = await db.scalar(
        select(func.count(StylistBooking.id)).where(
            StylistBooking.stylist_id == stylist.id,
            StylistBooking.status.in_([BookingStatus.pending, BookingStatus.confirmed]),
            StylistBooking.scheduled_at > scheduled_at - window,
            StylistBooking.scheduled_at < scheduled_at + window,
        )
    )
    if clash:
        raise HTTPException(status.HTTP_409_CONFLICT, "That slot is taken — pick another time")

    amount, discount, commission = quote(stylist, client)
    booking = StylistBooking(
        user_id=client.id,
        stylist_id=stylist.id,
        session_type=session_type,
        scheduled_at=scheduled_at,
        duration_minutes=settings.STYLIST_SESSION_MINUTES,
        amount_paid=amount,
        discount_inr=discount,
        platform_commission=commission,
        notes=notes,
    )
    db.add(booking)
    await db.flush()

    provider = get_billing_provider()
    link = await provider.create_payment_link(
        amount_inr=float(amount),
        description=f"PEHNO stylist session: {SESSION_LABELS[session_type]} with {stylist.name or 'stylist'}",
        reference_id=str(booking.id),
        phone=client.phone,
    )
    booking.payment_provider = provider.name
    booking.payment_ref = link.provider_payment_id
    booking.payment_url = link.url
    await db.flush()
    analytics.track(
        client.id, "stylist_booking_created", session_type=session_type.value, amount=float(amount)
    )
    return booking


async def confirm_paid(
    db: AsyncSession, booking_id: uuid.UUID, amount_inr: float | None = None
) -> StylistBooking | None:
    """Called from the payment webhook (or dev endpoint). Idempotent."""
    booking = await db.get(StylistBooking, booking_id)
    if booking is None:
        return None
    if booking.status == BookingStatus.pending:
        booking.status = BookingStatus.confirmed
        booking.paid_at = utcnow()
        if amount_inr is not None and amount_inr > 0:
            booking.amount_paid = Decimal(str(amount_inr))
            booking.platform_commission = (
                booking.amount_paid * Decimal(str(settings.STYLIST_COMMISSION_RATE))
            ).quantize(Decimal("0.01"))
        await db.flush()
        analytics.track(booking.user_id, "stylist_booking_paid", amount=float(booking.amount_paid))
    return booking


async def get_booking(db: AsyncSession, user: User, booking_id: uuid.UUID) -> StylistBooking:
    b = await db.get(StylistBooking, booking_id)
    if b is None or user.id not in (b.user_id, b.stylist_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found")
    return b


async def cancel(db: AsyncSession, user: User, booking: StylistBooking) -> StylistBooking:
    if booking.status in (BookingStatus.completed, BookingStatus.cancelled):
        raise HTTPException(status.HTTP_409_CONFLICT, f"Booking is already {booking.status.value}")
    booking.status = BookingStatus.cancelled
    booking.cancelled_at = utcnow()
    await db.flush()
    # Refunds for paid bookings are handled manually via the provider dashboard for now.
    analytics.track(
        user.id,
        "stylist_booking_cancelled",
        by="stylist" if user.id == booking.stylist_id else "client",
    )
    return booking


async def complete(db: AsyncSession, stylist: User, booking: StylistBooking) -> StylistBooking:
    if booking.stylist_id != stylist.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the stylist can complete a session")
    if booking.status != BookingStatus.confirmed:
        raise HTTPException(status.HTTP_409_CONFLICT, "Only confirmed sessions can be completed")
    booking.status = BookingStatus.completed
    booking.completed_at = utcnow()
    booking.payout_status = "due"  # rule 7: 80% is released to the stylist after completion
    await db.flush()
    return booking


async def review(
    db: AsyncSession, client: User, booking: StylistBooking, *, rating: int, comment: str | None
) -> StylistReview:
    if booking.user_id != client.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the client can review")
    if booking.status != BookingStatus.completed:
        raise HTTPException(status.HTTP_409_CONFLICT, "Review after the session is completed")
    existing = await db.scalar(
        select(StylistReview.id).where(StylistReview.booking_id == booking.id)
    )
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Already reviewed")
    r = StylistReview(
        booking_id=booking.id,
        stylist_id=booking.stylist_id,
        user_id=client.id,
        rating=rating,
        comment=comment,
        created_at=utcnow(),
    )
    db.add(r)
    await db.flush()
    return r


async def bookings_for(db: AsyncSession, user: User, *, as_stylist: bool) -> list[StylistBooking]:
    col = StylistBooking.stylist_id if as_stylist else StylistBooking.user_id
    rows = await db.execute(
        select(StylistBooking).where(col == user.id).order_by(StylistBooking.scheduled_at.desc())
    )
    return list(rows.scalars().all())


async def client_wardrobe(
    db: AsyncSession, stylist: User, booking: StylistBooking
) -> tuple[User, list[Garment]]:
    """Scoped read access: only the stylist, only while the booking is confirmed."""
    if booking.stylist_id != stylist.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your booking")
    if booking.status != BookingStatus.confirmed:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Wardrobe access opens once the session is confirmed"
        )
    client = await db.get(User, booking.user_id)
    rows = await db.execute(
        select(Garment)
        .where(
            Garment.user_id == booking.user_id,
            Garment.classification_status == ClassificationStatus.complete,
        )
        .order_by(Garment.created_at.desc())
    )
    return client, list(rows.scalars().all())
