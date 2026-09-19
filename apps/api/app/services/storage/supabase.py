"""
Supabase Storage (private bucket + signed URLs) via its REST API.
Uses httpx directly so we don't pull the whole supabase-py client in.
"""
import httpx

from app.services.storage.base import StorageBackend


class SupabaseStorage(StorageBackend):
    def __init__(self, url: str, service_key: str, bucket: str, signed_url_ttl: int) -> None:
        if not url or not service_key:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_SERVICE_KEY are required for STORAGE_BACKEND=supabase"
            )
        self.base = f"{url.rstrip('/')}/storage/v1"
        self.bucket = bucket
        self.ttl = signed_url_ttl
        self._headers = {"Authorization": f"Bearer {service_key}", "apikey": service_key}

    async def put(self, key: str, data: bytes, content_type: str = "image/jpeg") -> None:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                f"{self.base}/object/{self.bucket}/{key}",
                content=data,
                headers={**self._headers, "Content-Type": content_type, "x-upsert": "true"},
            )
            r.raise_for_status()

    async def delete(self, key: str) -> None:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.delete(
                f"{self.base}/object/{self.bucket}/{key}", headers=self._headers
            )
            if r.status_code not in (200, 404):
                r.raise_for_status()

    def url_for(self, key: str) -> str:
        # Signing requires a network call; callers needing many URLs should batch.
        # For now expose the object path; a signed-URL resolver lands with the wardrobe router.
        return f"{self.base}/object/authenticated/{self.bucket}/{key}"
