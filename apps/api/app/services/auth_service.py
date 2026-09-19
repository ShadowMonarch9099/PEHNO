"""
OTP login + refresh-token lifecycle.

Security properties:
- OTP codes are never stored; only HMAC-SHA256(secret, phone:code).
- Each OTP allows OTP_MAX_ATTEMPTS verifications, expires after OTP_EXPIRE_MINUTES,
  and is single-use. Issuing a new OTP invalidates older ones for that phone.
- Refresh tokens are recorded server-side by jti and rotated on every use, so a
  stolen refresh token is invalidated the moment the legitimate client refreshes.
"""
import hmac
import secrets
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from hashlib import sha256

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import utcnow
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.models.auth import OtpCode, RefreshToken
from app.models.user import User
from app.services.otp import get_otp_provider


@dataclass
class TokenPair:
    access_token: str
    refresh_token: str
    user: User
    is_new_user: bool


def _hash_code(phone: str, code: str) -> str:
    return hmac.new(settings.JWT_SECRET.encode(), f"{phone}:{code}".encode(), sha256).hexdigest()


def _aware(dt: datetime) -> datetime:
    """SQLite returns naive datetimes; treat them as UTC."""
    return dt if dt.tzinfo else dt.replace(tzinfo=UTC)


# ── OTP ──────────────────────────────────────────────────────────────────────


async def send_otp(db: AsyncSession, phone: str) -> str | None:
    """Issue and deliver an OTP. Returns the code only when the provider echoes (dev)."""
    now = utcnow()
    code = f"{secrets.randbelow(1_000_000):06d}"

    await db.execute(
        update(OtpCode)
        .where(OtpCode.phone == phone, OtpCode.consumed.is_(False))
        .values(consumed=True)
    )
    db.add(
        OtpCode(
            phone=phone,
            code_hash=_hash_code(phone, code),
            expires_at=now + timedelta(minutes=settings.OTP_EXPIRE_MINUTES),
            created_at=now,
        )
    )
    await db.flush()

    provider = get_otp_provider()
    await provider.send(phone, code)
    return code if provider.echoes_code else None


async def verify_otp(db: AsyncSession, phone: str, code: str) -> TokenPair:
    now = utcnow()
    result = await db.execute(
        select(OtpCode)
        .where(OtpCode.phone == phone, OtpCode.consumed.is_(False))
        .order_by(OtpCode.created_at.desc())
        .limit(1)
    )
    otp = result.scalar_one_or_none()

    if otp is None or _aware(otp.expires_at) < now:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "OTP expired or not found. Request a new one."
        )
    locked = "Too many incorrect attempts. Request a new OTP."
    if otp.attempts >= settings.OTP_MAX_ATTEMPTS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, locked)

    # Failed attempts must survive the error response (the request-scoped session
    # rolls back on exception), so commit before raising.
    otp.attempts += 1
    if not hmac.compare_digest(otp.code_hash, _hash_code(phone, code)):
        await db.commit()
        exhausted = otp.attempts >= settings.OTP_MAX_ATTEMPTS
        raise HTTPException(status.HTTP_400_BAD_REQUEST, locked if exhausted else "Incorrect OTP")

    otp.consumed = True

    user = (await db.execute(select(User).where(User.phone == phone))).scalar_one_or_none()
    is_new = user is None
    if is_new:
        user = User(phone=phone)
        db.add(user)
    user.last_login_at = now
    await db.flush()

    return await _issue_tokens(db, user, is_new)


# ── Refresh / logout ─────────────────────────────────────────────────────────


async def _issue_tokens(db: AsyncSession, user: User, is_new: bool = False) -> TokenPair:
    now = utcnow()
    record = RefreshToken(
        user_id=user.id,
        expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        created_at=now,
    )
    db.add(record)
    await db.flush()
    return TokenPair(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id, record.id, record.expires_at),
        user=user,
        is_new_user=is_new,
    )


async def _load_refresh_record(db: AsyncSession, token: str) -> RefreshToken:
    payload = decode_token(token, "refresh")
    try:
        jti = uuid.UUID(payload.get("jti", ""))
    except ValueError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token") from e
    record = await db.get(RefreshToken, jti)
    if record is None or record.revoked or _aware(record.expires_at) < utcnow():
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token is invalid or revoked")
    return record


async def refresh_tokens(db: AsyncSession, token: str) -> TokenPair:
    record = await _load_refresh_record(db, token)
    user = await db.get(User, record.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")
    record.revoked = True  # rotate
    return await _issue_tokens(db, user)


async def revoke_refresh_token(db: AsyncSession, token: str) -> None:
    """Logout. Idempotent: an already-invalid token is not an error."""
    try:
        record = await _load_refresh_record(db, token)
    except HTTPException:
        return
    record.revoked = True


async def revoke_all_for_user(db: AsyncSession, user_id: uuid.UUID) -> None:
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked.is_(False))
        .values(revoked=True)
    )
