import shutil
import uuid
from urllib.parse import parse_qs, urlparse

import pytest

from app.core.config import settings
from app.models.commerce import AffiliatePlatform
from app.services import affiliate_service as aff
from tests.conftest import auth_headers, login, upgrade
from tests.helpers import make_image, upload_files


@pytest.fixture(autouse=True)
def _clean():
    yield
    shutil.rmtree(settings.LOCAL_MEDIA_DIR, ignore_errors=True)


# ── link building (pure) ─────────────────────────────────────────────────────


def test_search_cards_encode_colour_fabric_type_and_budget():
    cards = aff.get_product_source().cards(
        gap_type="palazzo",
        color="navy",
        fabric="cotton",
        budget_inr=1200,
        platforms=aff.platforms_for_budget(1200),
    )
    assert [c.platform for c in cards] == aff.platforms_for_budget(1200)
    myntra = next(c for c in cards if c.platform == AffiliatePlatform.myntra)
    assert myntra.query == "navy cotton palazzo pants women"
    assert (
        myntra.product_url.startswith("https://www.myntra.com/")
        and "rawQuery=navy%20cotton" in myntra.product_url
    )
    assert myntra.price_min_inr == 500 and myntra.price_max_inr == 1200  # capped by budget
    assert myntra.is_search and myntra.name == "Navy Cotton Palazzo pants on Myntra"


def test_budget_orders_platforms():
    assert aff.platforms_for_budget(500)[0] == AffiliatePlatform.meesho
    assert aff.platforms_for_budget(6000)[0] == AffiliatePlatform.nykaa
    assert aff.platforms_for_budget(None)[0] == AffiliatePlatform.myntra


def test_affiliate_url_without_network_tags_utm_and_subid():
    url = aff.affiliate_url(
        "https://www.ajio.com/search/?text=navy", AffiliatePlatform.ajio, "click-1"
    )
    q = parse_qs(urlparse(url).query)
    assert q["text"] == ["navy"] and q["utm_source"] == ["pehno"] and q["subid"] == ["click-1"]
    assert "aff_id" not in q  # no platform id configured


def test_affiliate_url_with_network_template(monkeypatch):
    monkeypatch.setattr(
        settings,
        "AFFILIATE_NETWORK_TEMPLATE",
        "https://linksredirect.com/?cid={cid}&source=linkkit&subid={subid}&url={url}",
    )
    monkeypatch.setattr(settings, "AFFILIATE_NETWORK_ID", "12345")
    url = aff.affiliate_url(
        "https://www.myntra.com/navy-palazzo?rawQuery=navy%20palazzo",
        AffiliatePlatform.myntra,
        "abc",
    )
    assert url.startswith(
        "https://linksredirect.com/?cid=12345&source=linkkit&subid=abc&url=https%3A%2F%2Fwww.myntra.com"
    )


# ── API ──────────────────────────────────────────────────────────────────────


async def test_affiliate_links_gated_and_validated(client):
    h = auth_headers(await login(client))
    assert (
        await client.get("/commerce/affiliate-links", params={"gap_type": "dupatta"}, headers=h)
    ).status_code == 402
    await upgrade(client, h)
    assert (
        await client.get("/commerce/affiliate-links", params={"gap_type": "tuxedo"}, headers=h)
    ).status_code == 422
    assert (
        await client.get(
            "/commerce/affiliate-links",
            params={"gap_type": "dupatta", "platform": "amazon"},
            headers=h,
        )
    ).status_code == 422
    r = await client.get(
        "/commerce/affiliate-links",
        params={"gap_type": "dupatta", "color": "golden", "budget": 800},
        headers=h,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["untracked"] is True and d["cards"][0]["platform"] == "meesho"
    assert all(c["is_search"] and c["product_url"].startswith("https://") for c in d["cards"])
    r = await client.get(
        "/commerce/affiliate-links", params={"gap_type": "dupatta", "platform": "nykaa"}, headers=h
    )
    assert [c["platform"] for c in r.json()["cards"]] == ["nykaa"]


async def test_click_logging_and_conversion_postback(client, db, monkeypatch, caplog):
    from sqlalchemy import select

    from app.models.commerce import AffiliateClick

    h = auth_headers(await login(client))
    await client.put("/users/me", json={"fcm_token": "tok-conv-12345"}, headers=h)
    r = await client.post(
        "/commerce/affiliate-click",
        json={
            "platform": "myntra",
            "product_url": "https://www.myntra.com/navy-palazzo",
            "gap_type": "palazzo",
        },
        headers=h,
    )
    assert r.status_code == 201, r.text
    click_id, url = r.json()["click_id"], r.json()["affiliate_url"]
    assert f"subid={click_id}" in url and url.startswith("https://www.myntra.com/navy-palazzo?")

    assert (
        await client.post(
            "/commerce/affiliate-click",
            json={"platform": "ebay", "product_url": "https://x"},
            headers=h,
        )
    ).status_code == 422
    assert (
        await client.post(
            "/commerce/affiliate-click",
            json={"platform": "myntra", "product_url": "http://insecure"},
            headers=h,
        )
    ).status_code == 422

    # postback: secret required
    body = {"subid": click_id, "order_value_inr": 1299, "commission_inr": 78}
    assert (await client.post("/commerce/affiliate-conversion", json=body)).status_code == 401
    monkeypatch.setattr(settings, "AFFILIATE_POSTBACK_SECRET", "pb-secret")
    assert (
        await client.post(
            "/commerce/affiliate-conversion", json=body, headers={"X-Postback-Secret": "nope"}
        )
    ).status_code == 401
    with caplog.at_level("INFO"):
        r = await client.post(
            "/commerce/affiliate-conversion", json=body, headers={"X-Postback-Secret": "pb-secret"}
        )
    assert r.status_code == 200
    row = (await db.execute(select(AffiliateClick))).scalar_one()
    assert row.converted and row.commission_inr == 78 and row.converted_at is not None
    assert any("Bought it?" in m for m in caplog.messages)  # nudge to add the purchase

    # idempotent + unknown subid
    assert (
        await client.post(
            "/commerce/affiliate-conversion", json=body, headers={"X-Postback-Secret": "pb-secret"}
        )
    ).status_code == 200
    assert (
        await client.post(
            "/commerce/affiliate-conversion",
            json={"subid": "not-a-uuid"},
            headers={"X-Postback-Secret": "pb-secret"},
        )
    ).status_code == 404


async def test_admin_metrics_requires_key_and_aggregates(client, monkeypatch):
    h = auth_headers(await login(client))
    await upgrade(client, h, "pro")
    await client.post("/wardrobe/upload", files=upload_files(make_image(size=(32, 32))), headers=h)
    await client.post(
        "/commerce/affiliate-click",
        json={"platform": "ajio", "product_url": "https://www.ajio.com/x"},
        headers=h,
    )

    assert (await client.get("/admin/metrics")).status_code == 404  # disabled without a key
    monkeypatch.setattr(settings, "ADMIN_API_KEY", "adm-key")
    assert (await client.get("/admin/metrics", headers={"X-Admin-Key": "wrong"})).status_code == 404
    r = await client.get("/admin/metrics", headers={"X-Admin-Key": "adm-key"})
    assert r.status_code == 200, r.text
    m = r.json()
    assert m["users"]["total"] == 1 and m["users"]["by_tier"] == {"pro": 1}
    assert m["revenue"]["mrr_inr"] == 399 and m["revenue"]["active_subscriptions"] == 1
    assert m["activity"]["garments"] == 1
    assert m["affiliate_30d"] == [
        {"platform": "ajio", "clicks": 1, "conversions": 0, "commission_inr": 0}
    ]


async def test_admin_users_analytics_and_brands(client, monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_API_KEY", "adm-key")
    A = {"X-Admin-Key": "adm-key"}
    h = auth_headers(await login(client))
    await client.put("/users/me", json={"name": "Priya Sharma", "city": "Pune"}, headers=h)
    await client.post("/wardrobe/upload", files=upload_files(make_image(size=(32, 32))), headers=h)
    await client.post("/outfits/generate", json={"occasion": "office"}, headers=h)

    r = await client.get("/admin/users", params={"q": "priya"}, headers=A)
    assert r.status_code == 200 and r.json()["total"] == 1
    u = r.json()["items"][0]
    assert u["garment_count"] == 1 and u["city"] == "Pune" and u["tier"] == "free"
    assert (await client.get("/admin/users", params={"q": "nobody"}, headers=A)).json()[
        "total"
    ] == 0
    assert (await client.get("/admin/users", params={"tier": "pro"}, headers=A)).json()[
        "total"
    ] == 0

    w = (await client.get(f"/admin/users/{u['id']}/wardrobe", headers=A)).json()
    assert w["user"]["name"] == "Priya Sharma" and len(w["garments"]) == 1
    assert (await client.get(f"/admin/users/{uuid.uuid4()}/wardrobe", headers=A)).status_code == 404

    a = (await client.get("/admin/analytics", params={"days": 7}, headers=A)).json()
    assert a["user_growth"][-1]["users"] == 1 and isinstance(a["outfits_by_day"], list)
    assert [s["stage"] for s in a["funnel"]] == [
        "Signed up",
        "Uploaded",
        "10+ items",
        "30+ items",
        "Paid",
    ]
    assert [s["users"] for s in a["funnel"]] == [1, 1, 0, 0, 0]

    assert (await client.get("/admin/brands", headers=A)).json() == []
    r = await client.post(
        "/admin/brands", json={"name": "Fabindia", "website": "https://fabindia.com"}, headers=A
    )
    assert (
        r.status_code == 201 and r.json()["slug"] == "fabindia" and r.json()["status"] == "prospect"
    )
    assert (
        await client.post("/admin/brands", json={"name": "Fabindia"}, headers=A)
    ).status_code == 409
    assert (await client.get("/admin/brands", headers=A)).json()[0]["campaign_count"] == 0
    assert (await client.get("/admin/brands")).status_code == 404  # no key
