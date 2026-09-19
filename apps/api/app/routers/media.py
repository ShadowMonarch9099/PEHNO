"""
/media — serves locally stored images, only with a valid signed URL.
(Only mounted when STORAGE_BACKEND=local.)
"""
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from app.services.storage import get_storage
from app.services.storage.local import LocalStorage, verify_media_signature

router = APIRouter(prefix="/media", tags=["media"])


@router.get("/{key:path}")
async def get_media(key: str, exp: str | None = None, sig: str | None = None) -> FileResponse:
    if not verify_media_signature(key, exp, sig):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Invalid or expired media link")
    storage = get_storage()
    assert isinstance(storage, LocalStorage)
    try:
        path = storage.path_for(key)
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found") from e
    if not path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    return FileResponse(
        path, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=3600"}
    )
