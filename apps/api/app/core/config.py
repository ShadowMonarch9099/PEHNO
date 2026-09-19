"""
Application settings.

Every value has a working local default so the API boots with no external
services. Production overrides come from environment variables / .env.
"""
from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    # ── App ──────────────────────────────────────────────────────────────────
    APP_NAME: str = "PEHNO"
    APP_VERSION: str = "0.1.0"
    APP_ENV: Literal["development", "test", "production"] = "development"
    DEBUG: bool = True
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:8081"]

    # ── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite+aiosqlite:///./pehno.db"

    # ── Auth ─────────────────────────────────────────────────────────────────
    JWT_SECRET: str = Field(default="insecure-local-dev-secret", min_length=16)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ── OTP ──────────────────────────────────────────────────────────────────
    OTP_PROVIDER: Literal["console", "msg91"] = "console"
    OTP_EXPIRE_MINUTES: int = 10
    OTP_MAX_ATTEMPTS: int = 5
    OTP_SEND_LIMIT_PER_HOUR: int = 5
    MSG91_AUTH_KEY: str = ""
    MSG91_TEMPLATE_ID: str = ""

    # ── Storage ──────────────────────────────────────────────────────────────
    STORAGE_BACKEND: Literal["local", "supabase"] = "local"
    LOCAL_MEDIA_DIR: str = "./media"
    PUBLIC_BASE_URL: str = "http://localhost:8000"
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    GARMENT_IMAGES_BUCKET: str = "garment-images"
    SIGNED_URL_EXPIRY_SECONDS: int = 3600

    # ── Knowledge base ───────────────────────────────────────────────────────
    # Relative paths resolve from the apps/api directory.
    KNOWLEDGE_DIR: str = "../../packages/ai/data"

    # ── Uploads ──────────────────────────────────────────────────────────────
    MAX_UPLOAD_BYTES: int = 12 * 1024 * 1024
    MAX_BULK_UPLOAD: int = 10
    IMAGE_MAX_SIDE: int = 1024
    THUMBNAIL_SIDE: int = 320
    IMAGE_TARGET_BYTES: int = 300 * 1024

    # ── Observability ────────────────────────────────────────────────────────
    SENTRY_DSN: str = ""

    @field_validator("JWT_SECRET")
    @classmethod
    def _reject_default_secret_in_prod(cls, v: str, info) -> str:
        if info.data.get("APP_ENV") == "production" and v == "insecure-local-dev-secret":
            raise ValueError("JWT_SECRET must be set in production")
        return v

    @property
    def is_sqlite(self) -> bool:
        return self.DATABASE_URL.startswith("sqlite")

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
