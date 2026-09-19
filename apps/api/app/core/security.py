"""
JWT issuing/verification and the current-user dependency.
"""
import uuid
from datetime import datetime, timedelta
from typing import Annotated, Literal

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db, utcnow
from app.models.user import User

TokenType = Literal["access", "refresh"]

bearer = HTTPBearer(auto_error=False)


def _encode(subject: str, token_type: TokenType, expires_at: datetime, jti: str) -> str:
    payload = {"sub": subject, "type": token_type, "iat": utcnow(), "exp": expires_at, "jti": jti}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_access_token(user_id: uuid.UUID) -> str:
    exp = utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    # Random jti keeps every access token unique, even two minted in the same second.
    return _encode(str(user_id), "access", exp, jti=uuid.uuid4().hex)


def create_refresh_token(user_id: uuid.UUID, jti: uuid.UUID, expires_at: datetime) -> str:
    return _encode(str(user_id), "refresh", expires_at, jti=str(jti))


def decode_token(token: str, expected_type: TokenType) -> dict:
    """Decode + validate signature, expiry and token type. Raises 401 on any failure."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as e:
        raise _unauthorized("Could not validate credentials") from e
    if payload.get("type") != expected_type or not payload.get("sub"):
        raise _unauthorized("Invalid token")
    return payload


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    if credentials is None:
        raise _unauthorized("Not authenticated")
    payload = decode_token(credentials.credentials, "access")
    try:
        user_id = uuid.UUID(payload["sub"])
    except ValueError as e:
        raise _unauthorized("Invalid token subject") from e
    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise _unauthorized("User not found or inactive")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[AsyncSession, Depends(get_db)]
