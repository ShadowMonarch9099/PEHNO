"""
Product analytics. Server-side events keep the funnel measurable without a
mobile SDK. PostHog when POSTHOG_API_KEY is set; otherwise events are logged.

Event names are the contract with the dashboards — change deliberately.
"""
import logging
from typing import Any

from app.core.config import settings

log = logging.getLogger("pehno.analytics")

# Canonical event names (used by scripts/mvp_metrics.py and the future admin dashboard)
SIGNED_UP = "user_signed_up"
LOGGED_IN = "user_logged_in"
ONBOARDING_COMPLETED = "onboarding_completed"
GARMENT_UPLOADED = "garment_uploaded"
GARMENT_CLASSIFIED = "garment_classified"
GARMENT_CORRECTED = "garment_corrected"
GARMENT_CONFIRMED = "garment_confirmed"
OUTFIT_GENERATED = "outfit_generated"
OUTFIT_FEEDBACK = "outfit_feedback"
OUTFIT_WORN = "outfit_worn"
OUTFIT_SAVED = "outfit_saved"
FESTIVAL_VIEWED = "festival_viewed"
PUSH_SENT = "push_sent"
PUSH_OPENED = "push_opened"

_client = None


def _posthog():
    global _client
    if _client is None and settings.POSTHOG_API_KEY:
        import posthog

        posthog.project_api_key = settings.POSTHOG_API_KEY
        posthog.host = settings.POSTHOG_HOST
        _client = posthog
    return _client


def track(user_id: Any, event: str, **properties: Any) -> None:
    """Fire-and-forget. Never raises; analytics must not break requests."""
    props = {k: v for k, v in properties.items() if v is not None}
    try:
        ph = _posthog()
        if ph is not None:
            ph.capture(distinct_id=str(user_id), event=event, properties=props)
        else:
            log.info("event=%s user=%s %s", event, user_id, props)
    except Exception:  # pragma: no cover
        log.exception("analytics capture failed")
