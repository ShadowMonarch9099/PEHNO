"""
Dialect-portable column types.

The schema targets Postgres (Supabase) in production but must also run on
SQLite for local development and tests. These decorators pick the native
type where available and fall back to a portable representation elsewhere.
"""
import uuid

from sqlalchemy import CHAR, JSON
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.types import TypeDecorator


class GUID(TypeDecorator):
    """UUID: native on Postgres, CHAR(36) elsewhere. Always a uuid.UUID in Python."""

    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(UUID(as_uuid=True))
        return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if dialect.name == "postgresql":
            return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))
        return str(value if isinstance(value, uuid.UUID) else uuid.UUID(str(value)))

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))


# JSON that becomes JSONB on Postgres (indexable, supports containment queries).
JSONColumn = JSON().with_variant(JSONB(), "postgresql")
