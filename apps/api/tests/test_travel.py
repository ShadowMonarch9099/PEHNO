"""Travel packing planner: destination context, capsule selection, gaps, endpoints."""
import shutil
import uuid
from datetime import date, timedelta

import pytest

from app.core.config import settings
from app.models.garment import ClassificationStatus, Garment
from app.services import outfit_engine as engine
from app.services import travel_planner as tp
from tests.conftest import auth_headers, login, upgrade
from tests.helpers import make_image, upload_files


@pytest.fixture(autouse=True)
def _clean():
    yield
    shutil.rmtree(settings.LOCAL_MEDIA_DIR, ignore_errors=True)


def g(t, f, c, occ=()):
    return Garment(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        image_key="x",
        garment_type=t,
        fabric_type=f,
        color_primary=c,
        occasion_tags=list(occ),
        season_tags=[],
        classification_status=ClassificationStatus.complete,
    )


WARDROBE = [
    g("kurta", "cotton", "white", ["casual", "office"]),
    g("kurta", "cotton", "blue", ["casual", "office"]),
    g("kurta", "linen", "cream", ["casual"]),
    g("kurti", "cotton", "pink", ["casual"]),
    g("palazzo", "cotton", "navy", ["casual", "office"]),
    g("palazzo", "cotton", "beige", ["casual"]),
    g("churidar", "cotton", "white", ["casual", "office"]),
    g("saree", "silk", "maroon", ["wedding_guest", "festival"]),
    g("lehenga", "silk", "red", ["wedding_guest"]),
    g("anarkali", "georgette", "green", ["wedding_guest", "night_out"]),
    g("dupatta", "georgette", "golden", ["wedding_guest", "festival", "casual"]),
    g("salwar_suit", "cotton", "yellow", ["casual", "office", "pooja"]),
]
USER = engine.UserContext()


def _slots(dest, start, days, activities):
    end = start + timedelta(days=days - 1)
    weather = {
        start + timedelta(days=i): tp.climate(dest, start + timedelta(days=i)) for i in range(days)
    }
    return tp.build_slots(start, end, activities, weather)


# ── destinations + climate ───────────────────────────────────────────────────


def test_destination_resolution_and_hill_offset():
    assert tp.resolve_destination("Udaipur").slug == "jaipur"  # alias
    assert tp.resolve_destination("goa").known and tp.resolve_destination("GOA").name == "Goa"
    unknown = tp.resolve_destination("Nashik")
    assert not unknown.known and unknown.region == "west" and unknown.name == "Nashik"
    city_only = tp.resolve_destination("Indore")  # in cities.json but no travel notes
    assert not city_only.known and city_only.region == "central" or city_only.region

    may = date(2026, 5, 10)
    plains = tp.climate(tp.resolve_destination("Delhi"), may)
    hills = tp.climate(tp.resolve_destination("Manali"), may)
    assert hills.temp_c == plains.temp_c - 14 and hills.city == "Manali"
    leh_jan = tp.climate(tp.resolve_destination("Leh"), date(2026, 1, 5))
    assert leh_jan.condition == "cold" and leh_jan.season == "winter"


def test_slots_split_days_and_event_evenings():
    dest = tp.resolve_destination("Jaipur")
    slots = _slots(
        dest, date(2026, 12, 10), 3, ["casual", "mehendi", "sangeet", "baraat", "reception"]
    )
    assert len(slots) == 3 + 4
    days = [s for s in slots if s.part == "day"]
    evenings = [s for s in slots if s.part == "evening"]
    assert [s.occasion for s in days] == ["casual"] * 3
    assert [s.occasion for s in evenings] == ["mehendi", "sangeet", "baraat", "reception"]
    assert [s.day for s in evenings] == [1, 2, 3, 1]  # wraps when events outnumber days
    # office offsite: day slots cycle the day-type activities
    slots = _slots(
        tp.resolve_destination("Bengaluru"), date(2026, 3, 2), 4, ["office", "casual", "night_out"]
    )
    assert [s.occasion for s in slots if s.part == "day"] == [
        "office",
        "casual",
        "office",
        "casual",
    ]


# ── planner ──────────────────────────────────────────────────────────────────


def test_capsule_covers_every_slot_and_reuses_items():
    dest = tp.resolve_destination("Goa")
    slots = _slots(dest, date(2026, 11, 20), 5, ["casual", "night_out"])
    res = tp.plan(WARDROBE, dest=dest, slots=slots, user=USER, max_items=8)
    assert not res.unfilled and len(res.looks) == 6
    assert len(res.packed_ids) <= 8
    packed = set(res.packed_ids)
    for lk in res.looks:
        assert set(lk.garment_ids) <= packed and lk.score >= engine.MIN_OPTION_SCORE
    # a capsule makes more looks than the days it dresses
    assert res.total_looks >= len(res.looks)
    # variety: consecutive days don't wear the identical set when alternatives exist
    sets = [frozenset(lk.garment_ids) for lk in res.looks if lk.slot.part == "day"]
    assert len(set(sets)) > 1
    assert not res.gaps


def test_wedding_trip_prioritises_event_evenings_and_reports_gaps():
    dest = tp.resolve_destination("Jaipur")
    slots = _slots(dest, date(2026, 12, 10), 3, ["casual", "mehendi", "sangeet", "reception"])
    # tiny wardrobe: two casual pieces + one saree → evenings can't all be distinct but must be dressed
    small = [WARDROBE[0], WARDROBE[4], WARDROBE[7]]
    res = tp.plan(small, dest=dest, slots=slots, user=USER, max_items=15)
    evening = [lk for lk in res.looks if lk.slot.part == "evening"]
    assert len(evening) == 3 and all(
        "saree" in [g.garment_type for g in small if str(g.id) in lk.garment_ids] for lk in evening
    )

    # nothing festive at all → the evening functions go unfilled (mehendi is a daytime,
    # cotton-friendly function so a kurta + palazzo still passes), one gap per occasion
    casual_only = [WARDROBE[0], WARDROBE[1], WARDROBE[4]]
    res = tp.plan(casual_only, dest=dest, slots=slots, user=USER, max_items=15)
    assert {s.occasion for s in res.unfilled} == {"sangeet", "reception"}
    assert len(res.gaps) == 2
    assert all(
        gp.new_outfits >= 1
        and gp.garment_type in {"saree", "lehenga", "anarkali", "indo_western", "dupatta"}
        for gp in res.gaps
    )
    assert "Jaipur" in res.gaps[0].rationale
    # destination palette steers the colour suggestion
    assert res.gaps[0].suggested_colors[0] in dest.palette + [
        "maroon",
        "red",
        "golden",
        "green",
        "pink",
        "navy",
        "purple",
    ]


def test_cold_destination_suggests_a_layer():
    dest = tp.resolve_destination("Manali")
    slots = _slots(dest, date(2026, 1, 10), 2, ["casual"])
    no_layers = [g for g in WARDROBE if g.garment_type != "dupatta"]
    res = tp.plan(no_layers, dest=dest, slots=slots, user=USER)
    assert any(gp.garment_type == "dupatta" and "cold" in gp.rationale for gp in res.gaps)
    # with a layer in the wardrobe the nudge disappears
    res = tp.plan(WARDROBE, dest=dest, slots=slots, user=USER)
    assert not any("cold" in gp.rationale for gp in res.gaps)


def test_item_budget_is_respected():
    dest = tp.resolve_destination("Delhi")
    slots = _slots(dest, date(2026, 10, 1), 10, ["casual", "office", "night_out", "festival"])
    res = tp.plan(WARDROBE, dest=dest, slots=slots, user=USER, max_items=6)
    assert len(res.packed_ids) <= 6 and len(res.looks) >= 8


# ── API ──────────────────────────────────────────────────────────────────────


async def _wardrobe(client, h, specs):
    for gtype, fabric, color, occ in specs:
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


async def test_packing_list_endpoint(client):
    h = auth_headers(await login(client))
    await client.put("/users/me", json={"city": "Pune"}, headers=h)
    start = date.today() + timedelta(days=10)
    body = {
        "destination": "Goa",
        "start_date": start.isoformat(),
        "end_date": (start + timedelta(days=2)).isoformat(),
        "activities": ["casual", "night_out"],
    }

    # Plus feature: locked, not hidden
    r = await client.post("/travel/packing-list", json=body, headers=h)
    assert r.status_code == 402 and r.json()["detail"]["feature"] == "travel_packing"
    await upgrade(client, h, "plus")

    # validation
    bad = {**body, "end_date": (start - timedelta(days=1)).isoformat()}
    assert (await client.post("/travel/packing-list", json=bad, headers=h)).status_code == 422
    bad = {**body, "activities": ["skydiving"]}
    assert (await client.post("/travel/packing-list", json=bad, headers=h)).status_code == 422
    bad = {**body, "end_date": (start + timedelta(days=30)).isoformat()}
    assert (await client.post("/travel/packing-list", json=bad, headers=h)).status_code == 422

    # empty wardrobe → plan with a hint, no items
    r = await client.post("/travel/packing-list", json=body, headers=h)
    assert r.status_code == 201, r.text
    p = r.json()
    assert p["items"] == [] and p["hint"] and p["days"] == 3 and p["destination"] == "Goa"
    assert p["vibe"] == "Beach easy" and len(p["tips"]) == 3 and len(p["weather"]) == 3
    assert p["weather"][0]["weather"]["city"] == "Goa" and p["weather_summary"]

    await _wardrobe(
        client,
        h,
        [
            ("kurta", "cotton", "white", ["casual"]),
            ("kurta", "linen", "cream", ["casual"]),
            ("palazzo", "cotton", "navy", ["casual"]),
            ("anarkali", "georgette", "green", ["night_out", "wedding_guest"]),
        ],
    )
    r = await client.post("/travel/packing-list", json=body, headers=h)
    assert r.status_code == 201, r.text
    p = r.json()
    assert p["item_count"] == 4 and p["look_count"] >= 3
    assert len(p["looks"]) == 4 and p["unfilled"] == [] and p["gaps"] == [] and p["hint"] is None
    evening = next(lk for lk in p["looks"] if lk["part"] == "evening")
    assert evening["occasion"] == "night_out" and evening["occasion_label"]
    item = p["items"][0]
    assert item["garment"]["image_url"] and item["wears"] >= 1 and item["days"]
    assert {i["garment"]["garment_type"] for i in p["items"]} == {"kurta", "palazzo", "anarkali"}

    # saved + listed + fetched + deleted
    plans = (await client.get("/travel/plans", headers=h)).json()
    assert len(plans) == 2 and plans[0]["destination"] == "Goa" and plans[0]["item_count"] in (0, 4)
    got = (await client.get(f"/travel/plans/{p['id']}", headers=h)).json()
    assert got["id"] == p["id"] and len(got["items"]) == 4
    other = auth_headers(await login(client, "9000000002"))
    assert (await client.get(f"/travel/plans/{p['id']}", headers=other)).status_code == 404
    assert (await client.delete(f"/travel/plans/{p['id']}", headers=h)).status_code == 200
    assert (await client.get(f"/travel/plans/{p['id']}", headers=h)).status_code == 404

    # unknown destination still plans (generic context); a tops-only wardrobe can't dress
    # a single day → every slot unfilled, and the gap is the bottom that unlocks looks
    await upgrade(client, other, "plus")
    await _wardrobe(client, other, [("kurta", "cotton", "white", ["casual"])])
    r = await client.post(
        "/travel/packing-list",
        json={**body, "destination": "Nashik", "activities": ["casual"]},
        headers=other,
    )
    assert r.status_code == 201
    p = r.json()
    assert p["destination"] == "Nashik" and "No local notes" in p["context"]
    assert len(p["unfilled"]) == 3 and p["items"] == []
    assert p["gaps"][0]["garment_type"] in ("palazzo", "churidar") and p["gaps"][0]["rank"] == 1
    assert p["gaps"][0]["typical_price_inr"] and "Nashik" in p["gaps"][0]["rationale"]

    dests = (await client.get("/travel/destinations", headers=h)).json()
    assert {"slug", "name", "vibe", "default_activities"} <= set(dests[0]) and len(dests) >= 15
