import shutil
import uuid

import pytest

from app.core.config import settings
from app.models.garment import ClassificationStatus, Garment
from app.services import scan_service as ss
from app.services.classifier import ClassificationResult
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


def fake_result(gtype, fabric, color, occasions):
    return ClassificationResult(
        garment_type=gtype,
        fabric_type=fabric,
        color_primary=color,
        color_accent=None,
        occasion_tags=occasions,
        season_tags=["all_season"],
        regional_style=None,
        care_profile={},
        confidence=0.9,
        backend="fake",
        candidates={},
    )


# ── pure ─────────────────────────────────────────────────────────────────────


def test_analyse_scores_a_bottom_against_tops():
    wardrobe = [g("kurta", "cotton", c, ["office", "casual"]) for c in ["white", "blue", "green"]]
    wardrobe.append(g("saree", "banarasi", "red", ["wedding_guest"]))
    item = ss._hypothetical(fake_result("palazzo", "cotton", "navy", ["office", "casual"]))
    compat, pairs, new = ss.analyse(item, wardrobe)
    assert {p.garment_type for p in pairs} == {"kurta"} and len(pairs) == 3
    assert new == 3 and compat >= 60


def test_analyse_with_nothing_to_pair():
    wardrobe = [g("saree", "banarasi", "red", ["wedding_guest"])]
    item = ss._hypothetical(fake_result("palazzo", "cotton", "navy", ["office"]))
    compat, pairs, new = ss.analyse(item, wardrobe)
    assert (compat, pairs, new) == (0, [], 0)
    assert ss._verdict(compat, new, None) == "skip"


def test_duplicate_detection():
    wardrobe = [g("kurta", "cotton", "navy", ["office"]), g("kurta", "linen", "white", ["office"])]
    exact = ss._hypothetical(fake_result("kurta", "cotton", "navy", ["office"]))
    dup, reason = ss.find_duplicate(exact, wardrobe)
    assert dup is wardrobe[0] and "near-identical" in reason
    similar = ss._hypothetical(fake_result("kurta", "rayon", "navy", ["office"]))
    dup, reason = ss.find_duplicate(similar, wardrobe)
    assert dup is wardrobe[0] and "very similar" in reason
    assert ss.find_duplicate(
        ss._hypothetical(fake_result("kurta", "cotton", "red", [])), wardrobe
    ) == (None, None)
    assert ss._verdict(90, 10, wardrobe[0]) == "skip"


def test_weather_note_and_verdicts():
    assert "ideal" in ss._weather_note("cotton", "summer", "Pune")
    assert "struggles" in ss._weather_note("velvet", "summer", "Pune")
    assert ss._weather_note("unobtainium", "summer", "Pune") == ""
    assert ss._verdict(70, 4, None) == "buy" and ss._verdict(40, 1, None) == "maybe"


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


async def test_scan_is_pro_gated(client):
    h = auth_headers(await login(client))
    files = [("file", ("scan.jpg", make_image(size=(32, 32)), "image/jpeg"))]
    assert (await client.post("/commerce/scan", files=files, headers=h)).status_code == 402
    await upgrade(client, h, "plus")
    r = await client.post("/commerce/scan", files=files, headers=h)
    assert r.status_code == 402 and r.json()["detail"]["required_tier"] == "pro"


async def test_scan_end_to_end(client, monkeypatch):
    h = auth_headers(await login(client))
    await upgrade(client, h, "pro")
    for c in ["white", "blue"]:
        await _add(client, h, "kurta", "cotton", c, ["office", "casual"])
    await _add(client, h, "palazzo", "cotton", "navy", ["office"])

    monkeypatch.setattr(
        ss,
        "classify_image",
        lambda data, style=None: fake_result("churidar", "cotton", "black", ["office", "casual"]),
    )
    files = [("file", ("scan.jpg", make_image(size=(32, 32)), "image/jpeg"))]
    r = await client.post("/commerce/scan", files=files, headers=h)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["garment_type"] == "churidar" and d["wardrobe_size"] == 3
    assert {p["garment_type"] for p in d["pairs_with"]} == {"kurta"} and d["new_outfits"] == 2
    assert d["compatibility"] >= 60 and d["duplicate"] is None
    assert d["verdict"] in ("buy", "maybe") and d["rationale"][0].startswith(
        "Works with 2 of your items"
    )
    assert d["weather_note"]

    # duplicate → skip
    monkeypatch.setattr(
        ss,
        "classify_image",
        lambda data, style=None: fake_result("palazzo", "cotton", "navy", ["office"]),
    )
    d = (await client.post("/commerce/scan", files=files, headers=h)).json()
    assert d["duplicate"]["garment_type"] == "palazzo" and d["verdict"] == "skip"
    assert any("near-identical" in r for r in d["rationale"])

    # unknown → gentle retry advice, never a crash
    monkeypatch.setattr(
        ss, "classify_image", lambda data, style=None: fake_result("unknown", "unknown", "grey", [])
    )
    d = (await client.post("/commerce/scan", files=files, headers=h)).json()
    assert (
        d["garment_type"] == "unknown"
        and d["compatibility"] == 0
        and "clearer" in d["rationale"][0]
    )


async def test_scan_rejects_non_images(client):
    h = auth_headers(await login(client))
    await upgrade(client, h, "pro")
    r = await client.post(
        "/commerce/scan", files=[("file", ("x.jpg", b"not an image", "image/jpeg"))], headers=h
    )
    assert r.status_code == 422
