import shutil
from pathlib import Path

import pytest
from PIL import Image

from app.core.config import settings
from tests.conftest import auth_headers, login
from tests.helpers import make_image, upload_files

SMALL = make_image(size=(64, 64))


@pytest.fixture(autouse=True)
def _clean_media():
    yield
    shutil.rmtree(settings.LOCAL_MEDIA_DIR, ignore_errors=True)


async def _upload(client, h, *images, **kw):
    return await client.post("/wardrobe/upload", files=upload_files(*images, **kw), headers=h)


async def _one(client, h) -> dict:
    return (await _upload(client, h, SMALL)).json()["created"][0]


def _key(g: dict) -> str:
    return g["image_url"].split("/media/")[1]


async def test_upload_single_creates_pending_garment_and_files(client):
    h = auth_headers(await login(client))
    r = await _upload(client, h, make_image())
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["rejected"] == []
    assert len(body["created"]) == 1
    g = body["created"][0]
    assert g["classification_status"] == "pending"  # job hasn't run when the response is built
    assert g["garment_type"] == "unknown"
    assert g["wear_count"] == 0
    assert g["cost_per_wear"] is None
    assert g["image_url"].startswith(f"{settings.PUBLIC_BASE_URL}/media/garments/")
    assert g["thumbnail_url"].endswith("_thumb.jpg")

    full = Path(settings.LOCAL_MEDIA_DIR) / _key(g)
    thumb = Path(settings.LOCAL_MEDIA_DIR) / _key(g).replace(".jpg", "_thumb.jpg")
    assert full.exists() and thumb.exists()
    assert full.stat().st_size <= settings.IMAGE_TARGET_BYTES
    with Image.open(full) as im:
        assert max(im.size) <= settings.IMAGE_MAX_SIDE
    with Image.open(thumb) as im:
        assert im.size == (settings.THUMBNAIL_SIDE, settings.THUMBNAIL_SIDE)

    r = await client.get(f"/media/{_key(g)}")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("image/jpeg")


async def test_upload_bulk_with_partial_rejects(client):
    h = auth_headers(await login(client))
    r = await _upload(
        client, h, SMALL, b"definitely not an image", make_image("PNG", size=(64, 64))
    )
    assert r.status_code == 201
    body = r.json()
    assert len(body["created"]) == 2
    assert len(body["rejected"]) == 1
    assert "not a supported image" in body["rejected"][0]["reason"]


async def test_upload_all_invalid_is_422(client):
    h = auth_headers(await login(client))
    assert (await _upload(client, h, b"nope")).status_code == 422


async def test_upload_too_many_files(client):
    h = auth_headers(await login(client))
    r = await _upload(client, h, *[SMALL] * (settings.MAX_BULK_UPLOAD + 1))
    assert r.status_code == 422
    assert "At most" in r.json()["detail"]


async def test_list_filters_and_pagination(client):
    h = auth_headers(await login(client))
    ids = [(await _one(client, h))["id"] for _ in range(3)]
    await client.put(
        f"/wardrobe/{ids[0]}",
        json={
            "occasion_tags": ["pooja", "office"],
            "fabric_type": "cotton",
            "season_tags": ["summer"],
        },
        headers=h,
    )
    await client.put(
        f"/wardrobe/{ids[1]}",
        json={"occasion_tags": ["casual"], "fabric_type": "cotton", "season_tags": ["winter"]},
        headers=h,
    )

    async def ids_for(**params):
        r = await client.get("/wardrobe", params=params, headers=h)
        assert r.status_code == 200, r.text
        return [g["id"] for g in r.json()["items"]], r.json()["total"]

    assert (await ids_for())[1] == 3
    assert (await ids_for(occasion="office"))[0] == [ids[0]]
    assert (await ids_for(fabric="cotton"))[1] == 2
    assert (await ids_for(season="winter"))[0] == [ids[1]]
    # With the rules backend the background job completes instantly in tests.
    assert (await ids_for(status="complete"))[1] == 3
    assert (await ids_for(status="pending"))[1] == 0
    got, total = await ids_for(page=2, page_size=2)
    assert total == 3 and len(got) == 1


async def test_garments_are_private_to_owner(client):
    h1 = auth_headers(await login(client, "9876543210"))
    h2 = auth_headers(await login(client, "9123456789"))
    gid = (await _one(client, h1))["id"]
    assert (await client.get(f"/wardrobe/{gid}", headers=h2)).status_code == 404
    assert (
        await client.put(f"/wardrobe/{gid}", json={"notes": "x"}, headers=h2)
    ).status_code == 404
    assert (await client.delete(f"/wardrobe/{gid}", headers=h2)).status_code == 404
    assert (await client.get("/wardrobe", headers=h2)).json()["total"] == 0


async def test_update_metadata_and_correction_marks_verified(client):
    h = auth_headers(await login(client))
    gid = (await _one(client, h))["id"]

    r = await client.put(
        f"/wardrobe/{gid}",
        json={"purchase_price": "1500", "condition": "new", "notes": "Diwali 2025"},
        headers=h,
    )
    assert r.status_code == 200, r.text
    g = r.json()
    assert g["purchase_price"] == 1500.0 and g["condition"] == "new"
    assert g["user_verified"] is False and g["classification_status"] == "complete"

    r = await client.put(
        f"/wardrobe/{gid}",
        json={"garment_type": "saree", "fabric_type": "banarasi", "color_primary": "maroon"},
        headers=h,
    )
    g = r.json()
    assert g["user_verified"] is True and g["classification_status"] == "complete"
    assert g["garment_type"] == "saree"


async def test_update_rejects_unknown_vocabulary(client):
    h = auth_headers(await login(client))
    gid = (await _one(client, h))["id"]
    bad_inputs = (
        {"garment_type": "tuxedo"},
        {"fabric_type": "unobtainium"},
        {"occasion_tags": ["prom"]},
        {"season_tags": ["autumn"]},
        {"regional_style": "martian"},
    )
    for bad in bad_inputs:
        assert (await client.put(f"/wardrobe/{gid}", json=bad, headers=h)).status_code == 422, bad


async def test_wear_log_cost_per_wear_and_stats(client):
    h = auth_headers(await login(client))
    gid = (await _one(client, h))["id"]
    await client.put(f"/wardrobe/{gid}", json={"purchase_price": "1500"}, headers=h)
    for _ in range(3):
        r = await client.post(f"/wardrobe/{gid}/wear", headers=h)
    g = r.json()
    assert g["wear_count"] == 3 and g["cost_per_wear"] == 500.0
    assert g["last_worn_at"].endswith("+00:00")

    r = await client.get("/users/me/stats", headers=h)
    assert r.json() == {
        "garment_count": 1,
        "outfit_count": 0,
        "total_wears": 3,
        "avg_cost_per_wear": 500.0,
    }


async def test_delete_removes_files(client):
    h = auth_headers(await login(client))
    g = await _one(client, h)
    assert (Path(settings.LOCAL_MEDIA_DIR) / _key(g)).exists()
    assert (await client.delete(f"/wardrobe/{g['id']}", headers=h)).status_code == 200
    assert not (Path(settings.LOCAL_MEDIA_DIR) / _key(g)).exists()
    assert (await client.get(f"/wardrobe/{g['id']}", headers=h)).status_code == 404


async def test_meta_options_and_cities(client):
    r = await client.get("/meta/wardrobe-options")
    assert r.status_code == 200
    o = r.json()
    assert {"slug": "saree", "label": "Saree"} in o["garment_types"]
    assert any(f["slug"] == "banarasi" for f in o["fabrics"])
    assert [s["slug"] for s in o["seasons"]] == ["summer", "monsoon", "winter", "all_season"]
    assert len(o["regional_styles"]) == 5
    r = await client.get("/meta/cities")
    assert r.status_code == 200 and len(r.json()) == 20 and r.json()[0]["name"] == "Mumbai"
