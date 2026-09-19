from pydantic import BaseModel, Field, field_validator

from app.core.phone import normalize_indian_phone
from app.schemas.user import UserOut


class PhoneIn(BaseModel):
    phone: str = Field(..., examples=["9876543210", "+919876543210"])

    @field_validator("phone")
    @classmethod
    def _normalize(cls, v: str) -> str:
        return normalize_indian_phone(v)


class SendOtpOut(BaseModel):
    message: str
    phone: str
    expires_in_seconds: int
    #: Present only in dev when OTP_PROVIDER=console.
    dev_otp: str | None = None


class VerifyOtpIn(PhoneIn):
    otp: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


class RefreshIn(BaseModel):
    refresh_token: str


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    is_new_user: bool
    user: UserOut
