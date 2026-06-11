"""
PEHNO Application Settings (Pydantic v2)
"""
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List
import os


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────────────────
    APP_NAME: str = "PEHNO"
    DEBUG: bool = Field(default=False, alias="DEBUG")
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8081"]

    # ── Database (Supabase / PostgreSQL) ──────────────────────
    SUPABASE_URL: str = Field(..., alias="SUPABASE_URL")
    SUPABASE_ANON_KEY: str = Field(..., alias="SUPABASE_ANON_KEY")
    SUPABASE_SERVICE_KEY: str = Field(..., alias="SUPABASE_SERVICE_KEY")
    DATABASE_URL: str = Field(..., alias="DATABASE_URL")

    # ── Auth (JWT) ─────────────────────────────────────────────
    JWT_SECRET: str = Field(..., alias="JWT_SECRET")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ── Redis / Celery ─────────────────────────────────────────
    REDIS_URL: str = Field(default="redis://localhost:6379", alias="REDIS_URL")

    # ── OpenWeatherMap ─────────────────────────────────────────
    OPENWEATHER_API_KEY: str = Field(..., alias="OPENWEATHER_API_KEY")
    OPENWEATHER_BASE_URL: str = "https://api.openweathermap.org/data/2.5"

    # ── Firebase (FCM) ─────────────────────────────────────────
    FIREBASE_SERVICE_ACCOUNT_JSON: str = Field(default="", alias="FIREBASE_SERVICE_ACCOUNT_JSON")

    # ── HuggingFace ────────────────────────────────────────────
    HF_MODEL_NAME: str = "google/vit-base-patch16-224"
    HF_API_TOKEN: str = Field(default="", alias="HF_API_TOKEN")

    # ── Admin ──────────────────────────────────────────────────
    ADMIN_EMAIL_DOMAIN: str = Field(default="pehno.in", alias="ADMIN_EMAIL_DOMAIN")

    # ── Storage ────────────────────────────────────────────────
    GARMENT_IMAGES_BUCKET: str = "garment-images"
    SIGNED_URL_EXPIRY_SECONDS: int = 3600

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "populate_by_name": True,
        "extra": "ignore",
    }


settings = Settings()
