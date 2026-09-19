from datetime import UTC, datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, PlainSerializer


def _to_utc_iso(value: datetime) -> str:
    # SQLite returns naive datetimes (we always store UTC); Postgres returns aware ones.
    return (value if value.tzinfo else value.replace(tzinfo=UTC)).isoformat()


#: Use for every datetime in a response schema so clients always get an aware UTC ISO string.
UTCDateTime = Annotated[datetime, PlainSerializer(_to_utc_iso, return_type=str, when_used="json")]


class APIModel(BaseModel):
    """Base for response schemas built from ORM objects."""

    model_config = ConfigDict(from_attributes=True)


class Message(BaseModel):
    message: str
