"""
Transactional email (stylist verification outcome). SMTP when configured,
console otherwise — same shape as the OTP and push providers.
"""
import logging
import smtplib
from abc import ABC, abstractmethod
from email.message import EmailMessage
from functools import lru_cache

from fastapi.concurrency import run_in_threadpool

from app.core.config import settings

log = logging.getLogger(__name__)


class EmailProvider(ABC):
    name = "base"

    @abstractmethod
    async def send(self, to: str, subject: str, body: str) -> bool:
        ...


class ConsoleEmail(EmailProvider):
    name = "console"

    async def send(self, to: str, subject: str, body: str) -> bool:
        log.info("[EMAIL → %s] %s — %s", to, subject, body.replace("\n", " ")[:200])
        return True


class SmtpEmail(EmailProvider):
    name = "smtp"

    async def send(self, to: str, subject: str, body: str) -> bool:
        msg = EmailMessage()
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(body)

        def _send() -> None:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as s:
                s.starttls()
                if settings.SMTP_USER:
                    s.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                s.send_message(msg)

        try:
            await run_in_threadpool(_send)
            return True
        except Exception:  # never fail the admin action over email
            log.exception("email to %s failed", to)
            return False


@lru_cache
def get_email_provider() -> EmailProvider:
    return SmtpEmail() if settings.SMTP_HOST else ConsoleEmail()


async def stylist_verified_email(to: str | None, name: str, verified: bool) -> None:
    if not to:
        return
    if verified:
        subject = "You're live on PEHNO as a stylist"
        body = (
            f"Hi {name},\n\nYour stylist profile has been verified and is now listed in the app. "
            "Users in your city can book sessions with you from today.\n\n— Team PEHNO"
        )
    else:
        subject = "Your PEHNO stylist application"
        body = (
            f"Hi {name},\n\nThanks for applying. We couldn't list your profile this time — "
            "you can update your bio, specialties and portfolio in the app and reapply.\n\n— Team PEHNO"
        )
    await get_email_provider().send(to, subject, body)
