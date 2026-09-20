"""
/travel — packing planner (Plus): destination + dates + activities → capsule
from the user's own wardrobe, day-by-day looks, and gaps worth buying.
"""
import uuid

from fastapi import APIRouter, status

from app.core.security import CurrentUser, DbSession
from app.schemas.common import Message
from app.schemas.travel import DestinationOut, PackingRequest, TravelPlanOut, TravelPlanSummaryOut
from app.services import travel_planner
from app.services import travel_service as svc
from app.services.entitlements import require_feature

router = APIRouter(prefix="/travel", tags=["travel"])


@router.get("/destinations", response_model=list[DestinationOut])
async def destinations(user: CurrentUser) -> list[DestinationOut]:
    """Destinations with local notes (any city name is accepted by the planner)."""
    return [
        DestinationOut(
            slug=d.slug,
            name=d.name,
            vibe=d.vibe,
            context=d.context,
            default_activities=d.default_activities,
        )
        for d in travel_planner.destinations()
    ]


@router.post("/packing-list", response_model=TravelPlanOut, status_code=status.HTTP_201_CREATED)
async def packing_list(body: PackingRequest, user: CurrentUser, db: DbSession) -> TravelPlanOut:
    """Generate and save a packing plan. Plus feature."""
    require_feature(user, "travel_packing")
    plan = await svc.create_plan(
        db,
        user,
        destination=body.destination,
        start_date=body.start_date,
        end_date=body.end_date,
        activities=body.activities,
        max_items=body.max_items,
    )
    return await svc.to_out(db, plan)


@router.get("/plans", response_model=list[TravelPlanSummaryOut])
async def plans(user: CurrentUser, db: DbSession) -> list[TravelPlanSummaryOut]:
    return await svc.list_plans(db, user)


@router.get("/plans/{plan_id}", response_model=TravelPlanOut)
async def get_plan(plan_id: uuid.UUID, user: CurrentUser, db: DbSession) -> TravelPlanOut:
    return await svc.to_out(db, await svc.get_owned(db, user, plan_id))


@router.delete("/plans/{plan_id}", response_model=Message)
async def delete_plan(plan_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Message:
    await db.delete(await svc.get_owned(db, user, plan_id))
    await db.flush()
    return Message(message="deleted")
