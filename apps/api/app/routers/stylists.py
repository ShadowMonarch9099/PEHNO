"""
/stylists — marketplace: browse verified stylists, apply, book paid sessions,
manage bookings (client + stylist sides), scoped wardrobe access, reviews.
"""
import uuid
from decimal import Decimal

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import CurrentUser, DbSession
from app.models.stylist import SessionType, StylistBooking, StylistReview
from app.models.user import User
from app.schemas.stylist import (
    BookIn,
    BookingOut,
    ClientWardrobeOut,
    ReviewIn,
    ReviewOut,
    StylistApplyIn,
    StylistOut,
    StylistProfileOut,
)
from app.services import stylist_service as svc
from app.services import wardrobe_service
from app.services.billing import get_billing_provider

router = APIRouter(prefix="/stylists", tags=["stylists"])


def _first(name: str | None) -> str:
    return (name or "Someone").split(" ")[0]


def _stylist_out(card: svc.StylistCard, viewer: User | None) -> StylistOut:
    u = card.user
    quote = None
    if viewer is not None and viewer.id != u.id:
        amount, discount, _ = svc.quote(u, viewer)
        quote = {
            "amount_inr": float(amount),
            "discount_inr": float(discount),
            "pro_discount_applied": discount > 0,
        }
    return StylistOut(
        id=u.id,
        name=u.name,
        city=u.city,
        bio=u.stylist_bio,
        specialties=u.stylist_specialties or [],
        price_per_session_inr=Decimal(u.stylist_price_per_session or 0),
        portfolio_urls=u.stylist_portfolio_urls or [],
        rating=card.rating,
        review_count=card.reviews,
        sessions_completed=card.sessions_completed,
        session_types=[
            {"slug": t.value, "label": label} for t, label in svc.SESSION_LABELS.items()
        ],
        quote=quote,
    )


async def _booking_out(
    db: AsyncSession, b: StylistBooking, *, viewer: User, names: dict | None = None
) -> BookingOut:
    names = names or {}
    for uid in (b.stylist_id, b.user_id):
        if uid not in names:
            u = await db.get(User, uid)
            names[uid] = u.name if u else ""
    reviewed = bool(
        await db.scalar(select(StylistReview.id).where(StylistReview.booking_id == b.id))
    )
    is_stylist = viewer.id == b.stylist_id
    amount = Decimal(b.amount_paid)
    commission = Decimal(b.platform_commission)
    return BookingOut(
        id=b.id,
        stylist_id=b.stylist_id,
        stylist_name=names[b.stylist_id],
        client_first_name=_first(names[b.user_id]),
        session_type=b.session_type,
        session_label=svc.SESSION_LABELS[b.session_type],
        scheduled_at=b.scheduled_at,
        duration_minutes=b.duration_minutes,
        status=b.status,
        amount_inr=amount,
        discount_inr=Decimal(b.discount_inr),
        platform_commission_inr=commission if is_stylist else None,
        stylist_payout_inr=(amount - commission) if is_stylist else None,
        notes=b.notes,
        payment_url=b.payment_url if not is_stylist else None,
        paid_at=b.paid_at,
        completed_at=b.completed_at,
        cancelled_at=b.cancelled_at,
        reviewed=reviewed,
        created_at=b.created_at,
    )


# ── browse ───────────────────────────────────────────────────────────────────


@router.get("", response_model=list[StylistOut])
async def list_stylists(
    user: CurrentUser, db: DbSession, city: str | None = None, specialty: str | None = None
) -> list[StylistOut]:
    """Verified stylists, best-rated first. Filter by city and/or specialty."""
    return [
        _stylist_out(c, user) for c in await svc.list_verified(db, city=city, specialty=specialty)
    ]


@router.get("/specialties", response_model=list[str])
async def specialties() -> list[str]:
    return list(svc.SPECIALTIES)


# ── applying (static routes before /{stylist_id}) ────────────────────────────


@router.get("/me", response_model=StylistProfileOut)
async def my_stylist_profile(user: CurrentUser) -> StylistProfileOut:
    return StylistProfileOut(
        is_stylist=user.is_stylist,
        verified=user.stylist_verified,
        bio=user.stylist_bio,
        specialties=user.stylist_specialties or [],
        price_per_session_inr=user.stylist_price_per_session,
        portfolio_urls=user.stylist_portfolio_urls or [],
        applied_at=user.stylist_applied_at,
    )


@router.post("/apply", response_model=StylistProfileOut)
async def apply(body: StylistApplyIn, user: CurrentUser, db: DbSession) -> StylistProfileOut:
    """Apply (or update your application). Listing goes live once an admin verifies you."""
    await svc.apply(
        db,
        user,
        bio=body.bio,
        specialties=body.specialties,
        price_inr=body.price_per_session_inr,
        portfolio_urls=[str(u) for u in body.portfolio_urls],
    )
    return await my_stylist_profile(user)


# ── bookings ─────────────────────────────────────────────────────────────────


@router.post("/book", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
async def book(body: BookIn, user: CurrentUser, db: DbSession) -> BookingOut:
    """Create a pending booking + payment link. Confirmed by the payment webhook."""
    b = await svc.book(
        db,
        user,
        stylist_id=body.stylist_id,
        session_type=body.session_type,
        scheduled_at=body.scheduled_at,
        notes=body.notes,
    )
    return await _booking_out(db, b, viewer=user)


@router.get("/bookings/my", response_model=list[BookingOut])
async def my_bookings(user: CurrentUser, db: DbSession) -> list[BookingOut]:
    rows = await svc.bookings_for(db, user, as_stylist=False)
    return [await _booking_out(db, b, viewer=user) for b in rows]


@router.get("/bookings/incoming", response_model=list[BookingOut])
async def incoming_bookings(user: CurrentUser, db: DbSession) -> list[BookingOut]:
    """Stylist side: sessions booked with you."""
    if not user.is_stylist:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You're not registered as a stylist")
    rows = await svc.bookings_for(db, user, as_stylist=True)
    return [await _booking_out(db, b, viewer=user) for b in rows]


@router.get("/bookings/{booking_id}", response_model=BookingOut)
async def get_booking(booking_id: uuid.UUID, user: CurrentUser, db: DbSession) -> BookingOut:
    return await _booking_out(db, await svc.get_booking(db, user, booking_id), viewer=user)


@router.post("/bookings/{booking_id}/cancel", response_model=BookingOut)
async def cancel_booking(booking_id: uuid.UUID, user: CurrentUser, db: DbSession) -> BookingOut:
    b = await svc.get_booking(db, user, booking_id)
    return await _booking_out(db, await svc.cancel(db, user, b), viewer=user)


@router.post("/bookings/{booking_id}/complete", response_model=BookingOut)
async def complete_booking(booking_id: uuid.UUID, user: CurrentUser, db: DbSession) -> BookingOut:
    b = await svc.get_booking(db, user, booking_id)
    return await _booking_out(db, await svc.complete(db, user, b), viewer=user)


@router.post("/bookings/{booking_id}/review", response_model=ReviewOut)
async def review_booking(
    booking_id: uuid.UUID, body: ReviewIn, user: CurrentUser, db: DbSession
) -> ReviewOut:
    b = await svc.get_booking(db, user, booking_id)
    r = await svc.review(db, user, b, rating=body.rating, comment=body.comment)
    return ReviewOut(
        id=r.id,
        rating=r.rating,
        comment=r.comment,
        reviewer_first_name=_first(user.name),
        created_at=r.created_at,
    )


@router.get("/my-wardrobe-access/{booking_id}", response_model=ClientWardrobeOut)
async def client_wardrobe(
    booking_id: uuid.UUID, user: CurrentUser, db: DbSession
) -> ClientWardrobeOut:
    """Stylist side: the client's wardrobe, readable only while the session is confirmed."""
    b = await svc.get_booking(db, user, booking_id)
    client, garments = await svc.client_wardrobe(db, user, b)
    return ClientWardrobeOut(
        booking_id=b.id,
        client_first_name=_first(client.name),
        city=client.city,
        regional_style=client.regional_style,
        notes=b.notes,
        garments=[wardrobe_service.to_out(g) for g in garments],
    )


@router.post("/bookings/{booking_id}/dev/pay", response_model=BookingOut, include_in_schema=False)
async def dev_pay(booking_id: uuid.UUID, user: CurrentUser, db: DbSession) -> BookingOut:
    """DEBUG + mock provider only: simulate the payment-link `paid` webhook."""
    if not settings.DEBUG or settings.BILLING_PROVIDER != "mock":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    from app.services import billing_service

    b = await svc.get_booking(db, user, booking_id)
    await billing_service.apply_event(
        db,
        get_billing_provider().parse_event(
            {
                "id": f"dev_{uuid.uuid4().hex}",
                "event": "paid",
                "reference_id": str(b.id),
                "amount_inr": float(b.amount_paid),
            }
        ),
    )
    await db.refresh(b)
    return await _booking_out(db, b, viewer=user)


# ── profile (last: catches /{stylist_id}) ────────────────────────────────────


@router.get("/{stylist_id}", response_model=StylistOut)
async def stylist_profile(stylist_id: uuid.UUID, user: CurrentUser, db: DbSession) -> StylistOut:
    card = await svc.get_stylist(db, stylist_id)
    out = _stylist_out(card, user)
    rows = (
        await db.execute(
            select(StylistReview, User.name)
            .join(User, User.id == StylistReview.user_id)
            .where(StylistReview.stylist_id == stylist_id)
            .order_by(StylistReview.created_at.desc())
            .limit(20)
        )
    ).all()
    out.reviews = [
        ReviewOut(
            id=r.id,
            rating=r.rating,
            comment=r.comment,
            reviewer_first_name=_first(name),
            created_at=r.created_at,
        )
        for r, name in rows
    ]
    return out


__all__ = ["router", "SessionType"]
