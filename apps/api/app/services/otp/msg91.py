"""
MSG91 OTP delivery (India). Needs MSG91_AUTH_KEY + an approved OTP template.
Docs: https://docs.msg91.com/reference/send-otp
"""
import httpx

from app.services.otp.base import OtpProvider


class Msg91OtpProvider(OtpProvider):
    SEND_URL = "https://control.msg91.com/api/v5/otp"

    def __init__(self, auth_key: str, template_id: str) -> None:
        if not auth_key or not template_id:
            raise ValueError(
                "MSG91_AUTH_KEY and MSG91_TEMPLATE_ID are required for OTP_PROVIDER=msg91"
            )
        self.auth_key = auth_key
        self.template_id = template_id

    async def send(self, phone: str, code: str) -> None:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                self.SEND_URL,
                params={"mobile": phone.lstrip("+"), "template_id": self.template_id, "otp": code},
                headers={"authkey": self.auth_key},
            )
            r.raise_for_status()
