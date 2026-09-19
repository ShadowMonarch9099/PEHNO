from abc import ABC, abstractmethod


class StorageBackend(ABC):
    @abstractmethod
    async def put(self, key: str, data: bytes, content_type: str = "image/jpeg") -> None:
        ...

    @abstractmethod
    async def delete(self, key: str) -> None:
        ...

    @abstractmethod
    def url_for(self, key: str) -> str:
        """Return a URL a client can fetch. May be time-limited (signed)."""

    @abstractmethod
    async def get(self, key: str) -> bytes:
        """Read an object's bytes (used by the classifier)."""
