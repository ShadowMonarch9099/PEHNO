import logging

from app.services.otp.base import OtpProvider

log = logging.getLogger(__name__)


class ConsoleOtpProvider(OtpProvider):
    """Dev provider: logs the code instead of sending an SMS."""

    echoes_code = True

    async def send(self, phone: str, code: str) -> None:
        log.info("[OTP] %s -> %s", phone, code)
