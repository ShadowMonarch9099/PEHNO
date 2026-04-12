"""
Outfit Engine — Multi-layer AI outfit generator
5 layers: Weather → Occasion → Color Harmony → Festival → Personalization
"""
import random
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta, date

logger = logging.getLogger(__name__)

# ── Color Harmony Rules ────────────────────────────────────────────────────────

COLOR_COMPLEMENTS = {
    "red": ["green", "white", "cream", "golden"],
    "blue": ["white", "golden", "orange", "cream"],
    "green": ["red", "golden", "white", "cream"],
    "yellow": ["purple", "blue", "navy", "black"],
    "orange": ["blue", "navy", "teal", "white"],
    "purple": ["yellow", "golden", "white", "cream"],
    "pink": ["white", "mint", "navy", "golden"],
    "white": ["any"],
    "cream": ["any"],
    "golden": ["maroon", "green", "navy", "red"],
    "maroon": ["golden", "cream", "beige"],
    "navy": ["golden", "white", "orange"],
    "black": ["golden", "red", "white"],
    "grey": ["pink", "red", "yellow"],
    "multicolor": ["white", "cream", "black"],
    "unknown": ["any"],
}

# ── Indian occasion-to-garment preference rules ────────────────────────────────

OCCASION_GARMENT_PREFERENCE = {
    "casual": ["kurti", "kurta", "palazzo", "salwar_suit", "churidar"],
    "office": ["salwar_suit", "kurti", "churidar", "indo_western"],
    "wedding_guest": ["saree", "lehenga", "anarkali", "salwar_suit"],
    "pooja": ["salwar_suit", "churidar", "saree", "kurti"],
    "festival": ["lehenga", "saree", "anarkali", "salwar_suit"],
    "formal": ["saree", "anarkali", "indo_western", "salwar_suit"],
    "night_out": ["indo_western", "anarkali", "saree", "lehenga"],
    "campus": ["kurti", "kurta", "polo", "palazzo", "churidar"],
    "temple": ["saree", "salwar_suit", "kurti", "churidar"],
}

OUTFIT_SETS = {
    # standard Indian outfit combinations
    "saree": ["saree", "dupatta"],
    "lehenga": ["lehenga", "dupatta"],
    "anarkali": ["anarkali"],
    "salwar_suit": ["salwar_suit"],
    "kurti": ["kurti", "palazzo"],
    "kurta": ["kurta", "salwar_suit"],
    "churidar": ["churidar"],
    "indo_western": ["indo_western"],
}


class OutfitEngine:
    """
    Multi-layer AI outfit generator.
    LAYER 1 — Weather filter
    LAYER 2 — Occasion filter
    LAYER 3 — Color harmony
    LAYER 4 — Festival override
    LAYER 5 — Personalization (ratings + recency penalty)
    """

    def __init__(
        self,
        garments: List[Any],  # Garment model instances
        weather: Dict[str, Any],
    ):
        self.garments = garments
        self.weather = weather
        self.today = datetime.utcnow()

    def generate_daily(self) -> Tuple[List[str], str]:
        """
        Generate today's recommended outfit.
        Returns (garment_ids, reason_string).
        """
        # Layer 1: Weather filter
        weather_filtered = self._layer1_weather_filter()

        # Layer 2: Occasion filter (casual for daily)
        occasion_filtered = self._layer2_occasion_filter(weather_filtered, "casual")

        # Layer 4: Festival override
        festival_boosted = self._layer4_festival_boost(occasion_filtered)

        # Layer 5: Personalization
        scored = self._layer5_personalization(festival_boosted)

        if not scored:
            return [], "Not enough garments classified yet."

        outfit_garments = self._build_outfit_set(scored)
        reason = self._build_reason_string(outfit_garments, "casual")

        return [str(g.id) for g in outfit_garments], reason

    def generate_for_occasion(
        self, occasion: str, festival: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Generate 3 outfit options for a specific occasion.
        Returns list of {garment_ids, reason} dicts.
        """
        options = []

        # Layer 1: Weather filter
        weather_filtered = self._layer1_weather_filter()

        # Layer 2: Occasion filter
        occasion_filtered = self._layer2_occasion_filter(weather_filtered, occasion)

        # Layer 4: Festival override
        if festival:
            occasion_filtered = self._layer4_festival_boost(occasion_filtered)

        # Generate 3 different outfit combinations
        used_ids = set()
        for _ in range(3):
            available = [g for g in occasion_filtered if str(g.id) not in used_ids]
            if not available:
                break

            # Layer 5: Personalization
            scored = self._layer5_personalization(available)
            outfit_garments = self._build_outfit_set(scored)

            if outfit_garments:
                garment_ids = [str(g.id) for g in outfit_garments]
                options.append({
                    "garment_ids": garment_ids,
                    "reason": self._build_reason_string(outfit_garments, occasion),
                })
                used_ids.update(garment_ids)

        return options

    # ── Layer 1 — Weather Filter ────────────────────────────────────────────────

    def _layer1_weather_filter(self) -> List[Any]:
        """Filter garments by weather-appropriate fabrics."""
        avoid_fabrics = set(self.weather.get("avoid_fabrics", []))
        recommended = set(self.weather.get("recommended_fabrics", []))

        filtered = []
        for g in self.garments:
            if g.fabric_type in avoid_fabrics:
                continue
            filtered.append(g)

        return filtered if filtered else self.garments  # Fallback: all garments

    # ── Layer 2 — Occasion Filter ───────────────────────────────────────────────

    def _layer2_occasion_filter(self, garments: List[Any], occasion: str) -> List[Any]:
        """Filter garments matching the target occasion."""
        filtered = [
            g for g in garments
            if occasion in (g.occasion_tags or [])
        ]
        return filtered if filtered else garments  # Fallback: all

    # ── Layer 3 — Color Harmony ─────────────────────────────────────────────────

    def _layer3_color_harmony_score(
        self, garment: Any, other_garments: List[Any]
    ) -> float:
        """Score a garment based on color harmony with others."""
        if not other_garments:
            return 1.0

        score = 0.0
        for other in other_garments:
            base_color = garment.color_primary or "unknown"
            complement_colors = COLOR_COMPLEMENTS.get(base_color, ["any"])

            if "any" in complement_colors:
                score += 1.0
            elif (other.color_primary or "unknown") in complement_colors:
                score += 1.0
            else:
                score += 0.3  # Partial score for non-complementary

        return score / len(other_garments)

    # ── Layer 4 — Festival Override ─────────────────────────────────────────────

    def _layer4_festival_boost(self, garments: List[Any]) -> List[Any]:
        """
        Boost festival-appropriate garments if a festival is within 3 days.
        Festival tags get priority ordering (not filtered out).
        """
        # Check for upcoming festival (simplified — in production use festival_service)
        festival_garments = [
            g for g in garments if "festival" in (g.occasion_tags or [])
        ]
        non_festival = [
            g for g in garments if "festival" not in (g.occasion_tags or [])
        ]

        # Festival items first, then others
        return festival_garments + non_festival

    # ── Layer 5 — Personalization ───────────────────────────────────────────────

    def _layer5_personalization(self, garments: List[Any]) -> List[Any]:
        """
        Score garments for personalization:
        - Boost: higher-rated outfits (implicit from wear count + care)
        - Penalize: recently worn items (worn in last 7 days)
        """
        scored = []
        for g in garments:
            score = 1.0

            # Penalize recently worn
            if g.last_worn_at:
                days_ago = (self.today - g.last_worn_at).days
                if days_ago < 3:
                    score -= 0.5
                elif days_ago < 7:
                    score -= 0.2

            # Boost user-verified garments (better quality data)
            if g.user_verified:
                score += 0.3

            # Slight penalty for high wear count (encourage variety)
            if (g.wear_count or 0) > 10:
                score -= 0.1

            # Boost garments in good/new condition
            if hasattr(g, 'condition') and g.condition:
                condition_val = g.condition.value if hasattr(g.condition, 'value') else g.condition
                if condition_val == "new":
                    score += 0.2
                elif condition_val == "worn":
                    score -= 0.1

            scored.append((score, g))

        # Sort by score descending, with randomization for variety
        scored.sort(key=lambda x: x[0] + random.uniform(0, 0.1), reverse=True)
        return [g for _, g in scored]

    # ── Outfit Assembly ─────────────────────────────────────────────────────────

    def _build_outfit_set(self, scored_garments: List[Any]) -> List[Any]:
        """
        Build a complete outfit set from scored garments.
        Tries to create complementary combinations (top + bottom + dupatta).
        """
        if not scored_garments:
            return []

        outfit = []
        used_types = set()

        for garment in scored_garments:
            garment_type = garment.garment_type or "unknown"

            # Skip duplicates of same garment type
            if garment_type in used_types:
                continue

            # Avoid too many pieces (max 3 for clean outfit)
            if len(outfit) >= 3:
                break

            # Check color harmony with existing outfit pieces
            if outfit:
                harmony = self._layer3_color_harmony_score(garment, outfit)
                if harmony < 0.3:
                    continue  # Poor color match

            outfit.append(garment)
            used_types.add(garment_type)

        return outfit

    def _build_reason_string(
        self, garments: List[Any], occasion: str
    ) -> str:
        """Build a human-readable reason string for the outfit."""
        temp = self.weather.get("temperature_celsius", 28)
        condition = self.weather.get("condition", "pleasant")
        city = self.weather.get("city", "your city")

        if not garments:
            return "Curated from your wardrobe"

        types = [g.garment_type for g in garments if g.garment_type]
        fabric = garments[0].fabric_type if garments else "breathable fabric"

        return (
            f"Perfect for {int(temp)}°C {condition.lower()} weather in {city}. "
            f"{fabric.capitalize()} is ideal for today's conditions. "
            f"Great for {occasion.replace('_', ' ')} occasions."
        )
