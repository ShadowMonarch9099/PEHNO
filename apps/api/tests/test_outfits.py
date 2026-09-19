import shutil
import uuid
from datetime import UTC, datetime, timedelta

import pytest

from app.core.config import settings
from app.models.garment import ClassificationStatus, Garment
from app.services import outfit_engine as engine
from app.services.weather.base import Weather
from app.services.weather.climatology import climatology_weather
from tests.conftest import auth_headers, login
from tests.helpers import make_image, upload_files


@pytest.fixture(autouse=True)
def _clean_media():
    yield
    shutil.rmtree(settings.LOCAL_MEDIA_DIR, ignore_errors=True)


def garment(gtype, fabric, color, occasions=(), seasons=(), **kw) -> Garment:
    return Garment(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        image_key="x.jpg",
        garment_type=gtype,
        fabric_type=fabric,
        color_primary=color,
        occasion_tags=list(occasions),
        season_tags=list(seasons),
        classification_status=ClassificationStatus.complete,
        wear_count=kw.pop("wear_count", 0),
        last_worn_at=kw.pop("last_worn_at", None),
        user_verified=kw.pop("user_verified", False),
        regional_style=kw.pop("regional_style", None),
        **kw,
    )


SUMMER = Weather("Pune", 36, 38, 40, "sunny", "summer", "test")
WINTER = Weather("Delhi", 14, 12, 60, "cold", "winter", "test")
MONSOON = Weather("Mumbai", 29, 32, 88, "rain", "monsoon", "test")
USER = engine.UserContext(skin_tone="medium", regional_style="south_indian")


# ── weather ──────────────────────────────────────────────────────────────────


def test_climatology_seasons_by_region_and_month():
    from datetime import date

    assert climatology_weather("Mumbai", date(2026, 7, 10)).season == "monsoon"
    assert climatology_weather("Delhi", date(2026, 1, 10)).season == "winter"
    assert climatology_weather("Delhi", date(2026, 5, 10)).season == "summer"
    assert climatology_weather("Chennai", date(2026, 11, 10)).season == "monsoon"  # NE monsoon
    w = climatology_weather("Nowhere City", date(2026, 3, 1))
    assert w.source == "climatology" and w.city == "Nowhere City"  # unknown city → west default


# ── engine scoring ───────────────────────────────────────────────────────────


def test_weather_layer_prefers_cotton_in_summer_and_silk_in_winter():
    cotton = garment("kurti", "cotton", "white", ["office"])
    banarasi = garment("saree", "banarasi", "maroon", ["office"])
    kw = dict(
        occasion="office", user=USER, festival=None, history=engine.History(), now=datetime.now(UTC)
    )
    assert (
        engine.score_garment(cotton, weather=SUMMER, **kw).score
        > engine.score_garment(banarasi, weather=SUMMER, **kw).score
    )
    assert (
        engine.score_garment(banarasi, weather=WINTER, **kw).score
        > engine.score_garment(cotton, weather=WINTER, **kw).score
    )


def test_occasion_layer_and_fabric_preferences():
    kw = dict(
        weather=WINTER, user=USER, festival=None, history=engine.History(), now=datetime.now(UTC)
    )
    tagged = garment("saree", "kanjeevaram", "red", ["wedding_guest"])
    untagged_cotton = garment("kurti", "cotton", "red", ["casual"])
    a = engine.score_garment(tagged, occasion="wedding_guest", **kw)
    b = engine.score_garment(untagged_cotton, occasion="wedding_guest", **kw)
    assert a.score > b.score
    assert any("Tagged for Wedding Guest" in r for r in a.reasons)
    assert any("unusual" in r for r in b.reasons)  # cotton is on wedding_guest's avoid list


def test_personalisation_layer():
    now = datetime.now(UTC)
    kw = dict(occasion="casual", weather=SUMMER, user=USER, festival=None, now=now)
    fresh = garment("kurti", "cotton", "white", ["casual"])
    worn_yesterday = garment(
        "kurti", "cotton", "white", ["casual"], wear_count=3, last_worn_at=now - timedelta(days=1)
    )
    disliked = garment("kurti", "cotton", "white", ["casual"])
    h = engine.History(disliked_garment_ids={str(disliked.id)})
    s_fresh = engine.score_garment(fresh, history=h, **kw).score
    s_worn = engine.score_garment(worn_yesterday, history=h, **kw).score
    s_dis = engine.score_garment(disliked, history=h, **kw).score
    assert s_fresh > s_worn and s_fresh > s_dis
    styled = garment("saree", "cotton", "white", ["casual"], regional_style="south_indian")
    plain = garment("saree", "cotton", "white", ["casual"])
    assert (
        engine.score_garment(styled, history=h, **kw).score
        > engine.score_garment(plain, history=h, **kw).score
    )


def test_festival_layer_boosts_festival_colours():
    kw = dict(
        occasion="festival",
        weather=WINTER,
        user=USER,
        history=engine.History(),
        now=datetime.now(UTC),
    )
    diwali = engine.FestivalContext(
        "diwali", "Diwali", colors=["red", "golden"], occasion_tags=["festival"]
    )
    red = garment("saree", "banarasi", "red", ["festival"])
    grey = garment("saree", "banarasi", "grey", ["festival"])
    assert (
        engine.score_garment(red, festival=diwali, **kw).score
        > engine.score_garment(grey, festival=diwali, **kw).score
    )


# ── composition ──────────────────────────────────────────────────────────────


def test_compose_full_and_top_bottom_with_layer():
    wardrobe = [
        garment("saree", "kanjeevaram", "maroon", ["wedding_guest", "festival"]),
        garment("dupatta", "georgette", "golden", ["festival", "wedding_guest"]),
        garment("kurta", "cotton", "white", ["office", "casual"]),
        garment("palazzo", "cotton", "navy", ["office", "casual"]),
        garment("churidar", "cotton", "black", ["office"]),
    ]
    opts = engine.generate(wardrobe, occasion="office", weather=SUMMER, user=USER, limit=3)
    assert opts, "should produce options"
    top = opts[0]
    kinds = {g.garment_type for g in top.garments}
    assert "kurta" in kinds and (
        {"palazzo", "churidar"} & kinds
    )  # cotton top+bottom wins the summer office
    assert all(len(o.garments) >= 1 for o in opts)
    assert len({frozenset(o.garment_ids) for o in opts}) == len(opts)  # no duplicate combinations
    assert opts[0].score >= opts[1].score >= opts[-1].score

    wedding = engine.generate(
        wardrobe, occasion="wedding_guest", weather=WINTER, user=USER, limit=1
    )[0]
    assert [g.garment_type for g in wedding.garments] == ["saree", "dupatta"]
    assert any("complement" in r or "Tagged" in r for r in wedding.rationale)


def test_clearly_wrong_options_are_dropped():
    # A lone banarasi saree tagged for weddings is not an office suggestion in monsoon
    wardrobe = [garment("saree", "banarasi", "maroon", ["wedding_guest"])]
    assert engine.generate(wardrobe, occasion="office", weather=MONSOON, user=USER) == []


def test_compose_returns_nothing_for_unpairable_wardrobe():
    only_tops = [
        garment("kurti", "cotton", "white", ["casual"]),
        garment("kurta", "cotton", "blue", ["casual"]),
    ]
    assert engine.generate(only_tops, occasion="casual", weather=SUMMER, user=USER) == []


def test_colour_pair_scoring():
    a, b = garment("kurta", "cotton", "pink"), garment("palazzo", "cotton", "green")
    assert engine.color_pair_score(a, b)[0] == engine.W_COLOR_MATCH
    # golden is treated as a neutral: always a mild positive
    assert (
        0
        < engine.color_pair_score(a, garment("dupatta", "net", "golden"))[0]
        < engine.W_COLOR_MATCH
    )
    c = garment("palazzo", "cotton", "green")
    assert engine.color_pair_score(garment("kurta", "cotton", "blue"), c)[0] == engine.W_COLOR_CLASH
    assert engine.color_pair_score(a, garment("palazzo", "cotton", "white"))[0] > 0


def test_daily_seed_is_stable_across_processes():
    from datetime import date

    uid = uuid.UUID("12345678-1234-5678-1234-567812345678")
    assert engine.daily_seed(uid, date(2026, 9, 19)) == engine.daily_seed(uid, date(2026, 9, 19))
    assert engine.daily_seed(uid, date(2026, 9, 19)) != engine.daily_seed(uid, date(2026, 9, 20))


# ── API ──────────────────────────────────────────────────────────────────────


async def _seed_wardrobe(client, h, items):
    ids = []
    for gtype, fabric, color, occasions in items:
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
        ids.append(gid)
    return ids


WARDROBE = [
    ("kurta", "cotton", "white", ["office", "casual"]),
    ("palazzo", "cotton", "navy", ["office", "casual"]),
    ("saree", "kanjeevaram", "maroon", ["wedding_guest", "festival", "pooja"]),
    ("dupatta", "georgette", "golden", ["festival", "wedding_guest"]),
]


async def test_generate_for_occasion(client):
    h = auth_headers(await login(client))
    await _seed_wardrobe(client, h, WARDROBE)
    r = await client.post("/outfits/generate", json={"occasion": "wedding_guest"}, headers=h)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["weather"]["source"] == "climatology" and body["weather"]["fabric_tip"]
    assert body["hint"] is None
    assert body["options"], body
    best = body["options"][0]
    assert [g["garment_type"] for g in best["garments"]][0] == "saree"
    assert (
        best["occasion"] == "wedding_guest"
        and best["rationale"]
        and best["batch_id"] == body["batch_id"]
    )


async def test_generate_validates_occasion_and_festival(client):
    h = auth_headers(await login(client))
    assert (
        await client.post("/outfits/generate", json={"occasion": "prom"}, headers=h)
    ).status_code == 422
    assert (
        await client.post(
            "/outfits/generate", json={"occasion": "festival", "festival": "nope"}, headers=h
        )
    ).status_code == 404


async def test_generate_with_festival_context(client):
    h = auth_headers(await login(client))
    await _seed_wardrobe(client, h, WARDROBE)
    r = await client.post(
        "/outfits/generate", json={"occasion": "festival", "festival": "diwali"}, headers=h
    )
    assert r.status_code == 201
    assert r.json()["options"][0]["festival"] == "diwali"


async def test_unsuitable_wardrobe_gives_occasion_hint(client):
    h = auth_headers(await login(client))
    await _seed_wardrobe(client, h, [("saree", "banarasi", "maroon", ["wedding_guest"])])
    r = await client.post("/outfits/generate", json={"occasion": "campus"}, headers=h)
    assert r.status_code == 201
    assert r.json()["options"] == [] and "campus" in r.json()["hint"]


async def test_empty_wardrobe_gives_hint_not_error(client):
    h = auth_headers(await login(client))
    r = await client.post("/outfits/generate", json={"occasion": "office"}, headers=h)
    assert r.status_code == 201
    assert r.json()["options"] == [] and "Add" in r.json()["hint"]


async def test_daily_is_stable_then_regenerates(client):
    h = auth_headers(await login(client))
    # two tops × two bottoms → several distinct casual/office combinations
    extra = [
        ("kurti", "rayon", "pink", ["office", "casual"]),
        ("churidar", "cotton", "black", ["office", "casual"]),
    ]
    await _seed_wardrobe(client, h, WARDROBE + extra)
    a = (await client.get("/outfits/daily", headers=h)).json()
    b = (await client.get("/outfits/daily", headers=h)).json()
    assert a["options"][0]["id"] == b["options"][0]["id"]
    assert a["options"][0]["is_daily"] and a["options"][0]["for_date"]
    c = (await client.get("/outfits/daily", params={"regenerate": "true"}, headers=h)).json()
    assert c["options"][0]["id"] != a["options"][0]["id"]
    assert {g["id"] for g in c["options"][0]["garments"]} != {
        g["id"] for g in a["options"][0]["garments"]
    }
    # the new one is now "today's look"
    d = (await client.get("/outfits/daily", headers=h)).json()
    assert d["options"][0]["id"] == c["options"][0]["id"]


async def test_feedback_save_wear_and_history(client):
    h = auth_headers(await login(client))
    await _seed_wardrobe(client, h, WARDROBE)
    oid = (await client.post("/outfits/generate", json={"occasion": "office"}, headers=h)).json()[
        "options"
    ][0]["id"]

    assert (await client.get("/outfits/history", headers=h)).json()[
        "total"
    ] == 0  # unrated options aren't history

    r = await client.post(f"/outfits/{oid}/feedback", json={"value": -1}, headers=h)
    assert r.status_code == 200 and r.json()["feedback"] == -1
    assert (
        await client.post(f"/outfits/{oid}/feedback", json={"value": 2}, headers=h)
    ).status_code == 422

    assert (await client.post(f"/outfits/{oid}/save", headers=h)).json()["is_saved"] is True
    assert (await client.get("/outfits/saved", headers=h)).json()["total"] == 1
    assert (await client.delete(f"/outfits/{oid}/save", headers=h)).json()["is_saved"] is False

    r = await client.post(f"/outfits/{oid}/wear", headers=h)
    worn = r.json()
    assert worn["worn_at"] and all(g["wear_count"] == 1 for g in worn["garments"])
    assert (await client.post(f"/outfits/{oid}/wear", headers=h)).json()["garments"][0][
        "wear_count"
    ] == 1  # idempotent
    assert (await client.get("/outfits/history", headers=h)).json()["total"] == 1


async def test_outfits_are_private(client):
    h1 = auth_headers(await login(client, "9876543210"))
    h2 = auth_headers(await login(client, "9123456789"))
    await _seed_wardrobe(client, h1, WARDROBE)
    oid = (await client.post("/outfits/generate", json={"occasion": "office"}, headers=h1)).json()[
        "options"
    ][0]["id"]
    assert (await client.get(f"/outfits/{oid}", headers=h2)).status_code == 404
    assert (await client.post(f"/outfits/{oid}/wear", headers=h2)).status_code == 404


async def test_daily_push_job_uses_console_notifier(client, caplog):
    from app.tasks.daily_outfit_push import push_daily_outfits

    h = auth_headers(await login(client))
    await _seed_wardrobe(client, h, WARDROBE)
    await client.put(
        "/users/me", json={"onboarding_complete": True, "fcm_token": "fake-token-123456"}, headers=h
    )
    with caplog.at_level("INFO"):
        result = await push_daily_outfits()
    assert result == {"sent": 1, "skipped": 0, "failed": 0}
    assert any("[PUSH" in m and "Today's look" in m for m in caplog.messages)
