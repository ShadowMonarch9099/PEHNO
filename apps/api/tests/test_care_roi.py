import shutil
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from app.core.config import settings
from app.models.garment import ClassificationStatus, Garment
from app.services import care_service as cs
from tests.conftest import auth_headers, login, upgrade
from tests.helpers import make_image, upload_files


@pytest.fixture(autouse=True)
def _clean():
    yield
    shutil.rmtree(settings.LOCAL_MEDIA_DIR, ignore_errors=True)


def g(t, f, c, occ=(), **kw):
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
        wear_count=kw.pop("wear_count", 0),
        wears_since_care=kw.pop("wears_since_care", 0),
        care_reminders_enabled=kw.pop("care_reminders_enabled", True),
        **kw,
    )


# ── pure ─────────────────────────────────────────────────────────────────────


def test_thresholds_follow_fabric():
    assert cs.reminder_threshold("cotton") == 5 and cs.reminder_threshold("banarasi") == 2
    assert cs.reminder_threshold("polyester") == 7 and cs.reminder_threshold("unobtainium") == 5
    assert cs.care_due(g("saree", "banarasi", "red", wears_since_care=2))
    assert not cs.care_due(g("kurta", "cotton", "white", wears_since_care=4))
    assert not cs.care_due(
        g("saree", "banarasi", "red", wears_since_care=9, care_reminders_enabled=False)
    )


def test_roi_verdicts():
    assert cs.roi_verdict(g("kurta", "cotton", "white"))[1] == "unpriced"
    assert cs.roi_verdict(g("kurta", "cotton", "white", purchase_price=1000))[1] == "unworn"
    cpw, verdict = cs.roi_verdict(g("kurta", "cotton", "white", purchase_price=1400, wear_count=28))
    assert float(cpw) == 50.0 and verdict == "great"  # ₹50/wear on a ₹700+ piece
    assert (
        cs.roi_verdict(g("saree", "banarasi", "red", purchase_price=8000, wear_count=1))[1]
        == "poor"
    )


def test_underutilised_and_pairings():
    now = datetime.now(UTC)
    idle = g(
        "kurta", "cotton", "white", ["office", "casual"], last_worn_at=now - timedelta(days=120)
    )
    fresh = g("kurta", "cotton", "blue", ["office"], last_worn_at=now - timedelta(days=3))
    never_new = g("kurti", "rayon", "pink", ["casual"], created_at=now - timedelta(days=5))
    never_old = g("kurti", "rayon", "teal", ["casual"], created_at=now - timedelta(days=45))
    bottom = g(
        "palazzo", "cotton", "navy", ["office", "casual"], last_worn_at=now - timedelta(days=2)
    )
    clash_bottom = g(
        "churidar", "cotton", "orange", ["casual"]
    )  # clashes with... nothing white; fine
    assert cs.is_underutilised(idle, now) and not cs.is_underutilised(fresh, now)
    assert not cs.is_underutilised(never_new, now) and cs.is_underutilised(never_old, now)

    pairs = cs.pairing_suggestions(idle, [idle, fresh, bottom, clash_bottom])
    assert pairs and pairs[0][0].id == bottom.id and pairs[0][1] in ("office", "casual")
    assert all(
        p.garment_type in ("palazzo", "churidar") for p, _ in pairs
    )  # complementary roles only


# ── API ──────────────────────────────────────────────────────────────────────


async def _add(client, h, gtype, fabric, color, occasions, price=None):
    r = await client.post(
        "/wardrobe/upload", files=upload_files(make_image(size=(32, 32))), headers=h
    )
    gid = r.json()["created"][0]["id"]
    body = {
        "garment_type": gtype,
        "fabric_type": fabric,
        "color_primary": color,
        "occasion_tags": occasions,
    }
    if price is not None:
        body["purchase_price"] = price
    await client.put(f"/wardrobe/{gid}", json=body, headers=h)
    return gid


async def test_wear_increments_care_counter_and_cared_resets(client):
    h = auth_headers(await login(client))
    gid = await _add(client, h, "saree", "banarasi", "red", ["festival"])
    g1 = (await client.post(f"/wardrobe/{gid}/wear", headers=h)).json()
    assert g1["wears_since_care"] == 1 and g1["care_due"] is False and g1["care_threshold"] == 2
    g2 = (await client.post(f"/wardrobe/{gid}/wear", headers=h)).json()
    assert g2["wears_since_care"] == 2 and g2["care_due"] is True
    g3 = (await client.post(f"/wardrobe/{gid}/cared", headers=h)).json()
    assert g3["wears_since_care"] == 0 and g3["care_due"] is False and g3["last_cared_at"]
    assert g3["wear_count"] == 2  # total wears untouched

    off = (
        await client.put(f"/wardrobe/{gid}/care-reminders", json={"enabled": False}, headers=h)
    ).json()
    assert off["care_reminders_enabled"] is False
    await client.post(f"/wardrobe/{gid}/wear", headers=h)
    await client.post(f"/wardrobe/{gid}/wear", headers=h)
    assert (await client.get(f"/wardrobe/{gid}", headers=h)).json()[
        "care_due"
    ] is False  # opted out


async def test_roi_endpoint_orders_worst_first(client):
    h = auth_headers(await login(client))
    great = await _add(client, h, "kurta", "cotton", "white", ["casual"], price=1400)
    for _ in range(28):
        await client.post(f"/wardrobe/{great}/wear", headers=h)
    poor = await _add(client, h, "saree", "banarasi", "red", ["festival"], price=8000)
    await client.post(f"/wardrobe/{poor}/wear", headers=h)
    unworn = await _add(client, h, "kurti", "rayon", "pink", ["casual"], price=900)
    unpriced = await _add(client, h, "palazzo", "cotton", "navy", ["casual"])

    r = await client.get("/wardrobe/roi", headers=h)
    assert r.status_code == 200, r.text
    d = r.json()
    assert [row["verdict"] for row in d["rows"]] == ["poor", "great", "unworn", "unpriced"]
    assert [row["garment"]["id"] for row in d["rows"]] == [poor, great, unworn, unpriced]
    assert d["rows"][0]["cost_per_wear"] == 8000.0 and d["rows"][1]["cost_per_wear"] == 50.0
    assert d["summary"] == {
        "garments": 4,
        "priced": 3,
        "worn": 2,
        "avg_cost_per_wear": 4025.0,
        "best": 50.0,
        "worst": 8000.0,
    }


async def test_underutilized_endpoint(client, db):
    h = auth_headers(await login(client))
    idle = await _add(client, h, "kurta", "cotton", "white", ["office", "casual"])
    bottom = await _add(client, h, "palazzo", "cotton", "navy", ["office", "casual"])
    await client.post(f"/wardrobe/{bottom}/wear", headers=h)
    row = await db.get(Garment, uuid.UUID(idle))
    row.last_worn_at = datetime.now(UTC) - timedelta(days=100)
    row.wear_count = 1
    await db.commit()

    r = await client.get("/wardrobe/underutilized", headers=h)
    assert r.status_code == 200, r.text
    items = r.json()
    assert [i["garment"]["id"] for i in items] == [idle]
    assert items[0]["days_idle"] >= 100
    assert items[0]["pairings"][0]["garment"]["id"] == bottom and items[0]["pairings"][0][
        "occasion"
    ] in ("office", "casual")


async def test_care_reminder_job_is_plus_only_and_deduped(client, caplog):
    from app.tasks.care_reminder import send_care_reminders

    free_h = auth_headers(await login(client, "9123456789"))
    await client.put("/users/me", json={"fcm_token": "tok-free-1234"}, headers=free_h)
    gid_free = await _add(client, free_h, "saree", "banarasi", "red", ["festival"])
    for _ in range(3):
        await client.post(f"/wardrobe/{gid_free}/wear", headers=free_h)

    h = auth_headers(await login(client))
    await upgrade(client, h)
    await client.put("/users/me", json={"fcm_token": "tok-plus-1234"}, headers=h)
    gid = await _add(client, h, "saree", "kanjeevaram", "maroon", ["festival"])
    await client.post(f"/wardrobe/{gid}/wear", headers=h)
    await client.post(f"/wardrobe/{gid}/wear", headers=h)

    with caplog.at_level("INFO"):
        first = await send_care_reminders()
        second = await send_care_reminders()
    assert first == {"sent": 1, "skipped": 0, "failed": 0}  # free user skipped entirely
    assert second == {"sent": 0, "skipped": 1, "failed": 0}
    assert any("kanjeevaram saree" in m and "Worn 2" in m for m in caplog.messages)

    # after cleaning and wearing past the threshold again, a new reminder fires
    await client.post(f"/wardrobe/{gid}/cared", headers=h)
    for _ in range(2):
        await client.post(f"/wardrobe/{gid}/wear", headers=h)
    assert (await send_care_reminders())["sent"] == 0  # same wears_since_care=2 key → deduped
    await client.post(f"/wardrobe/{gid}/wear", headers=h)
    assert (await send_care_reminders())["sent"] == 1  # wears_since_care=3 → new key


async def test_reminder_dedupe_key_uses_notification_log(client, db):
    from app.models.notification import NotificationLog

    h = auth_headers(await login(client))
    await upgrade(client, h)
    await client.put("/users/me", json={"fcm_token": "tok-x-1234"}, headers=h)
    gid = await _add(client, h, "kurta", "cotton", "white", ["casual"])
    for _ in range(5):
        await client.post(f"/wardrobe/{gid}/wear", headers=h)
    from app.tasks.care_reminder import send_care_reminders

    await send_care_reminders()
    logs = (
        (await db.execute(select(NotificationLog).where(NotificationLog.kind == "care_reminder")))
        .scalars()
        .all()
    )
    assert len(logs) == 1 and logs[0].key == f"{gid}:5"
