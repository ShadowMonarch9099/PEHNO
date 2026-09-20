"""
Travel plans: run the planner over the user's wardrobe, persist the result,
and re-render saved plans (garment images are resolved fresh so signed URLs
stay valid).
"""
from __future__ import annotations

import uuid
from dataclasses import asdict
from datetime import timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import knowledge
from app.models.garment import Garment
from app.models.travel import TravelPlan
from app.models.user import User
from app.schemas.commerce import GapOut
from app.schemas.travel import (
    DayWeatherOut,
    LookOut,
    PackedItemOut,
    TravelPlanOut,
    TravelPlanSummaryOut,
)
from app.services import analytics, outfit_service, travel_planner, wardrobe_service
from app.services import outfit_engine as engine


def _occ_label(slug: str) -> str:
    o = knowledge.occasion(slug)
    return o["label"] if o else slug.replace("_", " ").title()


async def create_plan(
    db: AsyncSession,
    user: User,
    *,
    destination: str,
    start_date,
    end_date,
    activities: list[str],
    max_items: int,
) -> TravelPlan:
    unknown = [a for a in activities if a not in knowledge.occasion_slugs()]
    if unknown:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Unknown activities: {unknown}")
    dest = travel_planner.resolve_destination(destination)
    activities = activities or list(dest.default_activities)

    days = (end_date - start_date).days + 1
    weather = {
        start_date + timedelta(days=i): await travel_planner.weather_for(
            dest, start_date + timedelta(days=i)
        )
        for i in range(days)
    }
    slots = travel_planner.build_slots(start_date, end_date, activities, weather)
    garments = await outfit_service._usable_wardrobe(db, user)
    result = travel_planner.plan(
        garments,
        dest=dest,
        slots=slots,
        user=engine.UserContext(
            user.body_type.value, user.skin_tone.value, user.regional_style, user.gender.value
        ),
        history=await outfit_service._history(db, user),
        max_items=max_items,
    )

    def slot_dict(look_or_slot, garment_ids=None, score=0.0, rationale=None) -> dict:
        s = look_or_slot
        return {
            "day": s.day,
            "date": s.on.isoformat(),
            "part": s.part,
            "occasion": s.occasion,
            "garment_ids": garment_ids or [],
            "score": score,
            "rationale": rationale or [],
        }

    stored = {
        "destination": {
            "name": dest.name,
            "slug": dest.slug,
            "vibe": dest.vibe,
            "context": dest.context,
            "tips": dest.tips,
            "palette": dest.palette,
            "known": dest.known,
        },
        "weather_summary": travel_planner.weather_summary(slots),
        "weather": [
            {"day": i + 1, "date": d.isoformat(), **asdict(w)}
            for i, (d, w) in enumerate(sorted(weather.items()))
        ],
        "packed_ids": result.packed_ids,
        "look_count": result.total_looks,
        "looks": [
            slot_dict(lk.slot, lk.garment_ids, lk.score, lk.rationale) for lk in result.looks
        ],
        "unfilled": [slot_dict(s) for s in result.unfilled],
        "gaps": [
            {
                **{k: v for k, v in asdict(g).items() if k != "pairs_with"},
                "rank": i + 1,
                "typical_price_inr": list(g.typical_price_inr),
            }
            for i, g in enumerate(result.gaps)
        ],
        "hint": outfit_service.hint_for(garments)
        if not result.looks
        else (
            f"{len(result.unfilled)} slot{'s' if len(result.unfilled) != 1 else ''} couldn't be dressed from your wardrobe — see what's worth buying below."
            if result.unfilled
            else None
        ),
    }
    plan = TravelPlan(
        user_id=user.id,
        destination=dest.name,
        destination_slug=dest.slug,
        start_date=start_date,
        end_date=end_date,
        activities=activities,
        max_items=max_items,
        item_count=len(result.packed_ids),
        look_count=result.total_looks,
        result=stored,
    )
    db.add(plan)
    await db.flush()
    analytics.track(
        user.id,
        "travel_plan_created",
        destination=dest.slug,
        days=days,
        items=len(result.packed_ids),
        looks=result.total_looks,
        gaps=len(result.gaps),
    )
    return plan


async def get_owned(db: AsyncSession, user: User, plan_id: uuid.UUID) -> TravelPlan:
    p = await db.get(TravelPlan, plan_id)
    if p is None or p.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Plan not found")
    return p


async def list_plans(db: AsyncSession, user: User) -> list[TravelPlanSummaryOut]:
    rows = (
        (
            await db.execute(
                select(TravelPlan)
                .where(TravelPlan.user_id == user.id)
                .order_by(TravelPlan.start_date.desc())
            )
        )
        .scalars()
        .all()
    )
    return [
        TravelPlanSummaryOut(
            id=p.id,
            destination=p.destination,
            start_date=p.start_date,
            end_date=p.end_date,
            days=(p.end_date - p.start_date).days + 1,
            item_count=p.item_count,
            look_count=p.look_count,
            gap_count=len(p.result.get("gaps", [])),
            created_at=p.created_at,
        )
        for p in rows
    ]


async def to_out(db: AsyncSession, plan: TravelPlan) -> TravelPlanOut:
    r = plan.result
    ids = [uuid.UUID(g) for g in r["packed_ids"]]
    rows = (
        (await db.execute(select(Garment).where(Garment.id.in_(ids)))).scalars().all()
        if ids
        else []
    )
    by_id = {str(g.id): g for g in rows}
    usage: dict[str, list[int]] = {g: [] for g in r["packed_ids"]}
    for lk in r["looks"]:
        for g in lk["garment_ids"]:
            usage.setdefault(g, []).append(lk["day"])
    items = [
        PackedItemOut(
            garment=wardrobe_service.to_out(by_id[g]),
            wears=len(usage[g]),
            days=sorted(set(usage[g])),
        )
        for g in r["packed_ids"]
        if g in by_id  # deleted garments drop out of the list
    ]
    dest = r["destination"]

    def look(d: dict) -> LookOut:
        return LookOut(
            day=d["day"],
            date=d["date"],
            part=d["part"],
            occasion=d["occasion"],
            occasion_label=_occ_label(d["occasion"]),
            garment_ids=d["garment_ids"],
            score=d["score"],
            rationale=d["rationale"],
        )

    return TravelPlanOut(
        id=plan.id,
        destination=plan.destination,
        destination_slug=plan.destination_slug,
        vibe=dest["vibe"],
        context=dest["context"],
        tips=dest["tips"],
        palette=dest["palette"],
        start_date=plan.start_date,
        end_date=plan.end_date,
        days=(plan.end_date - plan.start_date).days + 1,
        activities=plan.activities,
        weather_summary=r["weather_summary"],
        weather=[
            DayWeatherOut(
                day=w["day"],
                date=w["date"],
                weather=outfit_service.weather_out(
                    travel_planner.Weather(
                        **{k: v for k, v in w.items() if k not in ("day", "date")}
                    )
                ),
            )
            for w in r["weather"]
        ],
        items=items,
        item_count=len(items),
        look_count=r["look_count"],
        looks=[look(d) for d in r["looks"]],
        unfilled=[look(d) for d in r["unfilled"]],
        gaps=[GapOut(**g) for g in r["gaps"]],
        hint=r.get("hint"),
        created_at=plan.created_at,
    )
