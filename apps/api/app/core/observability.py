"""
Sentry + logging bootstrap. No-op when SENTRY_DSN is unset.
"""
import logging

from app.core.config import settings


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.DEBUG if settings.DEBUG else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    for noisy in ("sqlalchemy.engine", "aiosqlite", "httpx", "httpcore", "urllib3", "PIL"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def setup_sentry() -> None:
    if not settings.SENTRY_DSN:
        return
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.APP_ENV,
        release=f"pehno-api@{settings.APP_VERSION}",
        integrations=[FastApiIntegration(), SqlalchemyIntegration()],
        traces_sample_rate=0.1 if settings.is_production else 1.0,
        send_default_pii=False,
    )
