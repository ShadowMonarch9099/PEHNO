"""
/wardrobe — garment upload, listing, edits, wear log.
"""
import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select

from app.core.config import settings
from app.core.security import CurrentUser, DbSession
from app.models.garment import ClassificationStatus, Garment
from app.schemas.common import Message
from app.schemas.garment import GarmentListOut, GarmentOut, GarmentUpdate, UploadResultOut
from app.services import wardrobe_service as svc
from app.services.classification_service import run_classification_job
from app.services.entitlements import PaywallError, garment_limit
from app.services.image_service import InvalidImageError
from app.tasks import dispatch
from app.tasks.classify import classify_garment_task

router = APIRouter(prefix="/wardrobe", tags=["wardrobe"])


@router.post("/upload", response_model=UploadResultOut, status_code=status.HTTP_201_CREATED)
async def upload(
    user: CurrentUser,
    db: DbSession,
    background: BackgroundTasks,
    files: Annotated[list[UploadFile], File(description="1–10 garment photos")],
) -> UploadResultOut:
    """
    Upload one or more photos. Each valid image becomes a garment with
    classification_status=pending; classification runs asynchronously (weeks 5–7).
    Invalid files are reported in `rejected` without failing the whole batch.
    """
    if not files:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "No files provided")
    if len(files) > settings.MAX_BULK_UPLOAD:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"At most {settings.MAX_BULK_UPLOAD} files per upload",
        )

    limit = garment_limit(user)
    if limit is not None:
        count = (
            await db.execute(select(func.count(Garment.id)).where(Garment.user_id == user.id))
        ).scalar_one()
        if count + len(files) > limit:
            raise PaywallError(
                "unlimited_wardrobe",
                message=f"Free includes {limit} garments. Upgrade to Plus for an unlimited wardrobe.",
            )

    created, rejected = [], []
    for f in files:
        data = await f.read()
        try:
            garment = await svc.create_from_upload(db, user, data)
            created.append(svc.to_out(garment))
        except InvalidImageError as e:
            rejected.append({"filename": f.filename or "", "reason": str(e)})
    if not created:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, rejected[0]["reason"])
    # Commit before dispatch so the job (separate session/worker) can see the rows.
    await db.commit()
    for g in created:
        dispatch(background, classify_garment_task, run_classification_job, g.id)
    return UploadResultOut(created=created, rejected=rejected)


@router.get("", response_model=GarmentListOut)
async def list_garments(
    user: CurrentUser,
    db: DbSession,
    occasion: str | None = None,
    fabric: str | None = None,
    season: str | None = None,
    garment_type: str | None = None,
    status_: Annotated[ClassificationStatus | None, Query(alias="status")] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=200)] = 50,
) -> GarmentListOut:
    rows, total = await svc.list_garments(
        db,
        user,
        occasion=occasion,
        fabric=fabric,
        season=season,
        garment_type=garment_type,
        status_=status_,
        page=page,
        page_size=page_size,
    )
    return GarmentListOut(
        items=[svc.to_out(g) for g in rows], total=total, page=page, page_size=page_size
    )


@router.get("/{garment_id}", response_model=GarmentOut)
async def get_garment(garment_id: uuid.UUID, user: CurrentUser, db: DbSession) -> GarmentOut:
    return svc.to_out(await svc.get_owned(db, user, garment_id))


@router.put("/{garment_id}", response_model=GarmentOut)
async def update_garment(
    garment_id: uuid.UUID, body: GarmentUpdate, user: CurrentUser, db: DbSession
) -> GarmentOut:
    garment = await svc.get_owned(db, user, garment_id)
    return svc.to_out(await svc.update_garment(db, garment, body))


@router.delete("/{garment_id}", response_model=Message)
async def delete_garment(garment_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Message:
    garment = await svc.get_owned(db, user, garment_id)
    await svc.delete_garment(db, garment)
    return Message(message="Garment deleted")


@router.post("/{garment_id}/wear", response_model=GarmentOut)
async def log_wear(garment_id: uuid.UUID, user: CurrentUser, db: DbSession) -> GarmentOut:
    garment = await svc.get_owned(db, user, garment_id)
    return svc.to_out(await svc.log_wear(db, garment))


@router.post("/{garment_id}/confirm", response_model=GarmentOut)
async def confirm_labels(garment_id: uuid.UUID, user: CurrentUser, db: DbSession) -> GarmentOut:
    """Mark the AI labels as correct (positive training signal)."""
    garment = await svc.get_owned(db, user, garment_id)
    return svc.to_out(await svc.confirm_labels(db, garment))


@router.post(
    "/{garment_id}/reclassify", response_model=GarmentOut, status_code=status.HTTP_202_ACCEPTED
)
async def reclassify(
    garment_id: uuid.UUID, user: CurrentUser, db: DbSession, background: BackgroundTasks
) -> GarmentOut:
    """Re-run classification (e.g. after a failure or a model upgrade)."""
    garment = await svc.get_owned(db, user, garment_id)
    garment.classification_status = ClassificationStatus.pending
    await db.commit()
    dispatch(background, classify_garment_task, run_classification_job, garment.id)
    return svc.to_out(garment)
