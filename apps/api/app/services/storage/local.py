"""
Local filesystem storage, served by the API at /media/{key} with signed,
time-limited URLs (same contract as Supabase signed URLs).
Keys are relative paths like "garments/<user_id>/<uuid>.jpg".
"""
import hmac
import time
from hashlib import sha256
from pathlib import Path
from urllib.parse import urlencode

import aiofiles
import aiofiles.os

from app.core.config import settings
from app.services.storage.base import StorageBackend


def _sign(key: str, exp: int) -> str:
    return hmac.new(settings.JWT_SECRET.encode(), f"{key}:{exp}".encode(), sha256).hexdigest()[:32]


def verify_media_signature(key: str, exp: str | None, sig: str | None) -> bool:
    try:
        exp_i = int(exp or "0")
    except ValueError:
        return False
    if exp_i < time.time() or not sig:
        return False
    return hmac.compare_digest(_sign(key, exp_i), sig)


class LocalStorage(StorageBackend):
    def __init__(self, root: str, public_base_url: str) -> None:
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self.public_base_url = public_base_url.rstrip("/")

    def path_for(self, key: str) -> Path:
        p = (self.root / key).resolve()
        if self.root not in p.parents:  # guard against "../" keys
            raise ValueError(f"Invalid storage key: {key}")
        return p

    async def put(self, key: str, data: bytes, content_type: str = "image/jpeg") -> None:
        p = self.path_for(key)
        p.parent.mkdir(parents=True, exist_ok=True)
        async with aiofiles.open(p, "wb") as f:
            await f.write(data)

    async def get(self, key: str) -> bytes:
        async with aiofiles.open(self.path_for(key), "rb") as f:
            return await f.read()

    async def delete(self, key: str) -> None:
        p = self.path_for(key)
        if p.exists():
            await aiofiles.os.remove(p)

    def url_for(self, key: str) -> str:
        exp = int(time.time()) + settings.SIGNED_URL_EXPIRY_SECONDS
        return (
            f"{self.public_base_url}/media/{key}?{urlencode({'exp': exp, 'sig': _sign(key, exp)})}"
        )
