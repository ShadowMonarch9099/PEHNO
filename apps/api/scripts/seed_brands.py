"""
Seed the first five brand partners (build plan, weeks 46–48) as prospects, plus
one sample challenge in draft so the admin CMS has something to edit.
Idempotent: existing brands are left untouched.

    venv/Scripts/python scripts/seed_brands.py [--live]
"""
import argparse
import asyncio
import sys
from datetime import timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select  # noqa: E402

from app.core.database import SessionLocal, utcnow  # noqa: E402
from app.models.brand import BrandCampaign, BrandPartner  # noqa: E402
from app.schemas.brand import CampaignConfig  # noqa: E402

PARTNERS = [
    ("Fabindia", "https://www.fabindia.com", "Handcrafted, natural fabrics since 1960"),
    ("W for Woman", "https://www.wforwoman.com", "Contemporary Indian wear for work and weekends"),
    ("Biba", "https://www.biba.in", "Festive and everyday ethnic wear"),
    ("FabAlley", "https://www.faballey.com", "Fusion and indo-western for the young professional"),
    ("Libas", "https://www.libas.in", "Affordable kurta sets and co-ords"),
]

SAMPLE = CampaignConfig.model_validate(
    {
        "description": "Beat the heat in linen. Style five looks with any linen kurta or "
        "palazzo from your wardrobe (or a Fabindia piece) and share your favourite.",
        "cta_url": "https://www.fabindia.com/women/linen",
        "cta_label": "Shop Fabindia linen",
        "hashtag": "#FabindiaLinenChallenge",
        "reward_text": "Top 20 looks win a ₹2,000 Fabindia voucher",
        "target": {"cities": [], "tiers": [], "regional_styles": [], "genders": []},
        "products": [
            {
                "name": "Linen straight kurta — indigo",
                "url": "https://www.fabindia.com/women/kurtas",
                "price_inr": 2499,
                "garment_type": "kurta",
                "color": "navy",
            },
            {
                "name": "Linen palazzo — off-white",
                "url": "https://www.fabindia.com/women/palazzos",
                "price_inr": 1899,
                "garment_type": "palazzo",
                "color": "cream",
            },
        ],
        "challenge": {
            "goal": 5,
            "occasion": None,
            "garment_types": ["kurta", "palazzo", "kurta_pyjama"],
            "fabrics": ["linen"],
            "brand_match": True,
        },
    }
)


async def main(live: bool) -> None:
    async with SessionLocal() as db:
        created = 0
        for name, site, tagline in PARTNERS:
            slug = name.lower().replace(" ", "-")
            if await db.scalar(select(BrandPartner.id).where(BrandPartner.slug == slug)):
                continue
            db.add(BrandPartner(name=name, slug=slug, website=site, tagline=tagline))
            created += 1
        await db.flush()
        fab = await db.scalar(select(BrandPartner).where(BrandPartner.slug == "fabindia"))
        has = await db.scalar(select(BrandCampaign.id).where(BrandCampaign.brand_id == fab.id))
        if not has:
            db.add(
                BrandCampaign(
                    brand_id=fab.id,
                    title="Fabindia Summer Linen Challenge",
                    kind="challenge",
                    status="live" if live else "draft",
                    starts_at=utcnow(),
                    ends_at=utcnow() + timedelta(days=45),
                    config=SAMPLE.model_dump(mode="json"),
                )
            )
        await db.commit()
        print(f"brands created: {created}; sample campaign: {'live' if live else 'draft'}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--live", action="store_true", help="publish the sample challenge")
    asyncio.run(main(ap.parse_args().live))
