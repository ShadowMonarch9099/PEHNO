"""
OTP delivery providers. get_otp_provider() picks one from settings.
"""
from functools import lru_cache

from app.core.config import settings
from app.services.otp.base import OtpProvider
from app.services.otp.console import ConsoleOtpProvider
from app.services.otp.msg91 import Msg91OtpProvider


@lru_cache
def get_otp_provider() -> OtpProvider:
    if settings.OTP_PROVIDER == "msg91":
        return Msg91OtpProvider(settings.MSG91_AUTH_KEY, settings.MSG91_TEMPLATE_ID)
    return ConsoleOtpProvider()


__all__ = ["OtpProvider", "get_otp_provider"]
