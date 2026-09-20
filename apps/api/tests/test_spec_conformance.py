"""
Items the build-plan prompts specify explicitly that later blocks had skipped or only
approximated: outfit rating, notification prefs, festival date overrides, social feed
quality gate + card-on-save, affiliate auto-add, stylist payouts, brand fields,
Phase-3 analytics, scan base64, knowledge additions.
"""
import base64
import shutil
from datetime import date, timedelta

import pytest
from sqlalchemy import select

from app import knowledge
from app.core.config import settings
from app.models.commerce import AffiliateClick
from app.models.garment import ClassificationStatus, Garment
from app.services import festival_service as fs
from app.services import social_service
from tests.conftest import auth_headers, login, upgrade
from tests.helpers import make_image, upload_files

A = {"X-Admin-Key": "adm-key"}


@pytest.fixture(autouse=True)
def _env(monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_API_KEY", "adm-key")
    fs.set_overrides({})
    yield
    fs.set_overrides({})
    shutil.rmtree(settings.LOCAL_MEDIA_DIR, ignore_errors=True)


async def _garment(client, h, gtype, fabric, color, occ, confirm=False):
    r = await client.post(
        "/wardrobe/upload", files=upload_files(make_image(size=(120, 160))), headers=h
    )
    gid = r.json()["created"][0]["id"]
    await client.put(
        f"/wardrobe/{gid}",
        json={
            "garment_type": gtype,
            "fabric_type": fabric,
            "color_primary": color,
            "occasion_tags": occ,
        },
        headers=h,
    )
    return gid


# ── knowledge additions ──────────────────────────────────────────────────────


def test_knowledge_covers_the_spec_lists():
    types = knowledge.garment_type_slugs()
    # master prompt list + Phase-3 male list + western basics the blueprint mentions
    assert {
        "saree", "salwar_suit", "kurta", "dupatta", "lehenga", "sherwani", "palazzo", "anarkali",
        "indo_western", "kurti", "dhoti", "bandhgala", "nehru_jacket", "churidar", "sharara",
        "gharara", "kurta_pyjama", "pathani_suit", "formal_shirt", "trousers", "tshirt", "jeans",
    } <= types  # fmt: skip
    occ = knowledge.occasion_slugs()
    assert {
        "beach",
        "hill_station",
        "temple",
        "mehendi",
        "sangeet",
        "haldi",
        "baraat",
        "reception",
    } <= occ
    assert knowledge.occasion("beach")["label_hi"] and knowledge.occasion("office")["men_notes"]
    fest = {f["slug"] for f in knowledge.festivals()}
    assert {"teej", "puthandu", "vishu"} <= fest  # Tier-2 regional festivals
    assert fs.is_relevant(fs.by_slug("teej"), "Jaipur") and not fs.is_relevant(
        fs.by_slug("vishu"), "Delhi"
    )
    assert fs.is_relevant(fs.by_slug("vishu"), "Kochi") and fs.is_relevant(
        fs.by_slug("puthandu"), "Chennai"
    )
    # men's picks on the core occasions
    assert "sherwani" in knowledge.occasion("wedding_guest")["garment_preference"]
    assert "formal_shirt" in knowledge.occasion("office")["garment_preference"]


# ── outfit rating ────────────────────────────────────────────────────────────


async def test_rate_outfit_one_to_five(client):
    h = auth_headers(await login(client))
    await _garment(client, h, "kurta", "cotton", "white", ["casual", "office"])
    await _garment(client, h, "palazzo", "cotton", "navy", ["casual", "office"])
    oid = (await client.post("/outfits/generate", json={"occasion": "office"}, headers=h)).json()[
        "options"
    ][0]["id"]
    assert (
        await client.post(f"/outfits/{oid}/rate", json={"rating": 6}, headers=h)
    ).status_code == 422
    r = await client.post(f"/outfits/{oid}/rate", json={"rating": 5}, headers=h)
    assert r.status_code == 200 and r.json()["rating"] == 5
    hist = (await client.get("/outfits/history", headers=h)).json()["items"]
    assert hist[0]["rating"] == 5
    other = auth_headers(await login(client, "9000000002"))
    assert (
        await client.post(f"/outfits/{oid}/rate", json={"rating": 1}, headers=other)
    ).status_code == 404


# ── notification preferences ─────────────────────────────────────────────────


async def test_notification_prefs_default_on_and_partial_update(client):
    h = auth_headers(await login(client))
    me = (await client.get("/users/me", headers=h)).json()
    assert me["notification_prefs"] == {
        "daily_outfit": True,
        "festival_alerts": True,
        "care_reminders": True,
        "gap_reports": True,
    }
    r = await client.put(
        "/users/me", json={"notification_prefs": {"festival_alerts": False}}, headers=h
    )
    assert r.status_code == 200
    p = r.json()["notification_prefs"]
    assert p["festival_alerts"] is False and p["daily_outfit"] is True
    r = await client.put(
        "/users/me", json={"notification_prefs": {"daily_outfit": False}}, headers=h
    )
    p = r.json()["notification_prefs"]
    assert p["festival_alerts"] is False and p["daily_outfit"] is False  # merged, not replaced

    from app.models.user import User

    u = User(notification_prefs={"gap_reports": False})
    assert u.wants("daily_outfit") and not u.wants("gap_reports")


# ── festival date overrides ──────────────────────────────────────────────────


async def test_admin_festival_date_override_changes_the_calendar(client):
    rows = (await client.get("/admin/festivals", headers=A)).json()
    diwali = next(r for r in rows if r["slug"] == "diwali")
    assert diwali["dates"]["2026"] and diwali["overrides"] == [] and diwali["lunar_calendar"]
    before = fs.next_occurrence("diwali", date(2026, 1, 1)).start

    r = await client.put(
        "/admin/festivals/diwali/dates",
        json={"year": 2026, "start_date": "2026-11-09", "note": "panchang correction"},
        headers=A,
    )
    assert r.status_code == 200 and r.json()["end_date"] == "2026-11-09"  # 1-day in the JSON
    occ = fs.next_occurrence("diwali", date(2026, 1, 1))
    assert occ.start == date(2026, 11, 9) and occ.start != before
    assert (await client.get("/admin/festivals", headers=A)).json()
    rows = (await client.get("/admin/festivals", headers=A)).json()
    assert next(r for r in rows if r["slug"] == "diwali")["overrides"][0]["year"] == 2026
    # bad input + unknown slug
    assert (
        await client.put(
            "/admin/festivals/diwali/dates",
            json={"year": 2026, "start_date": "2026-11-09", "end_date": "2026-11-01"},
            headers=A,
        )
    ).status_code == 422
    assert (
        await client.put(
            "/admin/festivals/nope/dates",
            json={"year": 2026, "start_date": "2026-01-01"},
            headers=A,
        )
    ).status_code == 404
    # clearing restores the JSON date
    assert (await client.delete("/admin/festivals/diwali/dates/2026", headers=A)).status_code == 200
    assert fs.next_occurrence("diwali", date(2026, 1, 1)).start == before


# ── social: quality gate + card on save ──────────────────────────────────────


async def test_feed_hides_low_confidence_looks_and_card_is_generated_on_save(client, monkeypatch):
    monkeypatch.setattr(settings, "SOCIAL_ENABLED", True)
    owner = auth_headers(await login(client, "9876543210"))
    await client.put("/users/me", json={"name": "Priya", "city": "Mumbai"}, headers=owner)
    g1 = await _garment(client, owner, "kurta", "cotton", "white", ["casual"])
    await _garment(client, owner, "palazzo", "cotton", "navy", ["casual"])
    oid = (
        await client.post("/outfits/generate", json={"occasion": "casual"}, headers=owner)
    ).json()["options"][0]["id"]
    await client.post(f"/social/share-card/{oid}", headers=owner)
    viewer = auth_headers(await login(client, "9123456789"))
    await client.put("/users/me", json={"city": "Mumbai"}, headers=viewer)
    # user-labelled garments are user_verified → passes the gate
    assert len((await client.get("/social/feed/city", headers=viewer)).json()) == 1

    # un-verify one piece with low confidence → the look drops out of the feed (still shareable)
    from app.core import database

    async with database.SessionLocal() as db:
        import uuid

        g = await db.get(Garment, uuid.UUID(g1))
        g.user_verified, g.ai_confidence = False, 0.4
        await db.commit()
    assert (await client.get("/social/feed/city", headers=viewer)).json() == []
    assert (await client.get(f"/outfits/{oid}", headers=owner)).json()["is_public"] is True

    assert social_service.feed_quality_ok([]) is False

    # card-on-save: opt in, save another look → card pre-rendered + push logged
    await client.put("/social/preferences", json={"enabled": True}, headers=owner)
    oid2 = (
        await client.post("/outfits/generate", json={"occasion": "casual"}, headers=owner)
    ).json()["options"][0]["id"]
    assert (await client.get(f"/outfits/{oid2}", headers=owner)).json()["card_url"] is None
    r = await client.post(f"/outfits/{oid2}/save", headers=owner)
    assert r.status_code == 200
    async with database.SessionLocal() as db:
        from app.models.outfit import Outfit

        row = await db.get(Outfit, uuid.UUID(oid2))
        assert row.share_card_key  # rendered in the background job (in-process in tests)
        assert row.is_public is False  # pre-rendered, not published


# ── affiliate purchase → wardrobe ────────────────────────────────────────────


async def test_conversion_auto_adds_garment_with_colour_and_unlock_count(
    client, monkeypatch, caplog
):
    monkeypatch.setattr(settings, "AFFILIATE_POSTBACK_SECRET", "pb")
    h = auth_headers(await login(client))
    await upgrade(client, h, "plus")
    await client.put("/users/me", json={"fcm_token": "tok-123"}, headers=h)
    await _garment(client, h, "kurta", "cotton", "white", ["casual", "office"])
    await _garment(client, h, "kurta", "cotton", "blue", ["casual", "office"])
    r = await client.post(
        "/commerce/affiliate-click",
        json={
            "platform": "myntra",
            "product_url": "https://www.myntra.com/palazzos/1",
            "gap_type": "palazzo",
            "color": "navy",
            "fabric": "cotton",
        },
        headers=h,
    )
    assert r.status_code in (200, 201), r.text
    subid = r.json()["click_id"]
    with caplog.at_level("INFO"):
        r = await client.post(
            "/commerce/affiliate-conversion",
            json={"subid": subid, "order_value_inr": 1499},
            headers={"X-Postback-Secret": "pb"},
        )
    assert r.status_code == 200
    items = (await client.get("/wardrobe", headers=h)).json()["items"]
    added = [g for g in items if g["garment_type"] == "palazzo"]
    assert len(added) == 1
    g = added[0]
    assert (
        g["color_primary"] == "navy"
        and g["fabric_type"] == "cotton"
        and g["purchase_price"] == 1499
    )
    assert g["classification_status"] == "complete" and g["user_verified"] is False
    assert "purchase" in g["notes"] and g["thumbnail_url"]
    # two kurtas × one palazzo = 2 unlocked looks, said in the push
    assert any("unlocks 2 new outfits" in m for m in caplog.messages)
    # replaying the postback doesn't add a second garment
    await client.post(
        "/commerce/affiliate-conversion", json={"subid": subid}, headers={"X-Postback-Secret": "pb"}
    )
    assert (
        len(
            [
                g
                for g in (await client.get("/wardrobe", headers=h)).json()["items"]
                if g["garment_type"] == "palazzo"
            ]
        )
        == 1
    )


# ── stylist payouts + earnings + email ───────────────────────────────────────


async def test_stylist_payout_ledger_and_verification_email(client, caplog):
    sh = auth_headers(await login(client, "9000000009"))
    me = (
        await client.put(
            "/users/me",
            json={"name": "Priya", "city": "Pune", "email": "priya@example.com"},
            headers=sh,
        )
    ).json()
    await client.post(
        "/stylists/apply",
        json={
            "bio": "Ten years styling brides and festive wardrobes across Pune and Mumbai, with a soft spot for handloom.",
            "specialties": ["bridal"],
            "price_per_session_inr": 1000,
        },
        headers=sh,
    )
    with caplog.at_level("INFO"):
        await client.post(f"/admin/stylists/{me['id']}/verify", json={"verified": True}, headers=A)
    assert any("live on PEHNO" in m and "priya@example.com" in m for m in caplog.messages)

    ch = auth_headers(await login(client, "9123456789"))
    slot = (date.today() + timedelta(days=3)).isoformat() + "T10:00:00+00:00"
    b = (
        await client.post(
            "/stylists/book",
            json={"stylist_id": me["id"], "session_type": "wardrobe_review", "scheduled_at": slot},
            headers=ch,
        )
    ).json()
    await client.post(f"/stylists/bookings/{b['id']}/dev/pay", headers=ch)
    assert (await client.get("/admin/stylists/payouts", headers=A)).json() == []  # nothing due yet
    await client.post(f"/stylists/bookings/{b['id']}/complete", headers=sh)

    due = (await client.get("/admin/stylists/payouts", headers=A)).json()
    assert len(due) == 1 and due[0]["payout_inr"] == 800 and due[0]["payout_status"] == "due"
    row = next(
        s for s in (await client.get("/admin/stylists", headers=A)).json() if s["id"] == me["id"]
    )
    assert row["total_earned_inr"] == 800 and row["platform_commission_inr"] == 200
    r = await client.post(
        f"/admin/stylists/bookings/{b['id']}/payout", json={"reference": "NEFT123"}, headers=A
    )
    assert r.status_code == 200 and r.json()["payout_status"] == "paid"
    assert (
        await client.post(f"/admin/stylists/bookings/{b['id']}/payout", json={}, headers=A)
    ).status_code == 409
    assert (await client.get("/admin/stylists/payouts", headers=A)).json() == []
    assert (
        await client.get("/admin/stylists/payouts", params={"status_filter": "all"}, headers=A)
    ).json()[0]["payout_ref"] == "NEFT123"


# ── brands + analytics ───────────────────────────────────────────────────────


async def test_brand_fields_clicks_and_phase3_analytics(client):
    r = await client.post(
        "/admin/brands",
        json={"name": "Biba", "affiliate_id": "biba-aff-1", "categories": ["kurtas", "festive"]},
        headers=A,
    )
    assert r.status_code == 201 and r.json()["affiliate_id"] == "biba-aff-1"
    lst = (await client.get("/admin/brands", headers=A)).json()
    assert lst[0]["categories"] == ["kurtas", "festive"] and lst[0]["total_affiliate_clicks"] == 0

    a = (await client.get("/admin/analytics", headers=A)).json()
    assert {
        "stylist_bookings_by_day",
        "commission_by_month",
        "shares_by_city",
        "users_by_city",
    } <= set(a)
    h = auth_headers(await login(client))
    await client.put("/users/me", json={"city": "Jaipur"}, headers=h)
    a = (await client.get("/admin/analytics", headers=A)).json()
    jaipur = next(c for c in a["users_by_city"] if c["city"] == "Jaipur")
    assert jaipur["tier"] == 2 and jaipur["users"] == 1


# ── scan: spec JSON shape ────────────────────────────────────────────────────


async def test_scan_accepts_image_base64(client):
    h = auth_headers(await login(client))
    await upgrade(client, h, "pro")
    img = make_image(size=(120, 160))
    r = await client.post(
        "/commerce/scan/base64", json={"image_base64": base64.b64encode(img).decode()}, headers=h
    )
    assert r.status_code == 200 and "compatibility" in r.json()
    assert (
        await client.post("/commerce/scan/base64", json={"image_base64": "x" * 80}, headers=h)
    ).status_code == 422


async def test_festivals_upcoming_is_cacheable(client):
    h = auth_headers(await login(client))
    r = await client.get("/festivals/upcoming", headers=h)
    assert r.status_code == 200 and r.headers["cache-control"] == "private, max-age=21600"


def test_image_defaults_follow_spec():
    assert settings.IMAGE_MAX_SIDE == 800 and settings.IMAGE_TARGET_BYTES == 200 * 1024
    assert settings.THUMBNAIL_SIDE == 200


async def _db_garments(user_id):
    from app.core import database

    async with database.SessionLocal() as db:
        return (await db.execute(select(Garment).where(Garment.user_id == user_id))).scalars().all()


async def test_click_row_stores_colour_and_fabric(client):
    h = auth_headers(await login(client))
    await upgrade(client, h, "plus")
    await client.post(
        "/commerce/affiliate-click",
        json={
            "platform": "ajio",
            "product_url": "https://www.ajio.com/x",
            "gap_type": "dupatta",
            "color": "golden",
        },
        headers=h,
    )
    from app.core import database

    async with database.SessionLocal() as db:
        row = (await db.execute(select(AffiliateClick))).scalar_one()
        assert row.color == "golden" and row.fabric is None and row.gap_type == "dupatta"
    assert ClassificationStatus.complete.value == "complete"


# ── engine layer 4: festival override on the daily look ──────────────────────


async def test_daily_look_is_biased_by_an_imminent_festival(client, monkeypatch):
    from app.services import outfit_service

    h = auth_headers(await login(client))
    await client.put("/users/me", json={"city": "Mumbai"}, headers=h)
    await _garment(client, h, "kurta", "cotton", "white", ["office", "casual"])
    await _garment(client, h, "palazzo", "cotton", "navy", ["office", "casual"])
    # pin "today" to two days before Diwali 2026 (2026-11-08) — pan-India, so Mumbai is relevant
    monkeypatch.setattr(outfit_service, "today_ist", lambda: date(2026, 11, 6))
    assert fs.imminent("Mumbai", date(2026, 11, 6)).festival["slug"] == "diwali"
    assert fs.imminent("Mumbai", date(2026, 6, 1)) is None
    r = await client.get("/outfits/daily", headers=h)
    assert r.status_code == 200, r.text
    look = r.json()["options"][0]
    assert look["festival"] == "diwali" and look["occasion"] in ("office", "casual")
