"""
/festivals — upcoming calendar, festival detail with curated looks, Navratri tracker.
"""
from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.core.security import CurrentUser, DbSession
from app.models.garment import ClassificationStatus, Garment
from app.schemas.festival import FestivalDetailOut, FestivalOut, NavratriTodayOut
from app.services import analytics, outfit_service, wardrobe_service
from app.services import festival_service as fs

router = APIRouter(prefix="/festivals", tags=["festivals"])


def _festival_out(occ: fs.Occurrence, city: str, today) -> FestivalOut:
    f = occ.festival
    return FestivalOut(
        slug=f["slug"],
        name=f["name"],
        start_date=occ.start.isoformat(),
        end_date=occ.end.isoformat(),
        days_until=max(0, occ.days_until(today)),
        is_active=occ.is_active(today),
        is_relevant=fs.is_relevant(f, city),
        regions=f.get("regions", []),
        colors=f.get("colors", []),
        color_guidance=f.get("color_guidance", ""),
        dress_code=f.get("dress_code", ""),
        description=f.get("description", ""),
        occasion_tags=f.get("occasion_tags", []),
        lunar_calendar=bool(f.get("lunar_calendar")),
    )


@router.get("/upcoming", response_model=list[FestivalOut])
async def upcoming(
    user: CurrentUser, limit: int = Query(default=5, ge=1, le=10)
) -> list[FestivalOut]:
    """Next festivals, the user's region first."""
    today = fs.today_ist()
    return [
        _festival_out(o, user.city, today) for o in fs.upcoming(user.city, today=today, limit=limit)
    ]


@router.get("/navratri/today", response_model=NavratriTodayOut)
async def navratri_today(user: CurrentUser, db: DbSession) -> NavratriTodayOut:
    """Today's Navratri colour (or the upcoming sequence) and matching garments from the wardrobe."""
    data = fs.navratri_today()
    matching = []
    color = data["today"] or (data["sequence"][0] if data["sequence"] else None)
    if color:
        rows = await db.execute(
            select(Garment).where(
                Garment.user_id == user.id,
                Garment.classification_status == ClassificationStatus.complete,
                Garment.color_primary.in_(color["color_slugs"]),
            )
        )
        matching = [wardrobe_service.to_out(g) for g in rows.scalars().all()]
    return NavratriTodayOut(**data, matching_garments=matching)


@router.get("/{slug}", response_model=FestivalDetailOut)
async def detail(slug: str, user: CurrentUser, db: DbSession) -> FestivalDetailOut:
    """Festival detail plus 3–5 looks curated from the user's wardrobe."""
    occ = fs.next_occurrence(slug)
    if occ is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Festival not found")
    today = fs.today_ist()
    # Judge fabrics against the weather expected on the festival date, not today's.
    _, rows, hint = await outfit_service.generate(
        db,
        user,
        occasion=fs.primary_occasion(occ.festival),
        festival=fs.context_for(occ.festival),
        limit=5,
        weather_date=max(occ.start, today),
    )
    looks = await outfit_service.to_out_many(db, rows)
    analytics.track(user.id, analytics.FESTIVAL_VIEWED, festival=slug, looks=len(looks))
    return FestivalDetailOut(
        **_festival_out(occ, user.city, today).model_dump(), looks=looks, hint=hint
    )
