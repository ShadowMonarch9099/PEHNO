import shutil
import uuid

import pytest

from app.core.config import settings
from app.models.garment import ClassificationStatus, Garment
from app.services import gap_analyzer as ga
from app.services import gap_service
from tests.conftest import auth_headers, login, upgrade
from tests.helpers import make_image, upload_files


@pytest.fixture(autouse=True)
def _clean():
    gap_service._local_cache.clear()
    yield
    gap_service._local_cache.clear()
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


KURTAS = [
    g("kurta", "cotton", c, ["office", "casual"])
    for c in ["white", "blue", "green", "pink", "cream", "yellow"]
]
PLAN_EXAMPLE = KURTAS + [
    g("dupatta", "georgette", "golden", ["festival", "wedding_guest"]),
    g("palazzo", "cotton", "navy", ["office", "casual"]),
]


# ── pure analyzer ────────────────────────────────────────────────────────────


def test_outfit_sets_follow_composition_rules():
    w = [
        g("kurta", "cotton", "white", ["casual"]),
        g("palazzo", "cotton", "navy", ["casual"]),
        g("dupatta", "net", "golden", ["casual"]),
    ]
    sets = ga.outfit_sets(w, "casual")
    assert len(sets) == 2  # kurta+palazzo, kurta+palazzo+dupatta
    assert ga.count_outfits(w, "wedding_guest") == 0  # nothing tagged/suitable
    # clashing colours don't pair
    clash = [g("kurta", "cotton", "red", ["casual"]), g("palazzo", "cotton", "orange", ["casual"])]
    assert ga.count_outfits(clash, "casual") == 0


def test_plan_example_recommends_a_bottom_first():
    gaps = ga.analyze(PLAN_EXAMPLE, occasion_weights={"office": 2.5, "casual": 1.5})
    assert gaps and gaps[0].garment_type in ("churidar", "palazzo")
    top = gaps[0]
    assert top.new_outfits >= 6  # one bottom × six kurtas
    assert "6 tops" in top.rationale and "only 1 bottom" in top.rationale
    assert top.suggested_colors[0] in ("black", "white", "navy", "cream")
    assert top.typical_price_inr[0] > 0
    # distinct outfits, not per-occasion sums
    assert top.new_outfits <= 12


def test_new_outfit_counts_are_distinct():
    gaps = {x.garment_type: x for x in ga.analyze(PLAN_EXAMPLE)}
    churidar = gaps["churidar"]
    # 6 kurtas × 1 new churidar = 6 pairs (+6 with the dupatta where colours allow) — never 36
    assert 6 <= churidar.new_outfits <= 12


def test_festive_palette_for_full_garments():
    gaps = {x.garment_type: x for x in ga.analyze(PLAN_EXAMPLE)}
    assert gaps["saree"].suggested_colors[0] in ("maroon", "red", "golden", "green", "pink")
    assert "Wedding Guest" in gaps["saree"].rationale or "Festival" in gaps["saree"].rationale


def test_budget_demotes_expensive_types():
    without = [x.garment_type for x in ga.analyze(PLAN_EXAMPLE, limit=10)]
    with_budget = [x.garment_type for x in ga.analyze(PLAN_EXAMPLE, budget_inr=800, limit=10)]
    assert without.index("saree") < with_budget.index("saree")
    # everything affordable outranks everything over budget
    tax = {g["slug"]: g for g in ga.knowledge.garment_types()}
    affordable = [t for t in with_budget if tax[t]["typical_price_inr"][0] <= 800]
    assert with_budget[: len(affordable)] == affordable


def test_history_weights_change_ranking():
    # Two competing gaps: daily wear lacks a bottom; festive wear lacks a dupatta.
    w = [g("kurta", "cotton", c, ["office", "casual"]) for c in ["white", "blue"]]
    w += [
        g("saree", "kanjeevaram", c, ["wedding_guest", "festival"])
        for c in ["red", "green", "maroon"]
    ]
    festive = ga.analyze(w, occasion_weights={"wedding_guest": 4.0, "festival": 4.0})
    daily = ga.analyze(w, occasion_weights={"casual": 4.0, "office": 4.0})
    assert festive[0].garment_type == "dupatta"
    assert daily[0].garment_type in ("palazzo", "churidar")


def test_empty_and_unknown_wardrobes():
    assert ga.analyze([]) and all(x.new_outfits >= 1 for x in ga.analyze([]))
    assert ga.analyze([g("unknown", "unknown", "unknown")]) == ga.analyze([])


def test_combos_per_garment_counts_participation():
    w = [
        g("kurta", "cotton", "white", ["casual"]),
        g("kurta", "cotton", "blue", ["casual"]),
        g("palazzo", "cotton", "navy", ["casual"]),
    ]
    combos = ga.combos_per_garment(w)
    palazzo = str(w[2].id)
    assert combos[palazzo] == 2 and combos[str(w[0].id)] == 1  # distinct outfits, not per-occasion


def test_occasion_weights_smoothing():
    assert ga.occasion_weights_from_history({}) == {}
    w = ga.occasion_weights_from_history({"office": 3, "casual": 1})
    assert w["office"] > w["casual"] > 1.0


# ── API ──────────────────────────────────────────────────────────────────────


async def _add(client, h, gtype, fabric, color, occasions):
    r = await client.post(
        "/wardrobe/upload", files=upload_files(make_image(size=(32, 32))), headers=h
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


async def test_gap_report_is_plus_gated(client):
    h = auth_headers(await login(client))
    r = await client.get("/commerce/gap-report", headers=h)
    assert r.status_code == 402
    assert (
        r.json()["detail"]["feature"] == "gap_report"
        and r.json()["detail"]["required_tier"] == "plus"
    )


async def test_gap_report_end_to_end_with_cache_and_invalidation(client):
    h = auth_headers(await login(client))
    await upgrade(client, h)
    for c in ["white", "blue", "green"]:
        await _add(client, h, "kurta", "cotton", c, ["office", "casual"])
    await _add(client, h, "palazzo", "cotton", "navy", ["office", "casual"])

    r = await client.get("/commerce/gap-report", headers=h)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["cached"] is False and d["wardrobe_size"] == 4 and d["current_outfits"] >= 3
    assert (
        d["gaps"][0]["rank"] == 1 and d["gaps"][0]["rationale"] and d["hint"]
    )  # small wardrobe hint
    assert len(d["most_versatile"]) == 3 and d["most_versatile"][0][1] >= 1

    # second read is served from cache
    assert (await client.get("/commerce/gap-report", headers=h)).json()["cached"] is True

    # +2 garments → still cached; +3 → recomputed
    await _add(client, h, "kurti", "rayon", "pink", ["casual"])
    await _add(client, h, "kurti", "rayon", "teal", ["casual"])
    assert (await client.get("/commerce/gap-report", headers=h)).json()["cached"] is True
    await _add(client, h, "churidar", "cotton", "black", ["office", "casual"])
    d = (await client.get("/commerce/gap-report", headers=h)).json()
    assert d["cached"] is False and d["wardrobe_size"] == 7

    # a budget bypasses the cache and is echoed back
    d = (await client.get("/commerce/gap-report", params={"budget": 1000}, headers=h)).json()
    assert d["cached"] is False and d["budget_inr"] == 1000
    assert (
        await client.get("/commerce/gap-report", params={"budget": 5}, headers=h)
    ).status_code == 422

    # deleting a garment invalidates
    gid = (await client.get("/wardrobe", headers=h)).json()["items"][0]["id"]
    await client.delete(f"/wardrobe/{gid}", headers=h)
    assert (await client.get("/commerce/gap-report", headers=h)).json()["cached"] is False


async def test_weekly_gap_report_job(client, caplog):
    from app.tasks.weekly_gap_report import send_weekly_gap_reports

    h = auth_headers(await login(client))
    await upgrade(client, h)
    await client.put("/users/me", json={"fcm_token": "tok-weekly-123"}, headers=h)
    for c in ["white", "blue"]:
        await _add(client, h, "kurta", "cotton", c, ["office", "casual"])
    free = auth_headers(await login(client, "9123456789"))  # free users are skipped entirely
    await client.put("/users/me", json={"fcm_token": "tok-free"}, headers=free)

    with caplog.at_level("INFO"):
        first = await send_weekly_gap_reports()
        second = await send_weekly_gap_reports()
    assert first == {"sent": 1, "skipped": 0, "failed": 0}
    assert second["sent"] == 0 and second["skipped"] == 1  # once per week per user
    assert any("weekly wardrobe report" in m for m in caplog.messages)
