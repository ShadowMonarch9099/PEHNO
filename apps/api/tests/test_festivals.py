import shutil
from datetime import date

import pytest

from app.core.config import settings
from app.models.user import User
from app.services import festival_service as fs
from tests.conftest import auth_headers, login, upgrade
from tests.helpers import make_image, upload_files


@pytest.fixture(autouse=True)
def _clean_media():
    yield
    shutil.rmtree(settings.LOCAL_MEDIA_DIR, ignore_errors=True)


# ── calendar & relevance (pure) ───────────────────────────────────────────────


def test_next_occurrence_and_active_window():
    occ = fs.next_occurrence("ganesh-chaturthi", date(2026, 9, 19))
    assert occ.start == date(2026, 9, 14) and occ.end == date(2026, 9, 23)
    assert occ.is_active(date(2026, 9, 19)) and occ.days_until(date(2026, 9, 19)) == -5
    # after it ends, roll to next year
    assert fs.next_occurrence("ganesh-chaturthi", date(2026, 9, 24)).start == date(2027, 9, 4)
    assert fs.next_occurrence("nope") is None


def test_regional_relevance():
    durga = fs.by_slug("durga-puja")
    assert fs.is_relevant(durga, "Kolkata") and not fs.is_relevant(durga, "Mumbai")
    onam = fs.by_slug("onam")
    assert fs.is_relevant(onam, "Kochi") and fs.is_relevant(onam, "Thiruvananthapuram")
    assert fs.is_relevant(fs.by_slug("diwali"), "Anywhere")  # pan-india


def test_upcoming_puts_regional_first():
    slugs = [o.slug for o in fs.upcoming("Kolkata", today=date(2026, 9, 19))]
    assert "durga-puja" in slugs
    assert slugs.index("durga-puja") < slugs.index("diwali")
    mumbai = [o.slug for o in fs.upcoming("Mumbai", today=date(2026, 9, 19))]
    assert "durga-puja" not in mumbai[:4]


def test_navratri_sequence_follows_weekday_rule():
    names = [c["name"] for c in fs.navratri_sequence(date(2025, 9, 22))]  # Monday
    assert names == [
        "White",
        "Red",
        "Royal Blue",
        "Yellow",
        "Green",
        "Grey",
        "Orange",
        "Peacock Green",
        "Pink",
    ]
    names_2026 = [c["name"] for c in fs.navratri_sequence(date(2026, 10, 11))]  # Sunday
    assert names_2026[0] == "Orange" and len(set(names_2026)) == 9


def test_navratri_today_states():
    before = fs.navratri_today(date(2026, 9, 19))
    assert (
        before["is_active"] is False and before["days_until"] == 22 and len(before["sequence"]) == 9
    )
    during = fs.navratri_today(date(2026, 10, 13))
    assert during["is_active"] and during["day"] == 3 and during["today"]["name"] == "Red"
    assert during["today"]["date"] == "2026-10-13"


def test_alerts_due_at_14_7_1_days():
    user = User(phone="+919876543210", city="Mumbai")
    # Diwali 2026-11-08 → 14 days before is 2026-10-25
    due = fs.alerts_due(user, date(2026, 10, 25))
    assert ("diwali", 14) in [(o.slug, d) for o, d in due]
    assert fs.alerts_due(user, date(2026, 10, 26)) == [] or all(
        d in (14, 7, 1) for _, d in fs.alerts_due(user, date(2026, 10, 26))
    )
    assert ("diwali", 1) in [(o.slug, d) for o, d in fs.alerts_due(user, date(2026, 11, 7))]
    kolkata = User(phone="+919876543211", city="Kolkata")
    assert ("durga-puja", 7) in [(o.slug, d) for o, d in fs.alerts_due(kolkata, date(2026, 10, 10))]
    assert ("durga-puja", 7) not in [
        (o.slug, d) for o, d in fs.alerts_due(user, date(2026, 10, 10))
    ]


# ── API ──────────────────────────────────────────────────────────────────────


async def _add(client, h, gtype, fabric, color, occasions):
    r = await client.post(
        "/wardrobe/upload", files=upload_files(make_image(size=(64, 64))), headers=h
    )
    gid = r.json()["created"][0]["id"]
    await client.put(
        f"/wardrobe/{gid}",
        json={
            "garment_type": gtype,
            "fabric_type": fabric,
            "color_primary": color,
            "occasion_tags": occasions,
        },
        headers=h,
    )
    return gid


async def test_upcoming_endpoint(client):
    h = auth_headers(await login(client))
    await client.put("/users/me", json={"city": "Kolkata"}, headers=h)
    r = await client.get("/festivals/upcoming", headers=h)
    assert r.status_code == 200
    items = r.json()
    assert items and all(
        {"slug", "days_until", "is_relevant", "colors", "dress_code"} <= set(i) for i in items
    )
    assert any(i["slug"] == "durga-puja" and i["is_relevant"] for i in items)


async def test_detail_is_locked_for_free_tier(client):
    h = auth_headers(await login(client))
    await _add(client, h, "saree", "banarasi", "red", ["festival"])
    d = (await client.get("/festivals/diwali", headers=h)).json()
    assert d["name"] == "Diwali" and d["dress_code"]  # calendar + dress code stay visible
    assert d["looks"] == [] and d["locked"]["required_tier"] == "plus"
    assert d["locked"]["feature"] == "festival_looks"


async def test_detail_with_curated_looks(client):
    h = auth_headers(await login(client))
    await upgrade(client, h)
    await _add(client, h, "saree", "banarasi", "red", ["festival", "pooja", "wedding_guest"])
    await _add(client, h, "dupatta", "net", "golden", ["festival", "wedding_guest"])
    await _add(client, h, "anarkali", "georgette", "navy", ["festival", "night_out"])
    r = await client.get("/festivals/diwali", headers=h)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["name"] == "Diwali" and d["colors"] and d["lunar_calendar"] is True
    assert 1 <= len(d["looks"]) <= 5
    assert all(look["festival"] == "diwali" for look in d["looks"])
    # red banarasi saree is a Diwali colour → should lead
    assert d["looks"][0]["garments"][0]["color_primary"] in ("red", "navy")
    assert any("Diwali colour" in r for look in d["looks"] for r in look["rationale"])
    # looks are judged against Diwali-date weather (dry November), not today's monsoon
    assert not any("monsoon" in r for look in d["looks"] for r in look["rationale"])


async def test_detail_404(client):
    h = auth_headers(await login(client))
    assert (await client.get("/festivals/nope", headers=h)).status_code == 404


async def test_navratri_today_endpoint_matches_garments(client, monkeypatch):
    h = auth_headers(await login(client))
    await _add(client, h, "kurti", "cotton", "red", ["casual"])
    monkeypatch.setattr(fs, "today_ist", lambda: date(2026, 10, 13))
    free = (await client.get("/festivals/navratri/today", headers=h)).json()
    assert free["today"]["name"] == "Red" and free["matching_garments"] == []
    assert free["locked"]["required_tier"] == "plus"  # sequence visible, matches locked
    await upgrade(client, h)
    await _add(client, h, "kurti", "cotton", "green", ["casual"])
    monkeypatch.setattr(fs, "today_ist", lambda: date(2026, 10, 13))  # day 3 → Red
    r = await client.get("/festivals/navratri/today", headers=h)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["is_active"] and d["today"]["name"] == "Red" and d["day"] == 3
    assert [g["color_primary"] for g in d["matching_garments"]] == ["red"]

    monkeypatch.setattr(
        fs, "today_ist", lambda: date(2026, 9, 19)
    )  # before: shows day-1 colour (orange) matches
    d = (await client.get("/festivals/navratri/today", headers=h)).json()
    assert d["is_active"] is False and d["days_until"] == 22 and d["matching_garments"] == []


async def test_festival_alert_job_dedupes(client, monkeypatch, caplog):
    from app.tasks.festival_alert import send_festival_alerts

    h = auth_headers(await login(client))
    await client.put("/users/me", json={"city": "Mumbai", "fcm_token": "tok-123456789"}, headers=h)
    monkeypatch.setattr(fs, "today_ist", lambda: date(2026, 10, 25))  # 14 days before Diwali
    with caplog.at_level("INFO"):
        first = await send_festival_alerts()
        second = await send_festival_alerts()
    assert first["sent"] >= 1 and first["failed"] == 0
    assert second["sent"] == 0 and second["skipped"] == first["sent"]  # log prevents repeats
    assert any("Diwali in 14 days" in m for m in caplog.messages)


async def test_push_open_is_recorded_once(client, db):
    from sqlalchemy import select

    from app.models.notification import NotificationLog
    from app.tasks.daily_outfit_push import push_daily_outfits

    h = auth_headers(await login(client))
    await _add(client, h, "kurta", "cotton", "white", ["office", "casual"])
    await _add(client, h, "palazzo", "cotton", "navy", ["office", "casual"])
    await client.put(
        "/users/me", json={"onboarding_complete": True, "fcm_token": "tok-abcdef0123"}, headers=h
    )
    assert (await push_daily_outfits())["sent"] == 1
    assert (await push_daily_outfits())["skipped"] == 1  # one push per day per user

    entry = (await db.execute(select(NotificationLog))).scalar_one()
    assert entry.kind == "daily_outfit" and entry.opened_at is None
    r = await client.post(f"/notifications/{entry.id}/opened", headers=h)
    assert r.status_code == 200
    await db.refresh(entry)
    assert entry.opened_at is not None
    first_open = entry.opened_at
    await client.post(f"/notifications/{entry.id}/opened", headers=h)  # idempotent
    await db.refresh(entry)
    assert entry.opened_at == first_open

    other = auth_headers(await login(client, "9123456789"))
    assert (
        await client.post(f"/notifications/{entry.id}/opened", headers=other)
    ).status_code == 404


# ── weeks 25–28: expansion ───────────────────────────────────────────────────


def test_calendar_has_25_festivals_with_dates_and_colours():
    from app import knowledge

    fs_all = knowledge.festivals()
    assert len(fs_all) == 28  # 25 from the plan + Teej, Puthandu, Vishu (Tier-2 regional)
    for f in fs_all:
        assert set(f["dates"]) >= {"2025", "2026", "2027"}, f["slug"]
        assert f["colors"] and f["dress_code"] and f["regions"], f["slug"]
    slugs = {f["slug"] for f in fs_all}
    assert {
        "eid-ul-adha",
        "baisakhi",
        "karva-chauth",
        "ugadi",
        "bihu",
        "lohri",
        "guru-nanak-jayanti",
    } <= slugs


def test_regional_festivals_reach_new_cities():
    assert fs.is_relevant(fs.by_slug("baisakhi"), "Amritsar")  # Punjab was missing before
    assert fs.is_relevant(fs.by_slug("bihu"), "Guwahati")
    assert fs.is_relevant(fs.by_slug("ugadi"), "Visakhapatnam")
    assert not fs.is_relevant(fs.by_slug("bihu"), "Mumbai")
    assert "kasavu" in fs.by_slug("onam")["dress_code"].lower()


def test_wedding_sub_events_are_occasions_with_palettes():
    from app import knowledge

    for slug in ("mehendi", "sangeet", "haldi", "baraat", "reception"):
        o = knowledge.occasion(slug)
        assert (
            o and o["parent"] == "wedding_guest" and o["palette"] and o["garment_preference"]
        ), slug
    assert knowledge.occasion_parent("mehendi") == "wedding_guest"
    assert knowledge.occasion_parent("office") is None


def test_engine_dresses_for_a_wedding_sub_event():
    import uuid
    from datetime import UTC, datetime

    from app.models.garment import ClassificationStatus, Garment
    from app.services import outfit_engine as engine
    from app.services.weather.base import Weather

    def g(t, f, c):
        return Garment(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            image_key="x",
            garment_type=t,
            fabric_type=f,
            color_primary=c,
            occasion_tags=["wedding_guest"],
            season_tags=[],
            classification_status=ClassificationStatus.complete,
        )

    yellow = g("lehenga", "georgette", "yellow")
    black = g("lehenga", "georgette", "black")
    kw = dict(
        weather=Weather("Delhi", 28, 28, 50, "sunny", "transition", "test"),
        user=engine.UserContext(),
        festival=None,
        history=engine.History(),
        now=datetime.now(UTC),
    )
    y = engine.score_garment(yellow, occasion="mehendi", **kw)
    b = engine.score_garment(black, occasion="mehendi", **kw)
    assert y.score > b.score
    assert any("Mehendi colour" in r for r in y.reasons) and any(
        "best avoided" in r for r in b.reasons
    )
    assert any("Wedding-ready" in r for r in y.reasons)  # parent tag fallback


async def test_generate_accepts_sub_event_occasions(client):
    h = auth_headers(await login(client))
    await _add(client, h, "lehenga", "georgette", "yellow", ["wedding_guest"])
    r = await client.post("/outfits/generate", json={"occasion": "mehendi"}, headers=h)
    assert r.status_code == 201, r.text
    assert r.json()["options"] and r.json()["options"][0]["occasion"] == "mehendi"
    opts = (await client.get("/meta/wardrobe-options")).json()
    assert {"slug": "sangeet", "label": "Sangeet"} in opts["occasions"]
