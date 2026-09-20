"""Tier-2 expansion: city style tuning, Hindi labels + push copy, cache/gzip headers."""
import uuid
from datetime import UTC, datetime

import pytest

from app import knowledge
from app.models.garment import ClassificationStatus, Garment
from app.services import outfit_engine as engine
from app.services.weather.base import Weather
from app.tasks import daily_outfit_push, festival_alert, weekly_gap_report
from tests.conftest import auth_headers, login

WEATHER = Weather("Lucknow", 26, 26, 50, "sunny", "transition", "climatology")


def g(t, f, c):
    return Garment(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        image_key="x",
        garment_type=t,
        fabric_type=f,
        color_primary=c,
        occasion_tags=["casual"],
        season_tags=[],
        classification_status=ClassificationStatus.complete,
    )


# ── regional style tuning ────────────────────────────────────────────────────


def test_cities_carry_style_defaults_and_profiles():
    assert knowledge.city("jaipur")["regional_style"] == "rajasthani"
    assert knowledge.city("Chandigarh")["regional_style"] == "punjabi"
    assert knowledge.city("chennai")["regional_style"] == "south_indian"
    assert knowledge.city("Pune")["regional_style"] == "mumbai_minimal"
    assert all("regional_style" in c for c in knowledge.cities())
    lko = knowledge.city_style_profile("Lucknow")
    assert "chikankari" in lko["crafts"] and "cotton" in lko["fabrics"] and "white" in lko["colors"]
    assert knowledge.city_style_profile("Nashik") is None


def test_engine_city_layer_prefers_local_fabrics_and_colours():
    chikan = g("kurta", "cotton", "white")  # reads local in Lucknow
    velvet = g("kurta", "velvet", "purple")
    now = datetime.now(UTC)

    def score(garment, city):
        return engine.score_garment(
            garment,
            occasion="casual",
            weather=WEATHER,
            user=engine.UserContext(city=city),
            festival=None,
            history=engine.History(),
            now=now,
        )

    lko, nowhere = score(chikan, "Lucknow"), score(chikan, "Nashik")
    assert lko.score - nowhere.score == pytest.approx(engine.W_CITY_FABRIC + engine.W_CITY_COLOR)
    assert any("Reads local in Lucknow" in r for r in lko.reasons)
    assert score(velvet, "Lucknow").score == score(velvet, "Nashik").score
    # Jaipur likes pink block-print cottons, not white
    assert score(g("kurta", "cotton", "pink"), "Jaipur").score > score(chikan, "Jaipur").score


# ── Hindi ────────────────────────────────────────────────────────────────────


async def test_meta_hindi_labels_and_cache_headers(client):
    en = await client.get("/meta/wardrobe-options")
    hi = await client.get("/meta/wardrobe-options", params={"lang": "hi"})
    assert en.headers["cache-control"] == "public, max-age=86400"
    by = {o["slug"]: o["label"] for o in hi.json()["garment_types"]}
    assert by["saree"] == "साड़ी" and by["sherwani"] == "शेरवानी" and by["other"] == "अन्य"
    occ = {o["slug"]: o["label"] for o in hi.json()["occasions"]}
    assert occ["wedding_guest"] == "शादी में मेहमान" and occ["office"].startswith("ऑफ़िस")
    assert {o["slug"] for o in hi.json()["occasions"]} == {
        o["slug"] for o in en.json()["occasions"]
    }  # slugs never change
    assert {o["slug"]: o["label"] for o in hi.json()["seasons"]}["monsoon"] == "मानसून"
    assert {o["slug"]: o["label"] for o in hi.json()["fabrics"]}["cotton"] == "सूती"
    assert {o["slug"]: o["label"] for o in hi.json()["colors"]}["maroon"] == "मैरून"
    # unknown lang → English
    assert (await client.get("/meta/wardrobe-options", params={"lang": "ta"})).json() == en.json()

    cities = (await client.get("/meta/cities")).json()
    jaipur = next(c for c in cities if c["slug"] == "jaipur")
    assert jaipur["regional_style"] == "rajasthani" and "block_print" in jaipur["crafts"]
    assert jaipur["style_note"] and jaipur["aesthetic"] == "Jaipur block-print"


async def test_user_language_preference(client):
    h = auth_headers(await login(client))
    assert (await client.get("/users/me", headers=h)).json()["language"] == "en"
    r = await client.put("/users/me", json={"language": "hi"}, headers=h)
    assert r.status_code == 200 and r.json()["language"] == "hi"
    assert (await client.put("/users/me", json={"language": "fr"}, headers=h)).status_code == 422


def test_push_copy_is_localised():
    class Look:
        id = uuid.uuid4()
        garments = [g("kurta", "cotton", "white"), g("palazzo", "cotton", "navy")]

    en = daily_outfit_push._copy(Look(), WEATHER, "n1")
    hi = daily_outfit_push._copy(Look(), WEATHER, "n1", "hi")
    assert en.title == "Today's look ✨" and "kurta + palazzo pants" in en.body
    assert hi.title == "आज का लुक ✨" and "कुर्ता + पलाज़ो" in hi.body and "26°C" in hi.body
    assert en.data == hi.data

    class Occ:
        festival = {"name": "Diwali", "slug": "diwali", "color_guidance": "Gold and red."}

    assert "कल" in festival_alert._copy(Occ(), 1, "n2", "hi").title
    assert "in 3 days" in festival_alert._copy(Occ(), 3, "n2").title
    report = {"gaps": [{"new_outfits": 6, "suggested_colors": ["navy"], "label": "Palazzo"}]}
    assert "साप्ताहिक" in weekly_gap_report._copy(report, "n3", "hi").title
    assert "6" in weekly_gap_report._copy(report, "n3", "hi").body


# ── slow-network friendliness ────────────────────────────────────────────────


async def test_json_is_gzipped_when_accepted(client):
    r = await client.get("/meta/wardrobe-options", headers={"Accept-Encoding": "gzip"})
    assert r.status_code == 200 and r.headers.get("content-encoding") == "gzip"
    assert r.json()["garment_types"]  # httpx transparently decodes
    small = await client.get("/health", headers={"Accept-Encoding": "gzip"})
    assert small.headers.get("content-encoding") is None  # below minimum_size
