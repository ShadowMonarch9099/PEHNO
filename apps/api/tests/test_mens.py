"""Male wardrobe support: taxonomy, gender-scoped classification/gaps/links, fit guidance."""
import shutil
import uuid
from datetime import UTC, date, datetime, timedelta

import pytest

from app import knowledge
from app.core.config import settings
from app.models.commerce import AffiliatePlatform
from app.models.garment import ClassificationStatus, Garment
from app.services import affiliate_service
from app.services import gap_analyzer as ga
from app.services import outfit_engine as engine
from app.services import travel_planner as tp
from app.services.classifier import Prediction, _restrict
from app.services.weather.base import Weather
from tests.conftest import auth_headers, login
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


MENS = [
    g("kurta", "cotton", "white", ["casual", "office", "pooja"]),
    g("kurta", "linen", "navy", ["casual", "office"]),
    g("kurta", "silk", "maroon", ["festival", "wedding_guest"]),
    g("pyjama", "cotton", "white", ["casual", "office", "pooja"]),
    g("churidar", "cotton", "cream", ["casual", "festival"]),
    g("dhoti", "silk", "cream", ["pooja", "temple", "wedding_guest"]),
    g("nehru_jacket", "raw_silk", "golden", ["festival", "wedding_guest", "office"]),
    g("sherwani", "raw_silk", "maroon", ["baraat", "wedding_guest", "reception"]),
    g("bandhgala", "raw_silk", "navy", ["reception", "formal", "sangeet"]),
]
WEATHER = Weather("Delhi", 24, 24, 50, "sunny", "transition", "climatology")
MAN = engine.UserContext(body_type="slim", gender="male")


# ── taxonomy ─────────────────────────────────────────────────────────────────


def test_taxonomy_has_mens_garments_with_roles_and_gender():
    tax = {x["slug"]: x for x in knowledge.garment_types()}
    assert len(tax) == 23 and all(
        "gender" in x for x in tax.values()
    )  # 10 women/unisex + 7 men + 6 spec additions
    assert {"sharara", "gharara", "formal_shirt", "trousers", "tshirt", "jeans"} <= set(tax)
    assert tax["sherwani"]["role"] == "full" and tax["sherwani"]["gender"] == "men"
    assert tax["kurta_pyjama"]["role"] == "full" and tax["kurta_pyjama"]["layer_ok"]
    assert tax["nehru_jacket"]["role"] == "layer"
    assert tax["dhoti"]["role"] == "bottom" and tax["pyjama"]["role"] == "bottom"
    assert tax["bandhgala"]["role"] == "full" and tax["pathani_suit"]["role"] == "full"
    assert tax["kurta"]["gender"] == "unisex" and tax["churidar"]["gender"] == "unisex"
    assert tax["saree"]["gender"] == "women"

    men = knowledge.garment_type_slugs_for("male")
    women = knowledge.garment_type_slugs_for("female")
    assert "sherwani" in men and "saree" not in men and "kurta" in men
    assert "saree" in women and "sherwani" not in women and "kurta" in women
    assert knowledge.garment_type_slugs_for("other") == knowledge.garment_type_slugs()
    # men's picks were added to the wedding sub-events
    assert "sherwani" in knowledge.occasion("baraat")["garment_preference"]
    assert "kurta_pyjama" in knowledge.occasion("mehendi")["garment_preference"]


def test_wardrobe_gender_inference():
    assert knowledge.gender_for_wardrobe("male", ["saree"]) == "male"  # explicit wins
    assert knowledge.gender_for_wardrobe(None, ["kurta", "pyjama", "sherwani"]) == "male"
    assert knowledge.gender_for_wardrobe("other", ["kurta", "saree"]) == "female"
    assert (
        knowledge.gender_for_wardrobe(None, ["kurta"]) == "female"
    )  # ambiguous → primary audience


# ── classification scope ─────────────────────────────────────────────────────


def test_restrict_drops_other_gender_types_and_renormalises():
    preds = [Prediction("saree", 0.5), Prediction("kurta", 0.3), Prediction("sherwani", 0.2)]
    men = _restrict(preds, knowledge.garment_type_slugs_for("male"))
    assert [p.label for p in men] == ["kurta", "sherwani"]
    assert abs(sum(p.confidence for p in men) - 1.0) < 1e-6 and men[0].confidence == 0.6
    assert _restrict(preds, None) == preds
    assert _restrict(preds, {"lehenga"}) == []


# ── outfit engine ────────────────────────────────────────────────────────────


def test_mens_outfits_compose_kurta_bottom_and_nehru_jacket():
    opts = engine.generate(MENS, occasion="office", weather=WEATHER, user=MAN, limit=3)
    assert opts
    top = opts[0]
    types = [x.garment_type for x in top.garments]
    assert "kurta" in types and any(t in types for t in ("pyjama", "churidar"))
    assert any(x.garment_type == "nehru_jacket" for o in opts for x in o.garments)
    # baraat → the sherwani (tagged + occasion preference) beats a plain kurta set
    opts = engine.generate(MENS, occasion="baraat", weather=WEATHER, user=MAN, limit=1)
    assert [x.garment_type for x in opts[0].garments] == ["sherwani"]
    # pooja → dhoti pairs with a kurta
    opts = engine.generate(MENS, occasion="pooja", weather=WEATHER, user=MAN, limit=10)
    assert any("dhoti" in [x.garment_type for x in o.garments] for o in opts)


def test_fit_guidance_layer_and_body_types():
    slim = engine.score_garment(
        MENS[8],
        occasion="formal",
        weather=WEATHER,
        user=MAN,
        festival=None,
        history=engine.History(),
        now=datetime.now(UTC),
    )
    plus = engine.score_garment(
        MENS[8],
        occasion="formal",
        weather=WEATHER,
        user=engine.UserContext(body_type="plus", gender="male"),
        festival=None,
        history=engine.History(),
        now=datetime.now(UTC),
    )
    # bandhgala: preferred for slim, avoided for plus
    assert slim.score - plus.score == pytest.approx(engine.W_FIT_PREFER - engine.W_FIT_AVOID)
    assert any("slim frame" in r for r in slim.reasons)

    assert {b["slug"] for b in knowledge.body_types_for("male")} == {
        "slim",
        "athletic",
        "regular",
        "tall",
        "broad",
        "plus",
    }
    assert {b["slug"] for b in knowledge.body_types_for("female")} == {
        "petite",
        "regular",
        "tall",
        "plus",
    }
    assert knowledge.fit_guidance("male", "broad")["tips"]
    assert (
        knowledge.fit_guidance("female", "slim")["label"] == "Slim"
    )  # falls through to men's table


# ── gaps + affiliate ─────────────────────────────────────────────────────────


def test_gap_suggestions_stay_within_the_users_taxonomy():
    mens_gaps = ga.analyze(
        MENS[:3] + [MENS[6]], gender="male", limit=10
    )  # kurtas + jacket, no bottoms
    types = [x.garment_type for x in mens_gaps]
    assert types and not {"saree", "lehenga", "palazzo", "dupatta"} & set(types)
    assert types[0] in ("pyjama", "churidar", "dhoti")  # a bottom unlocks the most looks
    # gender unknown but the wardrobe is unmistakably men's → same result
    assert [x.garment_type for x in ga.analyze(MENS[:3] + [MENS[6]], limit=3)][0] in (
        "pyjama",
        "churidar",
        "dhoti",
    )


def test_affiliate_query_is_gendered():
    src = affiliate_service.SearchLinkSource()
    q = src.cards(
        gap_type="kurta",
        color="navy",
        fabric="linen",
        budget_inr=None,
        platforms=[AffiliatePlatform.myntra],
        gender="male",
    )[0].query
    assert q.endswith(" men") and "kurta" in q
    q = src.cards(
        gap_type="sherwani",
        color=None,
        fabric=None,
        budget_inr=None,
        platforms=[AffiliatePlatform.myntra],
    )[0].query
    assert q.endswith(" men")  # men's-only type regardless of who asks
    q = src.cards(
        gap_type="saree",
        color="red",
        fabric=None,
        budget_inr=None,
        platforms=[AffiliatePlatform.myntra],
        gender="male",
    )[0].query
    assert q.endswith(" women")


def test_travel_gaps_for_men_suggest_mens_pieces():
    dest = tp.resolve_destination("Manali")
    start = date(2026, 1, 10)
    wx = {start + timedelta(days=i): tp.climate(dest, start + timedelta(days=i)) for i in range(2)}
    slots = tp.build_slots(start, start + timedelta(days=1), ["casual"], wx)
    res = tp.plan(
        MENS[:1] + [MENS[3]], dest=dest, slots=slots, user=MAN
    )  # kurta + pyjama, no layer
    assert any(gp.garment_type == "nehru_jacket" for gp in res.gaps)


# ── API ──────────────────────────────────────────────────────────────────────


async def test_male_profile_meta_and_upload(client):
    h = auth_headers(await login(client, "9000000007"))
    r = await client.put("/users/me", json={"gender": "male", "body_type": "slim"}, headers=h)
    assert r.status_code == 200 and r.json()["body_type"] == "slim"
    assert (await client.put("/users/me", json={"body_type": "hulk"}, headers=h)).status_code == 422

    bt = (await client.get("/meta/body-types", params={"gender": "male"})).json()
    assert [b["slug"] for b in bt] == ["slim", "athletic", "regular", "tall", "broad", "plus"]
    assert bt[0]["tips"] and bt[0]["prefer"] and bt[0]["silhouette"]
    assert [b["slug"] for b in (await client.get("/meta/body-types")).json()] == [
        "petite",
        "regular",
        "tall",
        "plus",
    ]
    opts = (await client.get("/meta/wardrobe-options")).json()
    by = {o["slug"]: o["gender"] for o in opts["garment_types"]}
    assert by["sherwani"] == "men" and by["kurta"] == "unisex" and by["saree"] == "women"

    # a man labels a sherwani; outfit for baraat uses it
    r = await client.post(
        "/wardrobe/upload", files=upload_files(make_image(size=(120, 160))), headers=h
    )
    gid = r.json()["created"][0]["id"]
    r = await client.put(
        f"/wardrobe/{gid}",
        json={"garment_type": "sherwani", "fabric_type": "raw_silk", "color_primary": "maroon"},
        headers=h,
    )
    assert r.status_code == 200, r.text
    assert set(r.json()["occasion_tags"]) >= {"baraat", "wedding_guest", "reception"}
    r = await client.post("/outfits/generate", json={"occasion": "baraat"}, headers=h)
    assert (
        r.status_code == 201 and r.json()["options"][0]["garments"][0]["garment_type"] == "sherwani"
    )
