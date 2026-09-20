# packages/ai — Garment AI

The knowledge base in `data/` is PEHNO's core IP. Everything in the API that
"understands" Indian clothing reads from these files; nothing is hard-coded.

```
data/
  garment_labels.json   Indian garment taxonomy (17 types, `gender` women|men|unisex): fabrics, occasions, regions, role
  fit_guidance.json     body type × gender → silhouette advice, preferred/avoided types, tips (engine fit layer)
  fabric_weather.json   fabric × season suitability (excellent / good / caution / avoid)
  festivals.json        25 festivals with 2025–2027 dates (lunar dates: re-verify yearly), colours, dress codes
  occasions.json        14 occasions incl. wedding sub-events (parent, palette, avoid_colors, garment_preference)
  color_harmony.json    colour pairs / clashes / skin-tone flattering colours for the outfit engine
  climatology.json      typical monthly weather per region (weather fallback)
  care_profiles.json    per-fabric wash / iron / storage / monsoon advice
  cities.json           launch cities with region + lat/lon + aesthetic
  destinations.json     travel destinations: cultural/modesty notes, palette, default activities, hill-station temp offset
  exports/              (git-ignored) training exports from the API
models/                 (git-ignored) fine-tuned checkpoints
training/train_vit.py   fine-tune ViT on an export
eval/evaluate.py        accuracy / confusion report against a labelled set
```

## How classification works today

`apps/api/app/services/classifier` runs three stages on every upload:

1. **Colour** — deterministic dominant-colour extraction (median-cut quantise → HSV → PEHNO colour names).
2. **Vision backend** — ranks garment types and fabrics. Selected by `CLASSIFIER_BACKEND`:
   - `zero_shot` (default): CLIP image–text similarity over the taxonomy using prompt ensembles. Needs no training data. ~0.2 s/image on CPU after a one-time ~600 MB model download (`HF_CLIP_MODEL`, default `patrickjohncyh/fashion-clip`).
   - `vit`: a fine-tuned ViT from `models/garment_classifier` (produced by `training/train_vit.py`). Fabric still comes from CLIP until a fabric head is trained.
   - `rules`: no model; the user labels the item (the manual fallback the build plan asks for). Used in CI.
3. **Knowledge rules** — occasions (taxonomy ∩ fabric avoid-lists), seasons (fabric matrix), regional style, care profile.

Predictions below `CLASSIFIER_MIN_CONFIDENCE` leave the type as `unknown` so the user is prompted rather than misled.

## The flywheel

Every correction in the app is written to `classification_feedback` (image, field, AI value, user value, confidence). Confirmations set `user_verified`. Export both with:

```bash
cd apps/api
venv/Scripts/python scripts/export_training_data.py --out ../../packages/ai/data/exports/$(date +%F)
```

Then measure and train:

```bash
# baseline / regression check (run from apps/api so the API package imports)
CLASSIFIER_BACKEND=zero_shot venv/Scripts/python ../../packages/ai/eval/evaluate.py --data ../../packages/ai/data/exports/<date>

# fine-tune once there are ≥50 labelled images per class
cd ../../packages/ai/training && pip install -r requirements.txt
python train_vit.py --data ../data/exports/<date> --out ../models/garment_classifier
```

Set `CLASSIFIER_BACKEND=vit` in the API to serve the fine-tuned model.

### Men's garments (weeks 42–45)

The taxonomy carries seven men's classes (sherwani, kurta_pyjama, bandhgala, nehru_jacket, dhoti, pyjama, pathani_suit) and marks kurta / churidar / indo_western as unisex. Classification is **scoped by the user's gender** (`classify_image(..., allowed_types=…)` drops the other gender's classes and renormalises), so a man's photo can never come back as a saree even with zero men's training data. Export, eval and training all read classes from the taxonomy, so men's images flow through the same flywheel — the corrections table is the collection mechanism. Zero-shot prompts for the men's classes are in `zero_shot.py:_TYPE_HINTS`; they have not been measured against real photos yet (same caveat as the women's baseline below).

## Current baseline (zero-shot, 5 random Wikimedia photos, 2026-09-19)

40% garment-type accuracy: saree and anarkali correct with high confidence; a flat-lay kurta-pyjama set → churidar, ghagra choli → anarkali, salwar suit → indo-western. The 85% launch gate needs a real labelled eval set (target: 30+ photos per class, phone-quality, on hangers and worn) before prompt tuning or fine-tuning decisions are made — tuning prompts against 5 images is overfitting.
