"""Stylist marketplace: apply → verify → book → pay → wardrobe access → complete → review."""
import hmac
import json
import shutil
from datetime import UTC, datetime, timedelta
from hashlib import sha256

import pytest

from app.core.config import settings
from tests.conftest import auth_headers, login, upgrade
from tests.helpers import make_image, upload_files

A = {"X-Admin-Key": "adm-key"}
APPLICATION = {
    "bio": "Ten years styling brides and festive wardrobes across Pune and Mumbai, with a soft spot for handloom.",
    "specialties": ["bridal", "festive"],
    "price_per_session_inr": 1500,
    "portfolio_urls": ["https://instagram.com/priya.styles"],
}


@pytest.fixture(autouse=True)
def _admin(monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_API_KEY", "adm-key")
    yield
    shutil.rmtree(settings.LOCAL_MEDIA_DIR, ignore_errors=True)


def _slot(hours: int = 48) -> str:
    return (datetime.now(UTC) + timedelta(hours=hours)).replace(microsecond=0).isoformat()


async def _stylist(client, phone="9000000009", name="Priya Sharma"):
    """Apply and get verified; returns (headers, stylist_id)."""
    h = auth_headers(await login(client, phone))
    me = (await client.put("/users/me", json={"name": name, "city": "Pune"}, headers=h)).json()
    r = await client.post("/stylists/apply", json=APPLICATION, headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["is_stylist"] and r.json()["verified"] is False
    r = await client.post(f"/admin/stylists/{me['id']}/verify", json={"verified": True}, headers=A)
    assert r.status_code == 200 and r.json()["verified"] is True
    return h, me["id"]


async def test_apply_verify_and_listing(client):
    h = auth_headers(await login(client, "9000000009"))
    await client.put("/users/me", json={"name": "Priya Sharma", "city": "Pune"}, headers=h)
    viewer = auth_headers(await login(client, "9123456789"))

    # validation: short bio / unknown specialty / too cheap
    bad = {**APPLICATION, "bio": "short"}
    assert (await client.post("/stylists/apply", json=bad, headers=h)).status_code == 422
    bad = {**APPLICATION, "specialties": ["astrology"]}
    assert (await client.post("/stylists/apply", json=bad, headers=h)).status_code == 422
    bad = {**APPLICATION, "price_per_session_inr": 50}
    assert (await client.post("/stylists/apply", json=bad, headers=h)).status_code == 422

    r = await client.post("/stylists/apply", json=APPLICATION, headers=h)
    assert r.status_code == 200 and r.json()["verified"] is False
    me = (await client.get("/stylists/me", headers=h)).json()
    assert me["is_stylist"] and me["price_per_session_inr"] == 1500 and me["applied_at"]

    # unverified → not listed, profile 404s
    assert (await client.get("/stylists", headers=viewer)).json() == []
    sid = (await client.get("/users/me", headers=h)).json()["id"]
    assert (await client.get(f"/stylists/{sid}", headers=viewer)).status_code == 404

    # admin sees the pending application
    pending = (await client.get("/admin/stylists", params={"pending": "true"}, headers=A)).json()
    assert len(pending) == 1 and pending[0]["id"] == sid and pending[0]["phone"] == "+919000000009"
    assert (await client.get("/admin/stylists", headers={"X-Admin-Key": "x"})).status_code == 404

    r = await client.post(f"/admin/stylists/{sid}/verify", json={"verified": True}, headers=A)
    assert r.status_code == 200
    listed = (await client.get("/stylists", headers=viewer)).json()
    assert len(listed) == 1
    s = listed[0]
    assert s["name"] == "Priya Sharma" and s["city"] == "Pune"
    assert "phone" not in s and s["specialties"] == ["bridal", "festive"]
    assert s["quote"] == {"amount_inr": 1500.0, "discount_inr": 0.0, "pro_discount_applied": False}
    assert {t["slug"] for t in s["session_types"]} == {
        "wardrobe_review",
        "occasion_curation",
        "trip_packing",
    }
    # filters
    assert (await client.get("/stylists", params={"city": "pune"}, headers=viewer)).json()
    assert (await client.get("/stylists", params={"city": "Delhi"}, headers=viewer)).json() == []
    assert (
        await client.get("/stylists", params={"specialty": "office"}, headers=viewer)
    ).json() == []
    assert (await client.get("/stylists/specialties")).json()[:2] == ["bridal", "festive"]

    # profile
    p = (await client.get(f"/stylists/{sid}", headers=viewer)).json()
    assert p["bio"].startswith("Ten years") and p["reviews"] == [] and p["rating"] is None

    # un-verify hides again
    await client.post(f"/admin/stylists/{sid}/verify", json={"verified": False}, headers=A)
    assert (await client.get("/stylists", headers=viewer)).json() == []


async def test_booking_lifecycle_with_wardrobe_access_and_review(client):
    sh, sid = await _stylist(client)
    ch = auth_headers(await login(client, "9123456789"))
    await client.put("/users/me", json={"name": "Anita Rao", "city": "Mumbai"}, headers=ch)
    # client wardrobe: one classified garment
    r = await client.post(
        "/wardrobe/upload", files=upload_files(make_image(size=(120, 160))), headers=ch
    )
    gid = r.json()["created"][0]["id"]
    await client.put(f"/wardrobe/{gid}", json={"garment_type": "saree"}, headers=ch)

    # guards: too soon, self-booking, unknown stylist
    body = {"stylist_id": sid, "session_type": "wardrobe_review", "scheduled_at": _slot(1)}
    assert (await client.post("/stylists/book", json=body, headers=ch)).status_code == 422
    body["scheduled_at"] = _slot(48)
    assert (await client.post("/stylists/book", json=body, headers=sh)).status_code == 422
    assert (
        await client.post(
            "/stylists/book",
            json={**body, "stylist_id": "00000000-0000-0000-0000-000000000000"},
            headers=ch,
        )
    ).status_code == 404

    r = await client.post("/stylists/book", json={**body, "notes": "Wedding in Dec"}, headers=ch)
    assert r.status_code == 201, r.text
    b = r.json()
    bid = b["id"]
    assert b["status"] == "pending" and b["amount_inr"] == 1500 and b["discount_inr"] == 0
    assert b["stylist_name"] == "Priya Sharma" and b["session_label"] == "Wardrobe review"
    assert "platform_commission_inr" in b and b["platform_commission_inr"] is None  # client view
    assert b["reviewed"] is False

    # slot clash for the same stylist (another client, overlapping hour)
    other = auth_headers(await login(client, "9000000002"))
    assert (
        await client.post("/stylists/book", json={**body, "scheduled_at": _slot(48)}, headers=other)
    ).status_code == 409

    # stylist sees it incoming with commission + payout; wardrobe locked until paid
    inc = (await client.get("/stylists/bookings/incoming", headers=sh)).json()
    assert len(inc) == 1 and inc[0]["id"] == bid
    assert inc[0]["platform_commission_inr"] == 300 and inc[0]["stylist_payout_inr"] == 1200
    assert inc[0]["client_first_name"] == "Anita" and inc[0]["payment_url"] is None
    assert (await client.get(f"/stylists/my-wardrobe-access/{bid}", headers=sh)).status_code == 403
    assert (await client.get("/stylists/bookings/incoming", headers=ch)).status_code == 403
    # a stranger can't see the booking at all
    assert (await client.get(f"/stylists/bookings/{bid}", headers=other)).status_code == 404
    # complete before payment → 409
    assert (await client.post(f"/stylists/bookings/{bid}/complete", headers=sh)).status_code == 409

    # pay (webhook via dev endpoint); idempotent
    r = await client.post(f"/stylists/bookings/{bid}/dev/pay", headers=ch)
    assert r.status_code == 200 and r.json()["status"] == "confirmed" and r.json()["paid_at"]
    assert (await client.post(f"/stylists/bookings/{bid}/dev/pay", headers=ch)).json()[
        "status"
    ] == "confirmed"

    # scoped wardrobe access: stylist only, first name + city + garments
    assert (await client.get(f"/stylists/my-wardrobe-access/{bid}", headers=ch)).status_code == 403
    w = (await client.get(f"/stylists/my-wardrobe-access/{bid}", headers=sh)).json()
    assert w["client_first_name"] == "Anita" and w["city"] == "Mumbai"
    assert w["notes"] == "Wedding in Dec" and len(w["garments"]) == 1
    assert "phone" not in w and w["garments"][0]["garment_type"] == "saree"

    # review before completion → 409; client can't complete
    assert (
        await client.post(f"/stylists/bookings/{bid}/review", json={"rating": 5}, headers=ch)
    ).status_code == 409
    assert (await client.post(f"/stylists/bookings/{bid}/complete", headers=ch)).status_code == 403

    r = await client.post(f"/stylists/bookings/{bid}/complete", headers=sh)
    assert r.status_code == 200 and r.json()["status"] == "completed"
    # wardrobe access closes with the session
    assert (await client.get(f"/stylists/my-wardrobe-access/{bid}", headers=sh)).status_code == 403

    # review: client only, once
    assert (
        await client.post(f"/stylists/bookings/{bid}/review", json={"rating": 5}, headers=sh)
    ).status_code == 403
    r = await client.post(
        f"/stylists/bookings/{bid}/review",
        json={"rating": 4, "comment": "Great eye for colour"},
        headers=ch,
    )
    assert r.status_code == 200 and r.json()["reviewer_first_name"] == "Anita"
    assert (
        await client.post(f"/stylists/bookings/{bid}/review", json={"rating": 5}, headers=ch)
    ).status_code == 409
    mine = (await client.get("/stylists/bookings/my", headers=ch)).json()
    assert mine[0]["reviewed"] is True and mine[0]["status"] == "completed"

    # rating shows on the profile + listing, sorted by rating
    p = (await client.get(f"/stylists/{sid}", headers=ch)).json()
    assert p["rating"] == 4.0 and p["review_count"] == 1 and p["sessions_completed"] == 1
    assert p["reviews"][0]["comment"] == "Great eye for colour"

    # cancelling a completed booking → 409
    assert (await client.post(f"/stylists/bookings/{bid}/cancel", headers=ch)).status_code == 409

    # admin marketplace numbers
    m = (await client.get("/admin/stylists/bookings", headers=A)).json()
    assert m["gmv_inr"] == 1500 and m["commission_inr"] == 300
    assert m["by_status"] == {"completed": 1}


async def test_pro_discount_and_cancel(client):
    _, sid = await _stylist(client)
    ch = auth_headers(await login(client, "9123456789"))
    await upgrade(client, ch, "pro")
    s = (await client.get(f"/stylists/{sid}", headers=ch)).json()
    assert s["quote"] == {"amount_inr": 1350.0, "discount_inr": 150.0, "pro_discount_applied": True}

    r = await client.post(
        "/stylists/book",
        json={"stylist_id": sid, "session_type": "trip_packing", "scheduled_at": _slot(72)},
        headers=ch,
    )
    assert r.status_code == 201
    b = r.json()
    assert b["amount_inr"] == 1350 and b["discount_inr"] == 150
    r = await client.post(f"/stylists/bookings/{b['id']}/cancel", headers=ch)
    assert r.status_code == 200 and r.json()["status"] == "cancelled" and r.json()["cancelled_at"]
    # paying a cancelled booking does nothing
    assert (await client.post(f"/stylists/bookings/{b['id']}/dev/pay", headers=ch)).json()[
        "status"
    ] == "cancelled"
    # slot is free again
    r = await client.post(
        "/stylists/book",
        json={"stylist_id": sid, "session_type": "trip_packing", "scheduled_at": _slot(72)},
        headers=ch,
    )
    assert r.status_code == 201


async def test_payment_webhook_confirms_booking(client):
    """The real path: provider posts a signed `paid` event with our reference_id."""
    _, sid = await _stylist(client)
    ch = auth_headers(await login(client, "9123456789"))
    b = (
        await client.post(
            "/stylists/book",
            json={"stylist_id": sid, "session_type": "occasion_curation", "scheduled_at": _slot()},
            headers=ch,
        )
    ).json()
    payload = {"id": "evt_paid_1", "event": "paid", "reference_id": b["id"], "amount_inr": 1500}
    body = json.dumps(payload).encode()
    sig = hmac.new(settings.JWT_SECRET.encode(), body, sha256).hexdigest()
    r = await client.post(
        "/billing/webhook/razorpay",
        content=body,
        headers={"X-Razorpay-Signature": sig, "Content-Type": "application/json"},
    )
    assert r.status_code == 200 and r.json()["message"] == "paid"
    assert (await client.get(f"/stylists/bookings/{b['id']}", headers=ch)).json()[
        "status"
    ] == "confirmed"
    # replay → duplicate; unknown reference → unknown_booking; garbage → ignored
    r = await client.post(
        "/billing/webhook/razorpay",
        content=body,
        headers={"X-Razorpay-Signature": sig, "Content-Type": "application/json"},
    )
    assert r.json()["message"] == "duplicate"
    for ref, expect in [
        ("00000000-0000-0000-0000-000000000000", "unknown_booking"),
        ("x", "ignored"),
    ]:
        body = json.dumps({"id": f"evt_{ref}", "event": "paid", "reference_id": ref}).encode()
        sig = hmac.new(settings.JWT_SECRET.encode(), body, sha256).hexdigest()
        r = await client.post(
            "/billing/webhook/razorpay",
            content=body,
            headers={"X-Razorpay-Signature": sig, "Content-Type": "application/json"},
        )
        assert r.json()["message"] == expect
