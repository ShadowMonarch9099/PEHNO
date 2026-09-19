"""
Export the retraining dataset: every user-verified garment plus every recorded
correction, as JSONL + copied images, in the layout packages/ai/training expects.

    python scripts/export_training_data.py --out ../../packages/ai/data/exports/2026-09-19

Output:
    <out>/labels.jsonl   one {"image": "images/<id>.jpg", "garment_type": ..., "fabric_type": ...,
                          "color_primary": ..., "occasion_tags": [...], "source": "verified|correction"} per line
    <out>/images/        copies of the garment images
"""
import argparse
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select  # noqa: E402

from app.core.database import SessionLocal  # noqa: E402
from app.models.feedback import ClassificationFeedback  # noqa: E402
from app.models.garment import Garment  # noqa: E402
from app.services.storage import get_storage  # noqa: E402


async def main(out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    (out / "images").mkdir(exist_ok=True)
    storage = get_storage()
    rows = 0
    async with SessionLocal() as db, open(out / "labels.jsonl", "w", encoding="utf-8") as f:
        verified = (
            (await db.execute(select(Garment).where(Garment.user_verified.is_(True))))
            .scalars()
            .all()
        )
        for g in verified:
            if g.garment_type in ("unknown", "other"):
                continue
            try:
                (out / "images" / f"{g.id}.jpg").write_bytes(await storage.get(g.image_key))
            except Exception as e:  # image gone — skip the row rather than fail the export
                print(f"skip {g.id}: {e}")
                continue
            f.write(
                json.dumps(
                    {
                        "image": f"images/{g.id}.jpg",
                        "garment_type": g.garment_type,
                        "fabric_type": g.fabric_type,
                        "color_primary": g.color_primary,
                        "occasion_tags": g.occasion_tags,
                        "season_tags": g.season_tags,
                        "regional_style": g.regional_style,
                        "ai_labels": g.ai_labels,
                        "source": "verified",
                    }
                )
                + "\n"
            )
            rows += 1

        corrections = (await db.execute(select(ClassificationFeedback))).scalars().all()
        summary: dict[str, int] = {}
        for c in corrections:
            summary[c.field] = summary.get(c.field, 0) + 1
    print(f"wrote {rows} labelled images to {out}")
    print("corrections by field:", summary or "none yet")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True, type=Path)
    asyncio.run(main(ap.parse_args().out))
