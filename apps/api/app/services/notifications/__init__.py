"""
Push notifications. FCM when FIREBASE_SERVICE_ACCOUNT is set; console otherwise.
"""
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from functools import lru_cache

from app.core.config import settings

log = logging.getLogger(__name__)


@dataclass
class Push:
    title: str
    body: str
    data: dict[str, str] = field(default_factory=dict)  # deep link etc.


class Notifier(ABC):
    name = "base"

    @abstractmethod
    async def send(self, token: str, push: Push) -> bool:
        ...


class ConsoleNotifier(Notifier):
    name = "console"

    async def send(self, token: str, push: Push) -> bool:
        log.info("[PUSH → %s…] %s — %s %s", token[:12], push.title, push.body, push.data or "")
        return True


class FcmNotifier(Notifier):
    name = "fcm"

    def __init__(self, service_account: str) -> None:
        import json
        from pathlib import Path

        import firebase_admin
        from firebase_admin import credentials

        cred_source = (
            json.loads(service_account)
            if service_account.strip().startswith("{")
            else str(Path(service_account))
        )
        if not firebase_admin._apps:
            firebase_admin.initialize_app(credentials.Certificate(cred_source))

    async def send(self, token: str, push: Push) -> bool:
        from fastapi.concurrency import run_in_threadpool
        from firebase_admin import messaging

        msg = messaging.Message(
            notification=messaging.Notification(title=push.title, body=push.body),
            data=push.data,
            token=token,
            android=messaging.AndroidConfig(priority="high"),
        )
        try:
            await run_in_threadpool(messaging.send, msg)
            return True
        except messaging.UnregisteredError:
            log.info("FCM token unregistered: %s…", token[:12])
            return False
        except Exception:
            log.exception("FCM send failed")
            return False


@lru_cache
def get_notifier() -> Notifier:
    if settings.FIREBASE_SERVICE_ACCOUNT:
        return FcmNotifier(settings.FIREBASE_SERVICE_ACCOUNT)
    return ConsoleNotifier()
