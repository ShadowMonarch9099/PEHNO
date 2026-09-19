"""
PEHNO API — application factory.
"""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.observability import setup_logging, setup_sentry
from app.routers import auth, health, meta, users, wardrobe


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    setup_sentry()
    if settings.STORAGE_BACKEND == "local":
        Path(settings.LOCAL_MEDIA_DIR).mkdir(parents=True, exist_ok=True)
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="PEHNO API",
        description="AI Wardrobe Intelligence Platform for India",
        version=settings.APP_VERSION,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url=None,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(users.router)
    app.include_router(wardrobe.router)
    app.include_router(meta.router)

    if settings.STORAGE_BACKEND == "local":
        media_dir = Path(settings.LOCAL_MEDIA_DIR)
        media_dir.mkdir(parents=True, exist_ok=True)
        app.mount("/media", StaticFiles(directory=str(media_dir)), name="media")

    @app.exception_handler(RequestValidationError)
    async def _validation_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        # Flatten pydantic errors into {field: message} — friendlier for the mobile client.
        errors = {".".join(str(p) for p in e["loc"] if p != "body"): e["msg"] for e in exc.errors()}
        return JSONResponse(
            status_code=422, content={"detail": "Validation failed", "errors": errors}
        )

    return app


app = create_app()
