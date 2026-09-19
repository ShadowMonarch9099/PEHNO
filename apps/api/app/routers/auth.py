"""
/auth — OTP-based phone login. No passwords anywhere.
"""
from fastapi import APIRouter, Request

from app.core.config import settings
from app.core.rate_limit import RateLimiter
from app.core.security import CurrentUser, DbSession
from app.schemas.auth import PhoneIn, RefreshIn, SendOtpOut, TokenOut, VerifyOtpIn
from app.schemas.common import Message
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])

# Per-phone and per-IP caps on OTP sends; per-IP cap on verification attempts.
send_limiter_phone = RateLimiter(limit=settings.OTP_SEND_LIMIT_PER_HOUR, window_seconds=3600)
send_limiter_ip = RateLimiter(limit=settings.OTP_SEND_LIMIT_PER_HOUR * 4, window_seconds=3600)
verify_limiter_ip = RateLimiter(limit=30, window_seconds=600)


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    return (
        fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "unknown")
    )


def _token_response(pair: auth_service.TokenPair) -> TokenOut:
    return TokenOut(
        access_token=pair.access_token,
        refresh_token=pair.refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        is_new_user=pair.is_new_user,
        user=pair.user,
    )


@router.post("/send-otp", response_model=SendOtpOut)
async def send_otp(body: PhoneIn, request: Request, db: DbSession) -> SendOtpOut:
    send_limiter_ip.check(_client_ip(request))
    send_limiter_phone.check(body.phone)
    code = await auth_service.send_otp(db, body.phone)
    return SendOtpOut(
        message="OTP sent",
        phone=body.phone,
        expires_in_seconds=settings.OTP_EXPIRE_MINUTES * 60,
        dev_otp=code if settings.DEBUG else None,
    )


@router.post("/verify-otp", response_model=TokenOut)
async def verify_otp(body: VerifyOtpIn, request: Request, db: DbSession) -> TokenOut:
    verify_limiter_ip.check(_client_ip(request))
    pair = await auth_service.verify_otp(db, body.phone, body.otp)
    return _token_response(pair)


@router.post("/refresh", response_model=TokenOut)
async def refresh(body: RefreshIn, db: DbSession) -> TokenOut:
    pair = await auth_service.refresh_tokens(db, body.refresh_token)
    return _token_response(pair)


@router.post("/logout", response_model=Message)
async def logout(body: RefreshIn, db: DbSession) -> Message:
    """Revoke the given refresh token. Access tokens expire naturally (short-lived)."""
    await auth_service.revoke_refresh_token(db, body.refresh_token)
    return Message(message="Logged out")


@router.post("/logout-all", response_model=Message)
async def logout_all(user: CurrentUser, db: DbSession) -> Message:
    """Revoke every refresh token for the current user (all devices)."""
    await auth_service.revoke_all_for_user(db, user.id)
    return Message(message="Logged out from all devices")
