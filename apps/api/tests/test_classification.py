import shutil

import pytest
from PIL import Image
from sqlalchemy import select

from app.core.config import settings
from app.models.feedback import ClassificationFeedback
from app.services.classifier import classify_image, rules
from app.services.classifier.base import Prediction, VisionBackend, VisionOutput
from app.services.classifier.color import dominant_colors, name_for_rgb
from tests.conftest import auth_headers, login
from tests.helpers import make_image, upload_files


@pytest.fixture(autouse=True)
def _clean_media():
    yield
    shutil.rmtree(settings.LOCAL_MEDIA_DIR, ignore_errors=True)


# ── colour ───────────────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "rgb,name",
    [
        ((200, 30, 60), "red"),
        ((128, 0, 32), "maroon"),
        ((30, 50, 120), "navy"),
        ((212, 175, 55), "golden"),
        ((250, 250, 250), "white"),
        ((240, 225, 190), "cream"),
        ((20, 20, 20), "black"),
        ((0, 128, 128), "teal"),
    ],
)
def test_name_for_rgb(rgb, name):
    assert name_for_rgb(rgb) == name


def test_dominant_colors_two_tone():
    im = Image.new("RGB", (400, 400), (200, 30, 60))
    im.paste((212, 175, 55), (0, 0, 400, 120))
    assert dominant_colors(im) == ("red", "golden")


def test_dominant_colors_single():
    assert dominant_colors(Image.new("RGB", (200, 200), (30, 50, 120))) == ("navy", None)


# ── rules ────────────────────────────────────────────────────────────────────


def test_seasons_from_fabric_matrix():
    assert rules.seasons_for_fabric("banarasi") == ["winter"]
    assert rules.seasons_for_fabric("cotton") == ["summer", "monsoon"]
    assert rules.seasons_for_fabric("crepe") == ["all_season"]
    assert rules.seasons_for_fabric("unknown") == ["all_season"]


def test_occasions_respect_fabric_avoid_lists():
    # casual avoids banarasi; a banarasi saree should not be tagged casual
    assert "casual" not in rules.occasions_for("saree", "banarasi")
    assert "wedding_guest" in rules.occasions_for("saree", "banarasi")
    assert rules.occasions_for("unknown", "cotton") == []


def test_care_profile_falls_back():
    assert rules.care_profile_for("banarasi")["dry_clean"] is True
    assert "monsoon" in rules.care_profile_for("georgette")
    assert "not identified" in rules.care_profile_for("unobtainium")["notes"]


# ── pipeline (rules backend: no model) ────────────────────────────────────────


def test_classify_image_rules_backend_sets_colour_only():
    r = classify_image(make_image(size=(120, 120), color=(212, 175, 55)))
    assert r.backend == "rules"
    assert r.garment_type == "unknown" and r.fabric_type == "unknown"
    assert r.color_primary == "golden"
    assert r.season_tags == ["all_season"] and r.occasion_tags == []
    assert r.confidence == 0.0


class FakeBackend(VisionBackend):
    name = "fake"

    def __init__(self, types, fabrics):
        self.out = VisionOutput(
            garment_types=[Prediction(*t) for t in types], fabrics=[Prediction(*f) for f in fabrics]
        )

    def predict(self, image):
        return self.out


def test_pipeline_combines_vision_and_rules(monkeypatch):
    import app.services.classifier as clf

    fake = FakeBackend([("saree", 0.9), ("dupatta", 0.1)], [("banarasi", 0.6), ("cotton", 0.3)])
    monkeypatch.setattr(clf, "get_backend", lambda: fake)
    r = clf.classify_image(
        make_image(size=(120, 120), color=(128, 0, 32)), user_style="south_indian"
    )
    assert r.garment_type == "saree" and r.confidence == 0.9
    assert r.fabric_type == "banarasi"
    assert r.color_primary == "maroon"
    assert "wedding_guest" in r.occasion_tags and "casual" not in r.occasion_tags
    assert r.season_tags == ["winter"]
    assert r.regional_style == "south_indian"
    assert r.care_profile["dry_clean"] is True
    assert r.candidates["garment_types"][0] == {"label": "saree", "confidence": 0.9}


def test_low_confidence_leaves_type_unknown(monkeypatch):
    import app.services.classifier as clf

    monkeypatch.setattr(
        clf, "get_backend", lambda: FakeBackend([("kurta", 0.2)], [("cotton", 0.9)])
    )
    r = clf.classify_image(make_image(size=(64, 64)))
    assert r.garment_type == "unknown" and r.fabric_type == "unknown"
    assert r.confidence == 0.2


# ── background job through the API ───────────────────────────────────────────


async def _upload_one(client, h):
    r = await client.post(
        "/wardrobe/upload",
        files=upload_files(make_image(size=(64, 64), color=(30, 50, 120))),
        headers=h,
    )
    assert r.status_code == 201, r.text
    return r.json()["created"][0]


async def test_upload_triggers_background_classification(client):
    h = auth_headers(await login(client))
    g = await _upload_one(client, h)
    assert g["classification_status"] == "pending"
    r = await client.get(f"/wardrobe/{g['id']}", headers=h)
    g = r.json()
    assert g["classification_status"] == "complete"
    assert g["color_primary"] == "navy"
    assert g["ai_labels"]["backend"] == "rules"
    assert g["classified_at"] is not None


async def test_classification_failure_marks_failed(client, monkeypatch):
    import app.services.classification_service as cs

    def boom(*a, **k):
        raise RuntimeError("model exploded")

    original = cs.classify_image
    monkeypatch.setattr(cs, "classify_image", boom)
    h = auth_headers(await login(client))
    g = await _upload_one(client, h)
    r = await client.get(f"/wardrobe/{g['id']}", headers=h)
    assert r.json()["classification_status"] == "failed"

    # reclassify after the fix (restore explicitly; undo() would also drop fixture patches)
    monkeypatch.setattr(cs, "classify_image", original)
    r = await client.post(f"/wardrobe/{g['id']}/reclassify", headers=h)
    assert r.status_code == 202
    r = await client.get(f"/wardrobe/{g['id']}", headers=h)
    assert r.json()["classification_status"] == "complete"


async def test_correction_records_feedback(client, db):
    h = auth_headers(await login(client))
    g = await _upload_one(client, h)
    # metadata-only edit → no feedback
    await client.put(f"/wardrobe/{g['id']}", json={"notes": "x"}, headers=h)
    assert (await db.execute(select(ClassificationFeedback))).scalars().all() == []

    r = await client.put(
        f"/wardrobe/{g['id']}",
        json={"garment_type": "saree", "color_primary": "navy", "occasion_tags": ["pooja"]},
        headers=h,
    )
    assert r.status_code == 200
    rows = (
        (await db.execute(select(ClassificationFeedback).order_by(ClassificationFeedback.field)))
        .scalars()
        .all()
    )
    # colour unchanged from AI (navy) → not recorded; type + occasions recorded
    assert [(x.field, x.ai_value, x.user_value) for x in rows] == [
        ("garment_type", "unknown", "saree"),
        ("occasion_tags", [], ["pooja"]),
    ]
    assert rows[0].backend == "rules" and rows[0].image_key.startswith("garments/")


async def test_confirm_marks_verified_without_changes(client, db):
    h = auth_headers(await login(client))
    g = await _upload_one(client, h)
    r = await client.post(f"/wardrobe/{g['id']}/confirm", headers=h)
    assert r.status_code == 200 and r.json()["user_verified"] is True
    assert (await db.execute(select(ClassificationFeedback))).scalars().all() == []


async def test_reclassify_keeps_user_labels(client):
    h = auth_headers(await login(client))
    g = await _upload_one(client, h)
    await client.put(f"/wardrobe/{g['id']}", json={"garment_type": "lehenga"}, headers=h)
    await client.post(f"/wardrobe/{g['id']}/reclassify", headers=h)
    r = await client.get(f"/wardrobe/{g['id']}", headers=h)
    assert r.json()["garment_type"] == "lehenga"  # user_verified wins
    assert r.json()["ai_labels"]["garment_type"] == "unknown"  # snapshot refreshed
