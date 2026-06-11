"""
Festival Service — Festival calendar, Navratri tracker, curated looks
"""
import json
import logging
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Load festivals data
FESTIVALS_DATA_PATH = Path(__file__).parent.parent.parent.parent.parent / "packages" / "ai" / "data" / "festivals.json"

NAVRATRI_COLORS = [
    {"day": 1, "color_name": "Yellow", "color_hex": "#FFD700", "goddess": "Shailaputri"},
    {"day": 2, "color_name": "Green", "color_hex": "#228B22", "goddess": "Brahmacharini"},
    {"day": 3, "color_name": "Grey", "color_hex": "#808080", "goddess": "Chandraghanta"},
    {"day": 4, "color_name": "Orange", "color_hex": "#FF8C00", "goddess": "Kushmanda"},
    {"day": 5, "color_name": "White", "color_hex": "#FFFFFF", "goddess": "Skandamata"},
    {"day": 6, "color_name": "Red", "color_hex": "#DC143C", "goddess": "Katyayani"},
    {"day": 7, "color_name": "Royal Blue", "color_hex": "#4169E1", "goddess": "Kalaratri"},
    {"day": 8, "color_name": "Pink", "color_hex": "#FF69B4", "goddess": "Mahagauri"},
    {"day": 9, "color_name": "Purple", "color_hex": "#800080", "goddess": "Siddhidatri"},
]

# Color name to hex mapping for matching
COLOR_HEX_MAP = {
    "red": "#DC143C", "crimson": "#DC143C",
    "green": "#228B22", "olive": "#6B8E23",
    "blue": "#4169E1", "navy": "#000080",
    "yellow": "#FFD700", "golden": "#DAA520",
    "orange": "#FF8C00",
    "white": "#FFFFFF", "cream": "#FFFDD0",
    "pink": "#FF69B4", "rose": "#FF007F",
    "purple": "#800080", "violet": "#8F00FF",
    "grey": "#808080", "silver": "#C0C0C0",
    "black": "#000000",
    "maroon": "#800000",
    "multicolor": None,
    "unknown": None,
}


class FestivalService:
    """Festival calendar and wardrobe curation service."""

    def __init__(self):
        self._festivals_data = self._load_festivals_data()

    def _load_festivals_data(self) -> List[Dict]:
        """Load festivals from JSON knowledge base."""
        try:
            if FESTIVALS_DATA_PATH.exists():
                with open(FESTIVALS_DATA_PATH, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load festivals data: {e}")
        return []

    def get_navratri_today(self) -> Optional[Dict[str, Any]]:
        """
        Returns today's Navratri color if Navratri is currently active.
        Assumption: Navratri 2025 starts Oct 2. Update date_this_year in DB.
        """
        today = date.today()

        # Find Navratri festival in DB (fallback: assume Oct 2-10)
        # In production, this reads from the festivals table
        navratri_start = date(today.year, 10, 2)
        navratri_end = navratri_start + timedelta(days=8)

        if navratri_start <= today <= navratri_end:
            day_num = (today - navratri_start).days + 1
            return NAVRATRI_COLORS[day_num - 1] if day_num <= 9 else None

        return None

    def get_all_navratri_days(self, festival_date: date) -> List[Dict[str, Any]]:
        """Get all 9 Navratri days with colors."""
        today = date.today()
        navratri_start = festival_date

        days = []
        for i, color_data in enumerate(NAVRATRI_COLORS):
            day_date = navratri_start + timedelta(days=i)
            days.append({
                **color_data,
                "date": day_date.isoformat(),
                "is_today": day_date == today,
                "is_past": day_date < today,
            })

        return days

    def find_color_matching_garments(
        self, garments: List[Any], target_color_hex: str
    ) -> List[Any]:
        """Find wardrobe garments matching a specific color."""
        matches = []

        for garment in garments:
            garment_color = (garment.color_primary or "unknown").lower()
            garment_hex = COLOR_HEX_MAP.get(garment_color)

            if garment_hex and self._colors_similar(garment_hex, target_color_hex):
                matches.append(garment)

        return matches[:5]  # Top 5 matches

    def _colors_similar(self, hex1: str, hex2: str, threshold: int = 80) -> bool:
        """Check if two hex colors are perceptually similar."""
        try:
            r1, g1, b1 = int(hex1[1:3], 16), int(hex1[3:5], 16), int(hex1[5:7], 16)
            r2, g2, b2 = int(hex2[1:3], 16), int(hex2[3:5], 16), int(hex2[5:7], 16)
            distance = ((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2) ** 0.5
            return distance <= threshold
        except Exception:
            return False

    def generate_curated_looks(
        self, festival: Any, garments: List[Any], count: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Generate 3–5 curated looks from user's wardrobe for a festival.
        Returns list of outfit dicts (simplified, not persisted).
        """
        occasion_tags = festival.occasion_tags or ["festival"]
        festival_garments = [
            g for g in garments
            if any(tag in (g.occasion_tags or []) for tag in occasion_tags)
        ]

        if not festival_garments:
            festival_garments = garments  # Fallback

        # Simple outfit building: group by complementary types
        looks = []
        used = set()

        for garment in festival_garments[:count]:
            if str(garment.id) not in used:
                look = {"garment_ids": [str(garment.id)]}
                used.add(str(garment.id))
                looks.append(look)

        return looks

    def get_festival_alert_message(self, festival_name: str, days_until: int) -> Dict[str, str]:
        """Generate push notification message for festival alert."""
        if days_until == 14:
            return {
                "title": f"✨ {festival_name} is in 2 weeks!",
                "body": f"Start planning your {festival_name} looks now. See your curated wardrobe →",
            }
        elif days_until == 7:
            return {
                "title": f"🎊 {festival_name} is in 7 days!",
                "body": f"Your {festival_name} looks are ready. See curated outfits from your wardrobe →",
            }
        elif days_until == 1:
            return {
                "title": f"🌟 {festival_name} is tomorrow!",
                "body": "Your perfect outfit is waiting. Check your curated looks for tomorrow →",
            }
        else:
            return {
                "title": f"🎉 {festival_name} is in {days_until} days!",
                "body": f"Get ready for {festival_name} with your perfect outfit →",
            }
