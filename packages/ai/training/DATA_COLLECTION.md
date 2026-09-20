# Labelled data needed for fine-tuning

The classifier ships zero-shot (CLIP over the taxonomy prompts). Fine-tuning `train_vit.py`
needs a labelled set. This is what to collect, by priority.

## Format

`labels.jsonl` + `images/` as produced by `apps/api/scripts/export_training_data.py`
(one JSON object per line: `image`, `garment_type`, `fabric_type`, `color_primary`,
`source` = `confirmed` | `corrected`). The taxonomy (`data/garment_labels.json`) is the
label space; new classes are added there first.

## Women's classes (23-class taxonomy, 10 women's / unisex)

Target ≥ 50 phone photos per class, half on hangers / flat-lay, half worn; mixed lighting.
Fabrics are the weak signal — label fabric only when the owner confirms it.

## Men's classes — placeholder (Phase 3, weeks 42–45)

No men's images exist yet. Needed per class (≥ 50 each, same capture mix):

| class | notes |
|---|---|
| `sherwani` | full-length, with and without a stole; distinguish from `bandhgala` (jacket length) |
| `kurta_pyjama` | shot as a set; a lone kurta is `kurta` (unisex class) |
| `bandhgala` | closed-collar jacket; include jodhpuri-with-trousers sets |
| `nehru_jacket` | sleeveless waistcoat, worn over a kurta and alone |
| `dhoti` | veshti / mundu variants; white and cream dominate — need colour variety |
| `pyjama` | straight, churidar-style and Aligarh cuts |
| `pathani_suit` | collar + cuffs distinguish it from `kurta_pyjama` |
| `formal_shirt`, `trousers`, `tshirt`, `jeans` | unisex western basics; cheap to source |

Collection mechanism: the app itself — every correction and confirmation on a male
account lands in `classification_feedback` and is exported with the script above.
Until ≥ 30 images/class exist, keep `CLASSIFIER_BACKEND=zero_shot` and measure with
`eval/evaluate.py` before touching prompts.
