import hmac
import json
import shutil
from datetime import UTC, datetime, timedelta
from hashlib import sha256

import pytest
from sqlalchemy import select

from app.core.config import settings
from app.models.billing import BillingEvent, Subscription
from app.models.user import User
from app.services import billing_service
from tests.conftest import auth_headers, login, upgrade
from tests.helpers import make_image, upload_files


@pytest.fixture(autouse=True)
def _clean_media():
    yield
    shutil.rmtree(settings.LOCAL_MEDIA_DIR, ignore_errors=True)


def _sign(body: bytes) -> str:
    return hmac.new(settings.JWT_SECRET.encode(), body, sha256).hexdigest()


async def _upload_n(client, h, n):
    for _ in range(n):
        r = await client.post(
            "/wardrobe/upload", files=upload_files(make_image(size=(32, 32))), headers=h
        )
        assert r.status_code == 201, r.text


# ── plans & entitlements ─────────────────────────────────────────────────────


async def test_plans_are_public_and_priced_per_plan(client):
    r = await client.get("/billing/plans")
    assert r.status_code == 200
    plans = {p["tier"]: p for p in r.json()}
    assert (
        plans["free"]["price_inr_month"] == 0
        and plans["free"]["garment_limit"] == settings.FREE_GARMENT_LIMIT
    )
    assert plans["plus"]["price_inr_month"] == 199 and plans["plus"]["garment_limit"] is None
    assert plans["pro"]["price_inr_month"] == 399
    assert "Wardrobe gap analysis" in plans["plus"]["features"]
    assert (
        "Shopping scan mode" in plans["pro"]["features"]
        and "Shopping scan mode" not in plans["plus"]["features"]
    )


async def test_me_exposes_entitlements_and_nudge(client, monkeypatch):
    monkeypatch.setattr(settings, "NUDGE_AT_GARMENTS", 2)
    h = auth_headers(await login(client))
    me = (await client.get("/users/me", headers=h)).json()
    e = me["entitlements"]
    assert (
        e["tier"] == "free"
        and e["garment_limit"] == settings.FREE_GARMENT_LIMIT
        and e["nudge"] is None
    )
    assert e["features"]["festival_looks"] == {
        "label": "Festival looks curated from your wardrobe",
        "unlocked": False,
        "required_tier": "plus",
    }
    assert e["features"]["scan_mode"]["required_tier"] == "pro"

    await _upload_n(client, h, 2)
    e = (await client.get("/users/me", headers=h)).json()["entitlements"]
    assert e["garments_used"] == 2 and e["nudge"] == "plus_wardrobe_20"


async def test_free_garment_limit_returns_402_with_upgrade_info(client, monkeypatch):
    monkeypatch.setattr(settings, "FREE_GARMENT_LIMIT", 2)
    h = auth_headers(await login(client))
    await _upload_n(client, h, 2)
    r = await client.post(
        "/wardrobe/upload", files=upload_files(make_image(size=(32, 32))), headers=h
    )
    assert r.status_code == 402
    d = r.json()["detail"]
    assert (
        d["feature"] == "unlimited_wardrobe"
        and d["required_tier"] == "plus"
        and "Upgrade" in d["message"]
    )

    await upgrade(client, h)
    r = await client.post(
        "/wardrobe/upload", files=upload_files(make_image(size=(32, 32))), headers=h
    )
    assert r.status_code == 201  # unlimited now


# ── subscription lifecycle (mock provider) ───────────────────────────────────


async def test_subscribe_activate_cancel_flow(client, db):
    h = auth_headers(await login(client))
    r = await client.post("/billing/subscribe", json={"plan": "plus"}, headers=h)
    assert r.status_code == 201
    sub = r.json()
    assert sub["status"] == "created" and sub["plan"] == "plus" and sub["provider"] == "mock"
    assert (await client.get("/users/me", headers=h)).json()[
        "subscription_tier"
    ] == "free"  # not until activated

    r = await client.post("/billing/dev/activate", headers=h)
    assert r.status_code == 200 and r.json()["status"] == "active"
    me = (await client.get("/users/me", headers=h)).json()
    assert me["subscription_tier"] == "plus" and me["subscription_expires_at"]
    state = (await client.get("/billing/subscription", headers=h)).json()
    assert state["entitlements"]["tier"] == "plus" and state["subscription"]["current_period_end"]

    # same plan again → 409; upgrading to pro is allowed
    assert (
        await client.post("/billing/subscribe", json={"plan": "plus"}, headers=h)
    ).status_code == 409
    assert (
        await client.post("/billing/subscribe", json={"plan": "free"}, headers=h)
    ).status_code == 422

    r = await client.post("/billing/cancel", headers=h)
    assert (
        r.status_code == 200
        and r.json()["status"] == "cancelled"
        and r.json()["cancel_at_period_end"]
    )
    # access continues until period end
    assert (await client.get("/users/me", headers=h)).json()["subscription_tier"] == "plus"
    assert (await client.post("/billing/cancel", headers=h)).status_code == 404


async def test_webhook_requires_valid_signature_and_is_idempotent(client, db):
    h = auth_headers(await login(client))
    sub = (await client.post("/billing/subscribe", json={"plan": "pro"}, headers=h)).json()
    row = (await db.execute(select(Subscription))).scalar_one()
    end = (datetime.now(UTC) + timedelta(days=30)).isoformat()
    body = json.dumps(
        {
            "id": "evt_1",
            "event": "activated",
            "subscription_id": row.provider_subscription_id,
            "current_period_end": end,
        }
    ).encode()

    assert (await client.post("/billing/webhook/razorpay", content=body)).status_code == 400
    assert (
        await client.post(
            "/billing/webhook/razorpay", content=body, headers={"X-Razorpay-Signature": "bad"}
        )
    ).status_code == 400

    r = await client.post(
        "/billing/webhook/razorpay", content=body, headers={"X-Razorpay-Signature": _sign(body)}
    )
    assert r.status_code == 200 and r.json()["message"] == "activated"
    assert (await client.get("/users/me", headers=h)).json()["subscription_tier"] == "pro"

    r = await client.post(
        "/billing/webhook/razorpay", content=body, headers={"X-Razorpay-Signature": _sign(body)}
    )
    assert r.json()["message"] == "duplicate"
    assert len((await db.execute(select(BillingEvent))).scalars().all()) == 1
    assert sub["id"]  # subscription row exists

    # provider-side cancellation keeps the tier until reconcile
    body2 = json.dumps(
        {"id": "evt_2", "event": "cancelled", "subscription_id": row.provider_subscription_id}
    ).encode()
    r = await client.post(
        "/billing/webhook/razorpay", content=body2, headers={"X-Razorpay-Signature": _sign(body2)}
    )
    assert r.json()["message"] == "cancelled"
    assert (await client.get("/users/me", headers=h)).json()["subscription_tier"] == "pro"

    unknown = json.dumps(
        {"id": "evt_3", "event": "activated", "subscription_id": "sub_nope"}
    ).encode()
    r = await client.post(
        "/billing/webhook/razorpay",
        content=unknown,
        headers={"X-Razorpay-Signature": _sign(unknown)},
    )
    assert r.json()["message"] == "unknown_subscription"


async def test_reconcile_downgrades_lapsed_subscriptions(client, db):
    h = auth_headers(await login(client))
    await upgrade(client, h, "plus")
    sub = (await db.execute(select(Subscription))).scalar_one()
    user = (await db.execute(select(User))).scalar_one()

    # still inside the period → nothing happens
    assert await billing_service.reconcile_expired(db) == 0
    await db.commit()

    # cancelled and past period end → downgraded
    sub.status = "cancelled"
    sub.current_period_end = datetime.now(UTC) - timedelta(days=1)
    await db.commit()
    assert await billing_service.reconcile_expired(db) == 1
    await db.commit()
    await db.refresh(user)
    assert user.subscription_tier.value == "free" and user.subscription_expires_at is None
    me = (await client.get("/users/me", headers=h)).json()
    assert (
        me["subscription_tier"] == "free"
        and me["entitlements"]["features"]["festival_looks"]["unlocked"] is False
    )


async def test_active_subscription_gets_renewal_grace(client, db):
    h = auth_headers(await login(client))
    await upgrade(client, h, "plus")
    sub = (await db.execute(select(Subscription))).scalar_one()
    sub.current_period_end = datetime.now(UTC) - timedelta(days=1)  # renewal charge may be late
    await db.commit()
    assert await billing_service.reconcile_expired(db) == 0
    sub.current_period_end = datetime.now(UTC) - timedelta(days=4)  # beyond the 3-day grace
    await db.commit()
    assert await billing_service.reconcile_expired(db) == 1


async def test_dev_activate_hidden_outside_debug(client, monkeypatch):
    h = auth_headers(await login(client))
    await client.post("/billing/subscribe", json={"plan": "plus"}, headers=h)
    monkeypatch.setattr(settings, "DEBUG", False)
    assert (await client.post("/billing/dev/activate", headers=h)).status_code == 404


def test_razorpay_provider_parses_and_verifies(monkeypatch):
    from app.services.billing.razorpay import RazorpayProvider

    monkeypatch.setattr(settings, "RAZORPAY_KEY_ID", "rzp_test_x")
    monkeypatch.setattr(settings, "RAZORPAY_KEY_SECRET", "secret")
    monkeypatch.setattr(settings, "RAZORPAY_WEBHOOK_SECRET", "whsec")
    p = RazorpayProvider()
    payload = {
        "event": "subscription.charged",
        "created_at": 1790000000,
        "payload": {"subscription": {"entity": {"id": "sub_ABC", "current_end": 1792592000}}},
    }
    ev = p.parse_event(payload)
    assert ev.event_type == "charged" and ev.provider_subscription_id == "sub_ABC"
    assert ev.current_period_end == datetime.fromtimestamp(1792592000, tz=UTC)
    assert ev.event_id == "subscription.charged:sub_ABC:1790000000"

    body = json.dumps(payload).encode()
    good = hmac.new(b"whsec", body, sha256).hexdigest()
    assert p.verify_webhook(body, good) and not p.verify_webhook(body, "nope")
    assert not p.verify_webhook(body, None)
