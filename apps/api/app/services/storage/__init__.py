"""
Image storage. Local filesystem by default; Supabase Storage when configured.
Both expose the same interface so callers never branch on backend.
"""
from functools import lru_cache

from app.core.config import settings
from app.services.storage.base import StorageBackend
from app.services.storage.local import LocalStorage


@lru_cache
def get_storage() -> StorageBackend:
    if settings.STORAGE_BACKEND == "supabase":
        from app.services.storage.supabase import SupabaseStorage

        return SupabaseStorage(
            url=settings.SUPABASE_URL,
            service_key=settings.SUPABASE_SERVICE_KEY,
            bucket=settings.GARMENT_IMAGES_BUCKET,
            signed_url_ttl=settings.SIGNED_URL_EXPIRY_SECONDS,
        )
    return LocalStorage(root=settings.LOCAL_MEDIA_DIR, public_base_url=settings.PUBLIC_BASE_URL)


__all__ = ["StorageBackend", "get_storage"]
