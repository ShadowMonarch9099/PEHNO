from tests.conftest import auth_headers, login


async def test_get_me(client):
    tokens = await login(client)
    r = await client.get("/users/me", headers=auth_headers(tokens))
    assert r.status_code == 200
    me = r.json()
    assert me["id"] == tokens["user"]["id"]
    assert me["city"] == "Mumbai"
    assert me["regional_style"] == "pan_india_fusion"


async def test_update_me_partial(client):
    tokens = await login(client)
    h = auth_headers(tokens)
    payload = {
        "name": "Priya",
        "city": "Pune",
        "body_type": "petite",
        "skin_tone": "wheatish",
        "regional_style": "rajasthani",
        "onboarding_complete": True,
    }
    r = await client.put("/users/me", json=payload, headers=h)
    assert r.status_code == 200, r.text
    me = r.json()
    for k, v in payload.items():
        assert me[k] == v
    assert me["gender"] == "female"  # untouched

    r = await client.get("/users/me", headers=h)
    assert r.json()["name"] == "Priya"


async def test_update_me_validates_input(client):
    tokens = await login(client)
    h = auth_headers(tokens)
    r = await client.put("/users/me", json={"body_type": "gigantic"}, headers=h)
    assert r.status_code == 422
    assert "body_type" in r.json()["errors"]
    assert (
        await client.put("/users/me", json={"regional_style": "martian"}, headers=h)
    ).status_code == 422
    assert (
        await client.put("/users/me", json={"email": "not-an-email"}, headers=h)
    ).status_code == 422


async def test_stats_empty_wardrobe(client):
    tokens = await login(client)
    r = await client.get("/users/me/stats", headers=auth_headers(tokens))
    assert r.status_code == 200
    assert r.json() == {
        "garment_count": 0,
        "outfit_count": 0,
        "total_wears": 0,
        "avg_cost_per_wear": None,
    }
