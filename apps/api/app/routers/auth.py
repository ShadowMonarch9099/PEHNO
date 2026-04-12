"""
Auth Router — OTP-based phone authentication
"""
import random
import hashlib
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.auth import create_access_token, create_refresh_token, verify_token
from app.models.models import User, OtpStore
from app.schemas.schemas import (
    SendOtpRequest, VerifyOtpRequest, RefreshTokenRequest, AuthTokenResponse, MessageResponse
)

router = APIRouter()


def generate_otp() -> str:
    """Generate a 6-digit OTP."""
    return str(random.randint(100000, 999999))


def hash_otp(otp: str, phone: str) -> str:
    """Hash OTP with phone salt for storage."""
    return hashlib.sha256(f"{otp}{phone}".encode()).hexdigest()


async def send_sms_otp(phone: str, otp: str) -> bool:
    """
    Send OTP via SMS (stub for Phase 1).
    In production: integrate Twilio / MSG91 / Fast2SMS.
    """
    # Phase 1: Log OTP for testing (remove in production)
    print(f"[OTP] Phone: {phone} → OTP: {otp}")
    return True


@router.post("/send-otp", response_model=MessageResponse)
async def send_otp(request: SendOtpRequest, db: AsyncSession = Depends(get_db)):
    """Send OTP to phone number."""
    otp = generate_otp()
    otp_hash = hash_otp(otp, request.phone)
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    # Invalidate any existing OTPs for this phone
    existing = await db.execute(
        select(OtpStore)
        .where(OtpStore.phone == request.phone, OtpStore.is_used == False)
    )
    for old_otp in existing.scalars():
        old_otp.is_used = True

    # Store new OTP
    new_otp = OtpStore(
        phone=request.phone,
        otp_hash=otp_hash,
        expires_at=expires_at,
    )
    db.add(new_otp)
    await db.commit()

    # Send SMS
    await send_sms_otp(request.phone, otp)

    return MessageResponse(message=f"OTP sent to {request.phone}")


@router.post("/verify-otp", response_model=AuthTokenResponse)
async def verify_otp(request: VerifyOtpRequest, db: AsyncSession = Depends(get_db)):
    """Verify OTP and return JWT tokens. Creates user if first login."""
    otp_hash = hash_otp(request.otp, request.phone)

    result = await db.execute(
        select(OtpStore).where(
            OtpStore.phone == request.phone,
            OtpStore.otp_hash == otp_hash,
            OtpStore.is_used == False,
        )
    )
    otp_record = result.scalar_one_or_none()

    if not otp_record:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP")

    if otp_record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP has expired")

    # Mark OTP as used
    otp_record.is_used = True

    # Get or create user
    user_result = await db.execute(select(User).where(User.phone == request.phone))
    user = user_result.scalar_one_or_none()
    is_new_user = user is None

    if not user:
        user = User(phone=request.phone)
        db.add(user)
        await db.flush()

    await db.commit()

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))

    return AuthTokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=str(user.id),
        is_new_user=is_new_user,
    )


@router.post("/refresh", response_model=AuthTokenResponse)
async def refresh_token(request: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """Refresh access token using refresh token."""
    user_id = verify_token(request.refresh_token, token_type="refresh")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return AuthTokenResponse(
        access_token=create_access_token(user_id),
        refresh_token=create_refresh_token(user_id),
        user_id=user_id,
        is_new_user=False,
    )


@router.post("/logout", response_model=MessageResponse)
async def logout():
    """Logout — client should discard tokens."""
    return MessageResponse(message="Logged out successfully")
