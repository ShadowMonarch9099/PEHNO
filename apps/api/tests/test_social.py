import io
import shutil

import pytest
from PIL import Image

from app.core.config import settings
from app.services.share_card import CardItem, render_card
from tests.conftest import auth_headers, login
from tests.helpers import make_image, upload_files


@pytest.fixture(autouse=True)
def _clean():
    yield
    shutil.rmtree(settings.LOCAL_MEDIA_DIR, ignore_errors=True)


def test_render_card_layouts():
    for n in (1, 2, 3):
        items = [
            CardItem(
                image=make_image(size=(300, 400), color=(120 + 30 * i, 60, 90)), label=f"Piece {i}"
            )
            for i in range(n)
        ]
        data = render_card(items, title="Office", subtitle="3-piece look · 31°C rain", city="Pune")
        im = Image.open(io.BytesIO(data))
        assert im.size == (1080, 1350) and im.format == "JPEG"
    # broken image bytes fall back to a placeholder tile rather than failing
    data = render_card(
        [CardItem(image=b"junk", label="Saree")], title="Diwali", subtitle="x", city=None
    )
    assert len(data) > 10_000


async def _wardrobe(client, h):
    for gtype, fabric, color, occ in [
        ("kurta", "cotton", "white", ["office", "casual"]),
        ("palazzo", "cotton", "navy", ["office", "casual"]),
    ]:
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


async def _outfit(client, h) -> str:
    return (await client.post("/outfits/generate", json={"occasion": "office"}, headers=h)).json()[
        "options"
    ][0]["id"]


async def test_share_unshare_and_public_page(client):
    h = auth_headers(await login(client))
    await client.put("/users/me", json={"name": "Priya Sharma", "city": "Pune"}, headers=h)
    await _wardrobe(client, h)
    oid = await _outfit(client, h)

    # not public yet: outfit carries no share url, public page 404s
    assert (await client.get(f"/outfits/{oid}", headers=h)).json()["is_public"] is False

    r = await client.post(f"/social/share-card/{oid}", headers=h)
    assert r.status_code == 200, r.text
    s = r.json()
    assert (
        s["is_public"]
        and s["share_url"].startswith(f"{settings.PUBLIC_BASE_URL}/s/")
        and s["card_url"].endswith("/card.jpg")
    )
    slug = s["share_url"].rsplit("/", 1)[1]

    page = await client.get(f"/s/{slug}")
    assert (
        page.status_code == 200
        and "og:image" in page.text
        and "Priya" in page.text
        and "office" in page.text
    )
    assert "<li>white cotton kurta</li>" in page.text
    card = await client.get(f"/s/{slug}/card.jpg")
    assert card.status_code == 200 and card.headers["content-type"] == "image/jpeg"
    assert Image.open(io.BytesIO(card.content)).size == (1080, 1350)

    # outfit responses now carry the share state
    o = (await client.get(f"/outfits/{oid}", headers=h)).json()
    assert o["is_public"] and o["share_url"] and o["card_url"]

    # sharing twice reuses the slug
    assert (
        (await client.post(f"/social/share-card/{oid}", headers=h))
        .json()["share_url"]
        .endswith(slug)
    )

    # unshare hides everything
    assert (await client.delete(f"/social/share-card/{oid}", headers=h)).json()[
        "is_public"
    ] is False
    assert (await client.get(f"/s/{slug}")).status_code == 404
    assert (await client.get(f"/s/{slug}/card.jpg")).status_code == 404
    assert (await client.get("/s/nope")).status_code == 404


async def test_city_feed_and_likes(client):
    owner = auth_headers(await login(client, "9876543210"))
    await client.put("/users/me", json={"name": "Priya", "city": "Mumbai"}, headers=owner)
    await _wardrobe(client, owner)
    oid = await _outfit(client, owner)

    viewer = auth_headers(await login(client, "9123456789"))
    await client.put("/users/me", json={"city": "Mumbai"}, headers=viewer)
    elsewhere = auth_headers(await login(client, "9000000001"))
    await client.put("/users/me", json={"city": "Delhi"}, headers=elsewhere)

    # unshared → not in feed; liking an unshared look of someone else → 404
    assert (await client.get("/social/feed/city", headers=viewer)).json() == []
    assert (await client.post(f"/social/like/{oid}", headers=viewer)).status_code == 404

    await client.post(f"/social/share-card/{oid}", headers=owner)
    feed = (await client.get("/social/feed/city", headers=viewer)).json()
    assert len(feed) == 1
    item = feed[0]
    assert (
        item["owner_first_name"] == "Priya"
        and item["city"] == "Mumbai"
        and item["aesthetic"] == "Mumbai minimal"
    )
    assert item["card_url"] and len(item["garments"]) == 2 and item["liked"] is False
    assert (await client.get("/social/feed/city", headers=elsewhere)).json() == []  # different city
    assert (
        len(
            (
                await client.get("/social/feed/city", params={"city": "mumbai"}, headers=elsewhere)
            ).json()
        )
        == 1
    )

    r = await client.post(f"/social/like/{oid}", headers=viewer)
    assert r.json()["like_count"] == 1
    assert (await client.post(f"/social/like/{oid}", headers=viewer)).json()[
        "like_count"
    ] == 1  # idempotent
    assert (await client.get("/social/feed/city", headers=viewer)).json()[0]["liked"] is True
    assert (await client.delete(f"/social/like/{oid}", headers=viewer)).json()["like_count"] == 0

    assert (
        await client.put("/social/preferences", json={"enabled": True}, headers=owner)
    ).status_code == 200


async def test_social_flag_hides_everything(client, monkeypatch):
    monkeypatch.setattr(settings, "SOCIAL_ENABLED", False)
    h = auth_headers(await login(client))
    assert (await client.get("/social/feed/city", headers=h)).status_code == 404
    assert (await client.get("/s/anything")).status_code == 404
    assert (await client.get("/users/me", headers=h)).json()["entitlements"]["flags"][
        "social"
    ] is False
