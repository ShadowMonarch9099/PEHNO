"""
Outfit use-cases: today's look, occasion generation, feedback, save, wear.
Loads data, calls the pure engine, persists Outfit rows.
"""
import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import utcnow
from app.models.garment import ClassificationStatus, Garment
from app.models.outfit import Outfit
from app.models.user import User
from app.schemas.outfit import OutfitOut, WeatherOut
from app.services import analytics, wardrobe_service
from app.services import outfit_engine as engine
from app.services.weather import Weather, get_weather

IST = timezone(timedelta(hours=5, minutes=30))


def today_ist() -> date:
    return datetime.now(IST).date()


# ── presentation ─────────────────────────────────────────────────────────────


def fabric_tip(w: Weather) -> str:
    if w.season == "summer":
        return "Cotton, linen and khadi breathe best in this heat."
    if w.season == "monsoon":
        return "Quick-dry georgette, chiffon or crepe; keep silks and velvet at home."
    if w.season == "winter":
        return "Silks, velvet and raw silk shine; layer a dupatta or shawl."
    return "Pleasant weather — most fabrics work; pick by occasion."


def weather_out(w: Weather) -> WeatherOut:
    return WeatherOut(
        city=w.city,
        temp_c=round(w.temp_c, 1),
        feels_like_c=round(w.feels_like_c, 1),
        humidity=w.humidity,
        condition=w.condition,
        season=w.season,
        source=w.source,
        description=w.description,
        fabric_tip=fabric_tip(w),
    )


async def to_out_many(db: AsyncSession, outfits: list[Outfit]) -> list[OutfitOut]:
    """Serialise a page of outfits with one garment query (no N+1)."""
    ids = {uuid.UUID(g) for o in outfits for g in o.garment_ids}
    rows = (
        (await db.execute(select(Garment).where(Garment.id.in_(ids)))).scalars().all()
        if ids
        else []
    )
    by_id = {str(g.id): wardrobe_service.to_out(g) for g in rows}
    return [
        OutfitOut(
            id=o.id,
            occasion=o.occasion,
            festival=o.festival,
            garments=[by_id[g] for g in o.garment_ids if g in by_id],
            weather_condition=o.weather_condition,
            temperature_celsius=o.temperature_celsius,
            season=o.season,
            score=o.score,
            rationale=o.rationale,
            feedback=o.feedback,
            is_saved=o.is_saved,
            is_daily=o.is_daily,
            for_date=o.for_date,
            batch_id=o.batch_id,
            worn_at=o.worn_at,
            created_at=o.created_at,
        )
        for o in outfits
    ]


async def to_out(db: AsyncSession, outfit: Outfit) -> OutfitOut:
    return (await to_out_many(db, [outfit]))[0]


# ── inputs for the engine ────────────────────────────────────────────────────


async def _usable_wardrobe(db: AsyncSession, user: User) -> list[Garment]:
    rows = await db.execute(
        select(Garment).where(
            Garment.user_id == user.id,
            Garment.classification_status == ClassificationStatus.complete,
            Garment.garment_type.not_in(["unknown", "other"]),
        )
    )
    return list(rows.scalars().all())


async def _history(db: AsyncSession, user: User) -> engine.History:
    since = utcnow() - timedelta(days=90)
    rows = (
        await db.execute(
            select(Outfit.garment_ids, Outfit.feedback).where(
                Outfit.user_id == user.id, Outfit.feedback.is_not(None), Outfit.created_at >= since
            )
        )
    ).all()
    h = engine.History()
    for ids, fb in rows:
        (h.liked_garment_ids if fb == 1 else h.disliked_garment_ids).update(ids)
    return h


def hint_for(garments: list[Garment]) -> str | None:
    roles = {engine.role_of(g) for g in garments}
    if not garments:
        return "Add a few classified garments to get outfits."
    if "full" not in roles and not ({"top", "bottom"} <= roles):
        if "top" in roles:
            return "Add a bottom (palazzo or churidar) to pair with your tops."
        if "bottom" in roles:
            return "Add a kurta or kurti to pair with your bottoms."
        return "Add a complete piece (saree, suit, anarkali) or a top and a bottom."
    return None


def _persist(
    db: AsyncSession,
    user: User,
    options: list[engine.OutfitOption],
    *,
    occasion: str,
    weather: Weather,
    festival: str | None,
    is_daily: bool,
    for_date: date | None,
) -> list[Outfit]:
    batch = uuid.uuid4()
    rows = []
    for o in options:
        row = Outfit(
            user_id=user.id,
            garment_ids=o.garment_ids,
            occasion=occasion,
            weather_condition=weather.condition,
            temperature_celsius=int(round(weather.temp_c)),
            season=weather.season,
            weather_source=weather.source,
            festival=festival,
            batch_id=batch,
            score=o.score,
            rationale=o.rationale,
            is_daily=is_daily,
            for_date=for_date.isoformat() if for_date else None,
            created_at=utcnow(),
        )
        db.add(row)
        rows.append(row)
    return rows


# ── use-cases ────────────────────────────────────────────────────────────────


async def generate(
    db: AsyncSession,
    user: User,
    *,
    occasion: str,
    festival: engine.FestivalContext | None = None,
    limit: int = 3,
    is_daily: bool = False,
    for_date: date | None = None,
    exclude: set[frozenset[str]] | None = None,
    weather_date: date | None = None,
) -> tuple[Weather, list[Outfit], str | None]:
    weather = await get_weather(user.city, weather_date)
    garments = await _usable_wardrobe(db, user)
    hint = hint_for(garments)
    options = engine.generate(
        garments,
        occasion=occasion,
        weather=weather,
        user=engine.UserContext(user.body_type.value, user.skin_tone.value, user.regional_style),
        festival=festival,
        history=await _history(db, user),
        limit=limit,
        seed=engine.daily_seed(user.id, for_date) if for_date else None,
        exclude=exclude,
    )
    if not options and not hint:
        occ = occasion.replace("_", " ")
        hint = f"Nothing in your wardrobe suits {occ} in today's weather yet — tag a few garments for it."
    rows = _persist(
        db,
        user,
        options,
        occasion=occasion,
        weather=weather,
        festival=festival.slug if festival else None,
        is_daily=is_daily,
        for_date=for_date,
    )
    await db.flush()
    analytics.track(
        user.id,
        analytics.OUTFIT_GENERATED,
        occasion=occasion,
        festival=festival.slug if festival else None,
        options=len(rows),
        wardrobe_size=len(garments),
        is_daily=is_daily,
        weather_source=weather.source,
    )
    return weather, rows, hint


async def daily(
    db: AsyncSession, user: User, *, regenerate: bool = False
) -> tuple[Weather, list[Outfit], str | None]:
    """Today's look: reuse today's daily row unless asked to regenerate."""
    today = today_ist()
    shown = (
        (
            await db.execute(
                select(Outfit)
                .where(
                    Outfit.user_id == user.id,
                    Outfit.is_daily.is_(True),
                    Outfit.for_date == today.isoformat(),
                )
                .order_by(Outfit.created_at.desc())
            )
        )
        .scalars()
        .all()
    )
    if shown and not regenerate:
        return await get_weather(user.city), [shown[0]], None
    # Default daily occasion: office on weekdays, casual on weekends.
    occasion = "casual" if today.weekday() >= 5 else "office"
    exclude = {frozenset(o.garment_ids) for o in shown}
    weather, rows, hint = await generate(
        db, user, occasion=occasion, limit=1, is_daily=True, for_date=today, exclude=exclude
    )
    if not rows and shown:  # nothing new to show — repeat the best of today rather than nothing
        return weather, [shown[0]], "That's every combination for today's weather."
    return weather, rows, hint


async def get_owned(db: AsyncSession, user: User, outfit_id: uuid.UUID) -> Outfit:
    o = await db.get(Outfit, outfit_id)
    if o is None or o.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Outfit not found")
    return o


async def set_feedback(db: AsyncSession, outfit: Outfit, value: int) -> Outfit:
    outfit.feedback = value
    await db.flush()
    analytics.track(
        outfit.user_id, analytics.OUTFIT_FEEDBACK, value=value, occasion=outfit.occasion
    )
    return outfit


async def toggle_saved(db: AsyncSession, outfit: Outfit, saved: bool) -> Outfit:
    outfit.is_saved = saved
    await db.flush()
    if saved:
        analytics.track(outfit.user_id, analytics.OUTFIT_SAVED, occasion=outfit.occasion)
    return outfit


async def wear(db: AsyncSession, outfit: Outfit) -> Outfit:
    """Mark as worn: logs a wear on every garment in the outfit (idempotent per outfit)."""
    if outfit.worn_at is not None:
        return outfit
    ids = [uuid.UUID(g) for g in outfit.garment_ids]
    for g in (await db.execute(select(Garment).where(Garment.id.in_(ids)))).scalars():
        await wardrobe_service.log_wear(db, g)
    outfit.worn_at = utcnow()
    if outfit.feedback is None:
        outfit.feedback = 1  # wearing it is the strongest "like"
    await db.flush()
    analytics.track(
        outfit.user_id, analytics.OUTFIT_WORN, occasion=outfit.occasion, is_daily=outfit.is_daily
    )
    return outfit


async def list_outfits(
    db: AsyncSession, user: User, *, saved_only: bool = False, page: int = 1, page_size: int = 20
) -> tuple[list[Outfit], int]:
    q = select(Outfit).where(Outfit.user_id == user.id)
    q = (
        q.where(Outfit.is_saved.is_(True))
        if saved_only
        else q.where(
            Outfit.feedback.is_not(None) | Outfit.worn_at.is_not(None) | Outfit.is_daily.is_(True)
        )
    )
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    rows = (
        (
            await db.execute(
                q.order_by(Outfit.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
            )
        )
        .scalars()
        .all()
    )
    return list(rows), total
