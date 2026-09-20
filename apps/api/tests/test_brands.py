"""Brand partnership layer: admin CMS, targeting, challenges, click tracking, performance."""
import shutil
from datetime import UTC, datetime, timedelta

import pytest

from app.core.config import settings
from tests.conftest import auth_headers, login, upgrade
from tests.helpers import make_image, upload_files

A = {"X-Admin-Key": "adm-key"}
CONFIG = {
    "description": "Style five linen looks.",
    "cta_url": "https://www.fabindia.com/women/linen",
    "cta_label": "Shop linen",
    "hashtag": "#LinenChallenge",
    "reward_text": "₹2,000 voucher",
    "target": {"cities": ["Pune", "Mumbai"], "tiers": [], "regional_styles": [], "genders": []},
    "products": [
        {
            "name": "Linen kurta",
            "url": "https://www.myntra.com/kurtas/fabindia/123",
            "price_inr": 2499,
        },
        {"name": "Linen palazzo", "url": "https://www.fabindia.com/palazzo", "price_inr": 1899},
    ],
    "challenge": {"goal": 2, "garment_types": ["kurta"], "fabrics": ["linen"], "brand_match": True},
}


@pytest.fixture(autouse=True)
def _admin(monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_API_KEY", "adm-key")
    yield
    shutil.rmtree(settings.LOCAL_MEDIA_DIR, ignore_errors=True)


def _iso(days: int) -> str:
    return (datetime.now(UTC) + timedelta(days=days)).isoformat()


async def _brand_with_campaign(client, status="live", config=CONFIG, kind="challenge"):
    r = await client.post(
        "/admin/brands",
        json={
            "name": "Fabindia",
            "website": "https://www.fabindia.com",
            "tagline": "Natural fabrics",
        },
        headers=A,
    )
    assert r.status_code == 201, r.text
    brand = r.json()
    r = await client.post(
        f"/admin/brands/{brand['id']}/campaigns",
        json={
            "title": "Summer Linen Challenge",
            "kind": kind,
            "status": status,
            "starts_at": _iso(-1),
            "ends_at": _iso(30),
            "config": config,
        },
        headers=A,
    )
    assert r.status_code == 201, r.text
    return brand, r.json()


async def _garment(client, h, gtype, fabric, brand=None):
    r = await client.post(
        "/wardrobe/upload", files=upload_files(make_image(size=(120, 160))), headers=h
    )
    gid = r.json()["created"][0]["id"]
    body = {
        "garment_type": gtype,
        "fabric_type": fabric,
        "color_primary": "navy",
        "occasion_tags": ["casual", "office"],
    }
    if brand:
        body["brand"] = brand
    r = await client.put(f"/wardrobe/{gid}", json=body, headers=h)
    assert r.status_code == 200, r.text
    return gid


async def _outfit(client, h, occasion="casual") -> str:
    r = await client.post("/outfits/generate", json={"occasion": occasion}, headers=h)
    assert r.status_code == 201 and r.json()["options"], r.text
    return r.json()["options"][0]["id"]


# ── admin CMS ────────────────────────────────────────────────────────────────


async def test_admin_cms_crud_and_validation(client):
    brand, camp = await _brand_with_campaign(client, status="draft")
    assert brand["slug"] == "fabindia" and brand["status"] == "prospect"
    assert (
        camp["status"] == "draft"
        and camp["live"] is False
        and camp["config"]["challenge"]["goal"] == 2
    )
    # duplicate brand → 409; bad config → 422
    assert (
        await client.post("/admin/brands", json={"name": "Fabindia"}, headers=A)
    ).status_code == 409
    bad = {**CONFIG, "challenge": {"goal": 99}}
    r = await client.post(
        f"/admin/brands/{brand['id']}/campaigns", json={"title": "x y z", "config": bad}, headers=A
    )
    assert r.status_code == 422
    # patch brand + campaign
    r = await client.patch(
        f"/admin/brands/{brand['id']}",
        json={"status": "active", "tagline": "Since 1960"},
        headers=A,
    )
    assert (
        r.status_code == 200
        and r.json()["status"] == "active"
        and r.json()["tagline"] == "Since 1960"
    )
    r = await client.patch(f"/admin/campaigns/{camp['id']}", json={"status": "live"}, headers=A)
    assert r.status_code == 200 and r.json()["live"] is True
    detail = (await client.get(f"/admin/brands/{brand['id']}", headers=A)).json()
    assert detail["campaign_count"] == 1 and detail["campaigns"][0]["id"] == camp["id"]
    lst = (await client.get("/admin/brands", headers=A)).json()
    assert lst[0]["campaign_count"] == 1
    assert (await client.get("/admin/brands", headers={"X-Admin-Key": "nope"})).status_code == 404


# ── discovery + targeting ────────────────────────────────────────────────────


async def test_campaigns_are_targeted_and_hidden_when_not_live(client):
    brand, camp = await _brand_with_campaign(client)
    pune = auth_headers(await login(client, "9000000001"))
    await client.put("/users/me", json={"city": "Pune"}, headers=pune)
    delhi = auth_headers(await login(client, "9000000002"))
    await client.put("/users/me", json={"city": "Delhi"}, headers=delhi)

    seen = (await client.get("/brands/campaigns", headers=pune)).json()
    assert len(seen) == 1
    c = seen[0]
    assert c["brand"]["name"] == "Fabindia" and c["kind"] == "challenge" and c["entry"] is None
    assert (
        c["rules_text"]
        == "Style 2 looks using a kurta in linen — or any piece tagged with the brand."
    )
    assert c["cta_url"].startswith("https://www.fabindia.com/women/linen?utm_source=pehno")
    assert len(c["products"]) == 2 and c["participants"] == 0
    assert (await client.get("/brands/campaigns", headers=delhi)).json() == []  # city-targeted
    assert (
        await client.get(f"/brands/campaigns/{camp['id']}", headers=delhi)
    ).status_code == 200  # direct link ok

    # ended → hidden for everyone without an entry
    await client.patch(f"/admin/campaigns/{camp['id']}", json={"status": "ended"}, headers=A)
    assert (await client.get("/brands/campaigns", headers=pune)).json() == []
    assert (await client.get(f"/brands/campaigns/{camp['id']}", headers=pune)).status_code == 404
    # views were tracked once per user per day
    perf = (await client.get(f"/admin/campaigns/{camp['id']}/performance", headers=A)).json()
    assert perf["views"] == 1 and perf["unique_viewers"] == 1


async def test_challenge_join_submit_complete_and_performance(client):
    brand, camp = await _brand_with_campaign(client)
    h = auth_headers(await login(client, "9000000001"))
    await client.put("/users/me", json={"city": "Pune"}, headers=h)
    cid = camp["id"]

    # wardrobe: qualifying linen kurta, a Fabindia-tagged cotton kurti, a plain palazzo
    await _garment(client, h, "kurta", "linen")
    await _garment(client, h, "kurti", "cotton", brand="fabindia")
    await _garment(client, h, "palazzo", "cotton")
    await _garment(client, h, "kurta", "polyester")  # non-qualifying

    r = await client.post(f"/brands/campaigns/{cid}/join", headers=h)
    assert (
        r.status_code == 200
        and r.json()["entry"]["progress"] == 0
        and r.json()["participants"] == 1
    )
    assert (await client.post(f"/brands/campaigns/{cid}/join", headers=h)).json()[
        "participants"
    ] == 1  # idempotent

    # generate looks until we have one qualifying and one not
    seen: dict[str, list[str]] = {}
    for _ in range(6):
        r = await client.post("/outfits/generate", json={"occasion": "casual"}, headers=h)
        for o in r.json()["options"]:
            seen[o["id"]] = [
                (g["garment_type"], g["fabric_type"], g["brand"]) for g in o["garments"]
            ]
    qual = [
        oid
        for oid, gs in seen.items()
        if any((t == "kurta" and f == "linen") or b == "fabindia" for t, f, b in gs)
    ]
    non = [oid for oid, gs in seen.items() if oid not in qual]
    assert qual, seen
    if non:
        r = await client.post(
            f"/brands/campaigns/{cid}/submit", json={"outfit_id": non[0]}, headers=h
        )
        assert r.status_code == 422 and "qualifying" in r.json()["detail"]

    r = await client.post(f"/brands/campaigns/{cid}/submit", json={"outfit_id": qual[0]}, headers=h)
    assert r.status_code == 200 and r.json()["entry"]["progress"] == 1
    assert (
        await client.post(f"/brands/campaigns/{cid}/submit", json={"outfit_id": qual[0]}, headers=h)
    ).status_code == 409
    await client.post(f"/outfits/{qual[0]}/save", headers=h)
    if len(qual) > 1:
        r = await client.post(
            f"/brands/campaigns/{cid}/submit", json={"outfit_id": qual[1]}, headers=h
        )
        assert (
            r.status_code == 200
            and r.json()["entry"]["completed_at"]
            and r.json()["entry"]["progress"] == 2
        )

    # someone else's outfit → 404
    other = auth_headers(await login(client, "9000000002"))
    assert (
        await client.post(
            f"/brands/campaigns/{cid}/submit", json={"outfit_id": qual[0]}, headers=other
        )
    ).status_code == 404

    # clicks: partner-platform product → affiliate click; brand site → utm link
    r = await client.post(f"/brands/campaigns/{cid}/click", json={"product_index": 0}, headers=h)
    assert r.status_code == 200 and "myntra.com" in r.json()["url"] and "subid=" in r.json()["url"]
    r = await client.post(f"/brands/campaigns/{cid}/click", json={"product_index": 1}, headers=h)
    assert "fabindia.com/palazzo?utm_source=pehno" in r.json()["url"]
    r = await client.post(f"/brands/campaigns/{cid}/click", json={}, headers=h)
    assert "women/linen?utm_source=pehno" in r.json()["url"]
    assert (
        await client.post(f"/brands/campaigns/{cid}/click", json={"product_index": 9}, headers=h)
    ).status_code == 404

    perf = (await client.get(f"/admin/campaigns/{cid}/performance", headers=A)).json()
    assert perf["joins"] == 1 and perf["participants"] == 1
    assert perf["outfits_submitted"] == min(2, len(qual)) and perf["clicks"] == 3
    assert perf["saves"] == 1 and perf["affiliate"]["clicks"] == 1
    assert perf["completions"] == (1 if len(qual) > 1 else 0)
    assert perf["by_day"] and set(perf["by_day"][0]) >= {"date", "join", "click"}
    # the partner-platform click also shows in the affiliate ledger
    m = (await client.get("/admin/metrics", headers=A)).json()
    assert any(p["platform"] == "myntra" and p["clicks"] == 1 for p in m["affiliate_30d"])


async def test_collections_cannot_be_joined_and_tier_targeting(client):
    cfg = {
        **CONFIG,
        "target": {"cities": [], "tiers": ["plus", "pro"], "regional_styles": [], "genders": []},
    }
    _, camp = await _brand_with_campaign(client, config=cfg, kind="collection")
    h = auth_headers(await login(client))
    assert (await client.get("/brands/campaigns", headers=h)).json() == []  # free user
    await upgrade(client, h, "plus")
    seen = (await client.get("/brands/campaigns", headers=h)).json()
    assert len(seen) == 1 and seen[0]["kind"] == "collection" and seen[0]["challenge"] is None
    assert seen[0]["rules_text"] is None
    assert (await client.post(f"/brands/campaigns/{camp['id']}/join", headers=h)).status_code == 422
