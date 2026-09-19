"""
Measure classifier accuracy against a labelled set (the plan's 85% gate).

Runs the API's actual pipeline (same code path as production) over
<data>/labels.jsonl and prints accuracy, per-class recall and a confusion
matrix for garment_type, plus fabric and colour accuracy where labelled.

    cd apps/api
    CLASSIFIER_BACKEND=zero_shot venv/Scripts/python ../../packages/ai/eval/evaluate.py \
        --data ../../packages/ai/data/exports/2026-09-19 [--limit 200]

Run it from apps/api so the API package and its venv are importable.
"""
import argparse
import json
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path.cwd()))

from app.services.classifier import classify_image, get_backend  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True, type=Path)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--report", type=Path, default=None, help="write JSON report here")
    args = ap.parse_args()

    rows = [json.loads(line) for line in (args.data / "labels.jsonl").read_text(encoding="utf-8").splitlines()]
    if args.limit:
        rows = rows[: args.limit]

    backend = get_backend().name
    confusion: dict[str, Counter] = defaultdict(Counter)
    hits = {"garment_type": 0, "fabric_type": 0, "color_primary": 0}
    counts = {"garment_type": 0, "fabric_type": 0, "color_primary": 0}
    t0 = time.time()
    for r in rows:
        res = classify_image((args.data / r["image"]).read_bytes(), r.get("regional_style"))
        pred = {"garment_type": res.garment_type, "fabric_type": res.fabric_type, "color_primary": res.color_primary}
        for field in hits:
            truth = r.get(field)
            if truth and truth not in ("unknown", "other"):
                counts[field] += 1
                hits[field] += pred[field] == truth
        confusion[r["garment_type"]][res.garment_type] += 1
    elapsed = time.time() - t0

    report = {
        "backend": backend,
        "n": len(rows),
        "seconds_per_image": round(elapsed / max(1, len(rows)), 3),
        "accuracy": {f: round(hits[f] / counts[f], 4) if counts[f] else None for f in hits},
        "per_class_recall": {
            cls: round(c[cls] / sum(c.values()), 3) for cls, c in sorted(confusion.items()) if sum(c.values())
        },
        "confusion": {cls: dict(c.most_common()) for cls, c in sorted(confusion.items())},
        "gate_85_percent": (hits["garment_type"] / counts["garment_type"] >= 0.85) if counts["garment_type"] else None,
    }
    print(json.dumps(report, indent=2))
    if args.report:
        args.report.write_text(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
