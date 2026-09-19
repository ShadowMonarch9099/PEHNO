"""
Fine-tune a Vision Transformer on the PEHNO garment-type taxonomy.

Input: a labels.jsonl + images/ directory as produced by
apps/api/scripts/export_training_data.py (or any hand-labelled set in the same
layout). Output: an HF checkpoint the API loads with CLASSIFIER_BACKEND=vit.

    pip install -r requirements.txt
    python train_vit.py --data ../data/exports/2026-09-19 --out ../models/garment_classifier

Labels come from packages/ai/data/garment_labels.json so the model's id2label
matches the API vocabulary exactly.
"""
import argparse
import json
import random
from pathlib import Path

import numpy as np
import torch
from datasets import Dataset, DatasetDict
from PIL import Image
from sklearn.metrics import accuracy_score, f1_score
from transformers import (
    AutoImageProcessor,
    AutoModelForImageClassification,
    Trainer,
    TrainingArguments,
)

ROOT = Path(__file__).resolve().parents[1]
TAXONOMY = ROOT / "data" / "garment_labels.json"


def load_labels() -> list[str]:
    return [g["slug"] for g in json.loads(TAXONOMY.read_text(encoding="utf-8"))]


def load_rows(data_dir: Path, labels: list[str]) -> list[dict]:
    rows = []
    for line in (data_dir / "labels.jsonl").read_text(encoding="utf-8").splitlines():
        r = json.loads(line)
        if r.get("garment_type") in labels:
            rows.append({"image_path": str(data_dir / r["image"]), "label": labels.index(r["garment_type"])})
    return rows


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--base", default="google/vit-base-patch16-224-in21k")
    ap.add_argument("--epochs", type=int, default=8)
    ap.add_argument("--lr", type=float, default=5e-5)
    ap.add_argument("--batch", type=int, default=16)
    ap.add_argument("--val-split", type=float, default=0.15)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    random.seed(args.seed)
    torch.manual_seed(args.seed)
    labels = load_labels()
    rows = load_rows(args.data, labels)
    if len(rows) < 50:
        raise SystemExit(f"Only {len(rows)} labelled rows — need at least ~50 per class to fine-tune meaningfully.")
    random.shuffle(rows)
    n_val = max(1, int(len(rows) * args.val_split))
    ds = DatasetDict(
        {"train": Dataset.from_list(rows[n_val:]), "validation": Dataset.from_list(rows[:n_val])}
    )
    print(f"train={len(ds['train'])} val={len(ds['validation'])} classes={len(labels)}")

    processor = AutoImageProcessor.from_pretrained(args.base)

    def transform(batch):
        images = [Image.open(p).convert("RGB") for p in batch["image_path"]]
        enc = processor(images=images, return_tensors="pt")
        enc["labels"] = torch.tensor(batch["label"])
        return enc

    ds.set_transform(transform)

    model = AutoModelForImageClassification.from_pretrained(
        args.base,
        num_labels=len(labels),
        id2label=dict(enumerate(labels)),
        label2id={label: i for i, label in enumerate(labels)},
        ignore_mismatched_sizes=True,
    )

    def compute_metrics(pred):
        y = pred.label_ids
        p = np.argmax(pred.predictions, axis=-1)
        return {"accuracy": accuracy_score(y, p), "macro_f1": f1_score(y, p, average="macro")}

    training_args = TrainingArguments(
        output_dir=str(args.out / "checkpoints"),
        per_device_train_batch_size=args.batch,
        per_device_eval_batch_size=args.batch,
        num_train_epochs=args.epochs,
        learning_rate=args.lr,
        warmup_ratio=0.1,
        weight_decay=0.01,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="accuracy",
        logging_steps=10,
        remove_unused_columns=False,
        report_to=[],
        seed=args.seed,
    )
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=ds["train"],
        eval_dataset=ds["validation"],
        compute_metrics=compute_metrics,
        data_collator=lambda items: {k: torch.stack([i[k] for i in items]) for k in items[0]},
    )
    trainer.train()
    metrics = trainer.evaluate()
    print("validation:", metrics)

    args.out.mkdir(parents=True, exist_ok=True)
    trainer.save_model(str(args.out))
    processor.save_pretrained(str(args.out))
    (args.out / "metrics.json").write_text(json.dumps(metrics, indent=2))
    print(f"saved to {args.out} — set CLASSIFIER_BACKEND=vit in the API to use it")


if __name__ == "__main__":
    main()
