"""
Garment Classifier Service
Classifies garments using HuggingFace ViT with rule-based fallback.
"""
import io
import re
import json
import base64
import logging
from typing import Dict, Any, Optional, List, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)

# ── Care Profile Lookup ────────────────────────────────────────────────────────

CARE_PROFILES: Dict[str, Dict[str, Any]] = {
    "cotton": {
        "wash": "Machine wash cold (30°C), gentle cycle",
        "iron": "Medium heat iron (cotton setting)",
        "storage": "Store folded or in drawer",
        "dry_clean": False,
        "notes": "Can be machine dried on low. Use mild detergent.",
    },
    "linen": {
        "wash": "Machine wash cold or hand wash",
        "iron": "Iron while slightly damp on high heat",
        "storage": "Hang to prevent heavy creases",
        "dry_clean": False,
        "notes": "Air dry flat. Embrace natural wrinkles or steam.",
    },
    "silk": {
        "wash": "Hand wash cold with silk-safe detergent OR dry clean",
        "iron": "Low heat iron (silk/delicate setting), use pressing cloth",
        "storage": "Hang on padded hangers or store in muslin bag",
        "dry_clean": True,
        "notes": "Never wring. Keep away from direct sunlight to prevent fading.",
    },
    "raw_silk": {
        "wash": "Dry clean recommended; hand wash cold as alternative",
        "iron": "Low heat on reverse side with pressing cloth",
        "storage": "Store hanging in muslin cloth, avoid plastic",
        "dry_clean": True,
        "notes": "Avoid water spots. Do not wring. Keep in cool, dry place.",
    },
    "banarasi": {
        "wash": "Dry clean only",
        "iron": "No direct iron. Steam from distance only",
        "storage": "Wrap in muslin cloth, store flat or rolled. Never fold zari on itself",
        "dry_clean": True,
        "notes": "Store with silica gel packets to prevent tarnishing of zari. Air out before storing.",
    },
    "kanjeevaram": {
        "wash": "Dry clean recommended; hand wash in cold water as alternative",
        "iron": "Iron on reverse side with pressing cloth on medium heat",
        "storage": "Wrap in muslin, store folded with tissue between pleats",
        "dry_clean": True,
        "notes": "Never expose to harsh chemicals. Rotate storage every 3-6 months to prevent creasing.",
    },
    "georgette": {
        "wash": "Hand wash cold or dry clean",
        "iron": "Low heat steam iron on reverse side",
        "storage": "Hang to maintain drape",
        "dry_clean": False,
        "notes": "Handle gently — georgette can snag. Do not wring.",
    },
    "chiffon": {
        "wash": "Hand wash cold, very gentle",
        "iron": "Lowest heat setting with pressing cloth, or steam",
        "storage": "Hang to preserve sheer quality",
        "dry_clean": False,
        "notes": "Extremely delicate. Handle with care to avoid pulls or tears.",
    },
    "crepe": {
        "wash": "Hand wash or gentle machine wash in cold water",
        "iron": "Medium heat, steam setting works well",
        "storage": "Fold or hang — both suitable",
        "dry_clean": False,
        "notes": "Dries quickly. Minimal ironing needed.",
    },
    "velvet": {
        "wash": "Dry clean only",
        "iron": "Steam only, never direct iron — will crush pile",
        "storage": "Hang separately to prevent pile crushing",
        "dry_clean": True,
        "notes": "Brush gently with soft brush to restore pile. Store with cedar blocks.",
    },
    "khadi": {
        "wash": "Hand wash cold with mild soap",
        "iron": "High heat on slightly damp fabric",
        "storage": "Store folded in a clean cotton bag",
        "dry_clean": False,
        "notes": "Gets softer with each wash. Air dry in shade to prevent fading.",
    },
    "net": {
        "wash": "Hand wash very gently or dry clean",
        "iron": "Do not iron directly. Use pressing cloth on lowest heat",
        "storage": "Store flat to prevent distortion of weave",
        "dry_clean": True,
        "notes": "Extremely delicate fabric — store away from rough surfaces.",
    },
    "satin": {
        "wash": "Hand wash cold or dry clean",
        "iron": "Iron on reverse side on low heat with pressing cloth",
        "storage": "Hang or fold with tissue paper",
        "dry_clean": False,
        "notes": "Avoid snags. Keep away from sharp jewelry when wearing.",
    },
    "polyester": {
        "wash": "Machine wash cold, gentle cycle",
        "iron": "Low heat only — polyester melts at high temperatures",
        "storage": "Fold or hang — low maintenance",
        "dry_clean": False,
        "notes": "Avoid high heat in dryer. Washes and dries quickly.",
    },
    "rayon": {
        "wash": "Hand wash cold or dry clean; avoid machine wash",
        "iron": "Low to medium heat with steam",
        "storage": "Hang to prevent wrinkles",
        "dry_clean": False,
        "notes": "May shrink in hot water. Do not wring. Air dry in shade.",
    },
    "unknown": {
        "wash": "Hand wash cold with mild detergent",
        "iron": "Test on a small area first; use medium heat",
        "storage": "Store in a cool, dry place",
        "dry_clean": False,
        "notes": "Fabric type unverified — treat as delicate until confirmed.",
    },
}

# ── Indian garment type classification rules ───────────────────────────────────

GARMENT_COLOR_RULES = {
    "bright_red": {"occasion_tags": ["festival", "wedding_guest"], "regional_style": "pan_india"},
    "white": {"occasion_tags": ["casual", "office", "temple"], "season_tags": ["summer"]},
    "dark_navy": {"occasion_tags": ["office", "formal"], "season_tags": ["winter"]},
    "golden": {"occasion_tags": ["festival", "wedding_guest", "formal"]},
    "pastel": {"occasion_tags": ["casual", "campus", "pooja"]},
}

GARMENT_TYPE_LABELS = [
    "saree", "salwar_suit", "kurta", "kurti", "lehenga",
    "anarkali", "indo_western", "churidar", "palazzo", "dupatta",
]

FABRIC_TYPE_LABELS = [
    "cotton", "silk", "linen", "georgette", "chiffon", "crepe",
    "velvet", "raw_silk", "banarasi", "kanjeevaram", "khadi",
    "net", "satin", "polyester", "rayon",
]


class GarmentClassifier:
    """
    AI garment classifier using HuggingFace ViT.
    Falls back to rule-based classification if model unavailable.
    """

    def __init__(self):
        self._pipeline = None
        self._model_loaded = False
        self._try_load_model()

    def _try_load_model(self):
        """Attempt to load the ViT model; fail gracefully."""
        try:
            from transformers import pipeline
            self._pipeline = pipeline(
                "image-classification",
                model="google/vit-base-patch16-224",
                top_k=5,
            )
            self._model_loaded = True
            logger.info("ViT model loaded successfully")
        except Exception as e:
            logger.warning(f"Could not load ViT model: {e}. Using rule-based fallback.")
            self._model_loaded = False

    async def classify(self, image_url: str) -> Dict[str, Any]:
        """
        Classify a garment from image URL.
        Returns classification results with confidence score.
        """
        if self._model_loaded:
            return await self._classify_with_vit(image_url)
        else:
            return await self._classify_rule_based(image_url)

    async def _classify_with_vit(self, image_url: str) -> Dict[str, Any]:
        """Classify using HuggingFace ViT model."""
        try:
            import aiohttp
            from PIL import Image

            async with aiohttp.ClientSession() as session:
                async with session.get(image_url) as response:
                    img_bytes = await response.read()

            image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            predictions = self._pipeline(image)

            # Map ViT predictions to Indian garment taxonomy
            result = self._map_vit_to_indian_taxonomy(predictions, image)
            return result

        except Exception as e:
            logger.error(f"ViT classification failed: {e}. Falling back to rule-based.")
            return await self._classify_rule_based(image_url)

    def _map_vit_to_indian_taxonomy(
        self, predictions: List[Dict], image=None
    ) -> Dict[str, Any]:
        """Map ViT ImageNet labels to Indian garment taxonomy."""
        top_label = predictions[0]["label"].lower() if predictions else ""
        confidence = predictions[0]["score"] if predictions else 0.5

        # Simple keyword mapping from ImageNet → Indian garments
        garment_type = "kurti"  # Default
        fabric_type = "cotton"  # Default

        clothing_keywords = {
            "gown": "anarkali", "dress": "anarkali", "skirt": "lehenga",
            "scarf": "dupatta", "shawl": "dupatta", "veil": "dupatta",
            "suit": "salwar_suit", "pajama": "salwar_suit",
        }

        for keyword, garment in clothing_keywords.items():
            if keyword in top_label:
                garment_type = garment
                break

        # Extract dominant color from image if available
        color_primary = "unknown"
        if image:
            color_primary = self._extract_dominant_color(image)

        return self._build_result(garment_type, fabric_type, color_primary, confidence)

    async def _classify_rule_based(self, image_url: str) -> Dict[str, Any]:
        """
        Rule-based fallback classifier using color histogram analysis.
        Provides reasonable defaults for Indian garments.
        """
        try:
            import aiohttp
            from PIL import Image
            import numpy as np

            async with aiohttp.ClientSession() as session:
                async with session.get(image_url) as response:
                    img_bytes = await response.read()

            image = Image.open(io.BytesIO(img_bytes)).convert("RGB").resize((200, 200))
            color_primary = self._extract_dominant_color(image)

            # Default classification with low confidence
            return self._build_result(
                garment_type="kurti",
                fabric_type="cotton",
                color_primary=color_primary,
                confidence=0.45,
            )
        except Exception as e:
            logger.error(f"Rule-based classification failed: {e}")
            return self._build_result("kurti", "cotton", "unknown", 0.3)

    def _extract_dominant_color(self, image) -> str:
        """Extract the dominant color from an image."""
        try:
            import numpy as np
            img_array = np.array(image)
            # Flatten and compute mean RGB
            mean_rgb = img_array.reshape(-1, 3).mean(axis=0).astype(int)
            r, g, b = mean_rgb

            # Map to color name
            if r > 200 and g < 100 and b < 100:
                return "red"
            elif r > 200 and g > 200 and b < 100:
                return "yellow"
            elif r < 100 and g > 150 and b < 100:
                return "green"
            elif r < 100 and g < 100 and b > 150:
                return "blue"
            elif r > 200 and g > 100 and b < 100:
                return "orange"
            elif r > 150 and g < 100 and b > 150:
                return "purple"
            elif r > 200 and g > 100 and b > 150:
                return "pink"
            elif r > 200 and g > 150 and b > 100:
                return "golden"
            elif r < 80 and g < 80 and b < 80:
                return "black"
            elif r > 200 and g > 200 and b > 200:
                return "white"
            else:
                return "multicolor"
        except Exception:
            return "unknown"

    def _build_result(
        self,
        garment_type: str,
        fabric_type: str,
        color_primary: str,
        confidence: float,
    ) -> Dict[str, Any]:
        """Build the classification result dict."""
        occasion_tags = self._infer_occasion_tags(garment_type, fabric_type)
        season_tags = self._infer_season_tags(fabric_type)
        care_profile = CARE_PROFILES.get(fabric_type, CARE_PROFILES["unknown"])

        return {
            "garment_type": garment_type,
            "fabric_type": fabric_type,
            "color_primary": color_primary,
            "color_accent": None,
            "occasion_tags": occasion_tags,
            "season_tags": season_tags,
            "regional_style": None,
            "confidence_score": round(confidence, 3),
            "care_profile": care_profile,
        }

    def _infer_occasion_tags(self, garment_type: str, fabric_type: str) -> List[str]:
        """Infer occasion tags from garment type and fabric."""
        tags = set()
        formal_garments = {"lehenga", "anarkali", "saree"}
        casual_garments = {"kurti", "kurta", "palazzo"}
        all_rounder = {"salwar_suit", "churidar", "indo_western"}

        if garment_type in formal_garments:
            tags.update(["festival", "wedding_guest", "formal"])
        elif garment_type in casual_garments:
            tags.update(["casual", "office", "campus"])
        elif garment_type in all_rounder:
            tags.update(["casual", "office", "festival", "pooja"])
        elif garment_type == "dupatta":
            tags.update(["festival", "pooja", "wedding_guest"])

        # Fabric-based adjustments
        if fabric_type in ("banarasi", "kanjeevaram", "velvet"):
            tags.discard("casual")
            tags.discard("campus")
            tags.update(["festival", "wedding_guest"])
        elif fabric_type in ("cotton", "khadi", "linen"):
            tags.update(["casual", "office"])

        return list(tags)

    def _infer_season_tags(self, fabric_type: str) -> List[str]:
        """Infer season suitability from fabric type."""
        FABRIC_SEASONS = {
            "cotton": ["summer", "monsoon"],
            "linen": ["summer", "monsoon"],
            "georgette": ["summer", "winter"],
            "chiffon": ["summer", "winter"],
            "crepe": ["summer", "monsoon", "winter"],
            "velvet": ["winter"],
            "raw_silk": ["winter"],
            "banarasi": ["winter"],
            "kanjeevaram": ["winter"],
            "khadi": ["summer", "monsoon", "winter"],
            "net": ["summer", "winter"],
            "satin": ["winter"],
            "polyester": ["winter"],
            "rayon": ["summer", "monsoon"],
        }
        return FABRIC_SEASONS.get(fabric_type, ["summer", "monsoon", "winter"])

    def get_care_profile(self, fabric_type: str) -> Dict[str, Any]:
        """Get care profile for a fabric type."""
        return CARE_PROFILES.get(fabric_type.lower(), CARE_PROFILES["unknown"])


# Singleton instance
classifier = GarmentClassifier()
