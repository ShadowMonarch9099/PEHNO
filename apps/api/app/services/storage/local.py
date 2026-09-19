"""
Local filesystem storage, served by the API under /media.
Keys are relative paths like "garments/<user_id>/<uuid>.jpg".
"""
from pathlib import Path

import aiofiles
import aiofiles.os

from app.services.storage.base import StorageBackend


class LocalStorage(StorageBackend):
    def __init__(self, root: str, public_base_url: str) -> None:
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self.public_base_url = public_base_url.rstrip("/")

    def _path(self, key: str) -> Path:
        p = (self.root / key).resolve()
        if self.root not in p.parents:  # guard against "../" keys
            raise ValueError(f"Invalid storage key: {key}")
        return p

    async def put(self, key: str, data: bytes, content_type: str = "image/jpeg") -> None:
        p = self._path(key)
        p.parent.mkdir(parents=True, exist_ok=True)
        async with aiofiles.open(p, "wb") as f:
            await f.write(data)

    async def get(self, key: str) -> bytes:
        async with aiofiles.open(self._path(key), "rb") as f:
            return await f.read()

    async def delete(self, key: str) -> None:
        p = self._path(key)
        if p.exists():
            await aiofiles.os.remove(p)

    def url_for(self, key: str) -> str:
        return f"{self.public_base_url}/media/{key}"
