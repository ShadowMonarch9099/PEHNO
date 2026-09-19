"""
Garment classification pipeline:

    image ──► colour extraction (deterministic)
          ──► vision backend (rules | zero_shot | vit) → type + fabric candidates
          ──► knowledge rules → occasions, seasons, regional style, care profile

`classify_image` is synchronous and CPU-bound; call it from a worker or threadpool.
"""
import io
from functools import lru_cache

from PIL import Image

from app.core.config import settings
from app.services.classifier import rules
from app.services.classifier.base import (
    ClassificationResult,
    Prediction,
    VisionBackend,
    VisionOutput,
)
from app.services.classifier.color import dominant_colors
from app.services.classifier.rules_backend import RulesBackend


@lru_cache
def get_backend() -> VisionBackend:
    if settings.CLASSIFIER_BACKEND == "zero_shot":
        from app.services.classifier.zero_shot import ZeroShotBackend

        return ZeroShotBackend()
    if settings.CLASSIFIER_BACKEND == "vit":
        from app.services.classifier.vit import ViTBackend

        return ViTBackend()
    return RulesBackend()


def _pick_fabric(vision: VisionOutput, garment_type: str) -> Prediction:
    """
    Fabric is hard to see in a phone photo, so blend the model's guess with the
    taxonomy prior for the predicted garment type.
    """
    if not vision.fabrics:
        return Prediction("unknown", 0.0)
    prior = rules.fabric_prior(garment_type)
    best = None
    for rank, p in enumerate(vision.fabrics[:5]):
        boost = 1.5 if p.label in prior else 1.0
        score = p.confidence * boost / (1 + 0.1 * rank)
        if best is None or score > best[0]:
            best = (score, p)
    assert best is not None
    p = best[1]
    # Downweight fabric confidence overall — it is the least reliable signal.
    return Prediction(p.label, min(p.confidence * 0.9, 0.95))


def classify_image(data: bytes, user_style: str | None = None) -> ClassificationResult:
    image = Image.open(io.BytesIO(data))
    image.load()
    color_primary, color_accent = dominant_colors(image)

    backend = get_backend()
    vision = backend.predict(image)

    if (
        vision.garment_types
        and vision.garment_types[0].confidence >= settings.CLASSIFIER_MIN_CONFIDENCE
    ):
        gtype = vision.garment_types[0]
    else:
        gtype = Prediction(
            "unknown", vision.garment_types[0].confidence if vision.garment_types else 0.0
        )

    fabric = (
        _pick_fabric(vision, gtype.label)
        if gtype.label != "unknown"
        else Prediction("unknown", 0.0)
    )
    if fabric.confidence < settings.CLASSIFIER_MIN_CONFIDENCE:
        fabric = Prediction("unknown", fabric.confidence)

    return ClassificationResult(
        garment_type=gtype.label,
        fabric_type=fabric.label,
        color_primary=color_primary,
        color_accent=color_accent,
        occasion_tags=rules.occasions_for(gtype.label, fabric.label),
        season_tags=rules.seasons_for_fabric(fabric.label),
        regional_style=rules.regional_style_for(gtype.label, user_style),
        care_profile=rules.care_profile_for(fabric.label),
        confidence=round(gtype.confidence, 4),
        backend=backend.name,
        candidates={
            "garment_types": [
                {"label": p.label, "confidence": round(p.confidence, 4)}
                for p in vision.garment_types[:5]
            ],
            "fabrics": [
                {"label": p.label, "confidence": round(p.confidence, 4)} for p in vision.fabrics[:5]
            ],
        },
    )


__all__ = ["classify_image", "get_backend", "ClassificationResult"]
