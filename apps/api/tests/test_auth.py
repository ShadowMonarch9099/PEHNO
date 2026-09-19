from datetime import timedelta

import pytest
from sqlalchemy import select

from app.core.config import settings
from app.core.database import utcnow
from app.models.auth import OtpCode, RefreshToken
from tests.conftest import auth_headers, login

PHONE = "9876543210"
E164 = "+919876543210"


async def _send(client, phone=PHONE) -> str:
    r = await client.post("/auth/send-otp", json={"phone": phone})
    assert r.status_code == 200, r.text
    return r.json()["dev_otp"]


async def _verify(client, otp, phone=PHONE):
    return await client.post("/auth/verify-otp", json={"phone": phone, "otp": otp})


def _wrong(otp: str) -> str:
    return "000000" if otp != "000000" else "111111"


async def test_send_otp_normalizes_phone_and_echoes_code_in_dev(client):
    r = await client.post("/auth/send-otp", json={"phone": "98765 43210"})
    assert r.status_code == 200
    body = r.json()
    assert body["phone"] == E164
    assert body["dev_otp"] and len(body["dev_otp"]) == 6
    assert body["expires_in_seconds"] == settings.OTP_EXPIRE_MINUTES * 60


@pytest.mark.parametrize("bad", ["12345", "5876543210", "+1 415 555 0100", "abc", ""])
async def test_send_otp_rejects_non_indian_numbers(client, bad):
    r = await client.post("/auth/send-otp", json={"phone": bad})
    assert r.status_code == 422
    assert "phone" in r.json()["errors"]


async def test_verify_otp_creates_user_and_returns_tokens(client):
    tokens = await login(client, PHONE)
    assert tokens["is_new_user"] is True
    assert tokens["token_type"] == "bearer"
    assert tokens["user"]["phone"] == E164
    assert tokens["user"]["subscription_tier"] == "free"
    assert tokens["user"]["onboarding_complete"] is False

    again = await login(client, PHONE)
    assert again["is_new_user"] is False
    assert again["user"]["id"] == tokens["user"]["id"]


async def test_verify_otp_wrong_code_then_right_code(client):
    otp = await _send(client)
    r = await _verify(client, _wrong(otp))
    assert r.status_code == 400
    assert r.json()["detail"] == "Incorrect OTP"
    assert (await _verify(client, otp)).status_code == 200


async def test_otp_is_single_use(client):
    otp = await _send(client)
    assert (await _verify(client, otp)).status_code == 200
    assert (await _verify(client, otp)).status_code == 400


async def test_otp_locks_after_max_attempts(client):
    otp = await _send(client)
    for _ in range(settings.OTP_MAX_ATTEMPTS):
        await _verify(client, _wrong(otp))
    r = await _verify(client, otp)
    assert r.status_code == 400
    assert "Too many" in r.json()["detail"]


async def test_new_otp_invalidates_previous(client):
    first = await _send(client)
    second = await _send(client)
    if first == second:
        pytest.skip("1-in-a-million OTP collision")
    assert (await _verify(client, first)).status_code == 400
    assert (await _verify(client, second)).status_code == 200


async def test_expired_otp_rejected(client, db):
    otp = await _send(client)
    row = (await db.execute(select(OtpCode).where(OtpCode.phone == E164))).scalar_one()
    row.expires_at = utcnow() - timedelta(seconds=1)
    await db.commit()
    r = await _verify(client, otp)
    assert r.status_code == 400
    assert "expired" in r.json()["detail"].lower()


async def test_send_otp_rate_limited_per_phone(client):
    for _ in range(settings.OTP_SEND_LIMIT_PER_HOUR):
        await _send(client)
    r = await client.post("/auth/send-otp", json={"phone": PHONE})
    assert r.status_code == 429
    assert "Retry-After" in r.headers


async def test_refresh_rotates_and_revokes_old_token(client, db):
    tokens = await login(client)
    r = await client.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert r.status_code == 200
    new = r.json()
    assert new["access_token"] != tokens["access_token"]
    assert new["refresh_token"] != tokens["refresh_token"]

    r = await client.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert r.status_code == 401
    r = await client.post("/auth/refresh", json={"refresh_token": new["refresh_token"]})
    assert r.status_code == 200

    revoked = (
        (await db.execute(select(RefreshToken).where(RefreshToken.revoked.is_(True))))
        .scalars()
        .all()
    )
    assert len(revoked) == 2


async def test_access_token_cannot_be_used_as_refresh(client):
    tokens = await login(client)
    r = await client.post("/auth/refresh", json={"refresh_token": tokens["access_token"]})
    assert r.status_code == 401


async def test_logout_revokes_refresh_token(client):
    tokens = await login(client)
    assert (
        await client.post("/auth/logout", json={"refresh_token": tokens["refresh_token"]})
    ).status_code == 200
    assert (
        await client.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    ).status_code == 401
    # idempotent
    assert (
        await client.post("/auth/logout", json={"refresh_token": tokens["refresh_token"]})
    ).status_code == 200


async def test_logout_all_revokes_every_device(client):
    a = await login(client)
    b = await login(client)
    assert (await client.post("/auth/logout-all", headers=auth_headers(a))).status_code == 200
    for t in (a, b):
        assert (
            await client.post("/auth/refresh", json={"refresh_token": t["refresh_token"]})
        ).status_code == 401


async def test_protected_route_requires_token(client):
    assert (await client.get("/users/me")).status_code == 401
    assert (
        await client.get("/users/me", headers={"Authorization": "Bearer nope"})
    ).status_code == 401
