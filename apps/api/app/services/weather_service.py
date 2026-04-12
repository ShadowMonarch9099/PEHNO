"""
Weather Service — OpenWeatherMap API client
"""
import aiohttp
import logging
from typing import Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Fabric recommendation mapping ─────────────────────────────────────────────

WEATHER_FABRIC_MAP = {
    "hot_humid": {
        "recommended": ["cotton", "linen", "rayon", "khadi"],
        "avoid": ["velvet", "banarasi", "kanjeevaram", "polyester", "satin"],
        "note": "Breathable, moisture-wicking fabrics essential",
    },
    "hot_dry": {
        "recommended": ["cotton", "linen", "chiffon", "georgette"],
        "avoid": ["velvet", "banarasi", "polyester"],
        "note": "Lightweight, breathable fabrics — avoid dark colors",
    },
    "warm_pleasant": {
        "recommended": ["cotton", "crepe", "georgette", "chiffon", "rayon"],
        "avoid": ["velvet", "banarasi"],
        "note": "Most fabrics comfortable — great for formal occasions",
    },
    "cool": {
        "recommended": ["crepe", "raw_silk", "georgette", "satin", "linen"],
        "avoid": ["net"],
        "note": "Light layering with stoles or dupattas recommended",
    },
    "cold": {
        "recommended": ["velvet", "raw_silk", "banarasi", "kanjeevaram", "satin", "crepe"],
        "avoid": ["cotton", "linen", "chiffon", "net"],
        "note": "Rich, warm fabrics — perfect weather for heavy ethnic wear",
    },
    "rainy": {
        "recommended": ["cotton", "rayon", "polyester", "crepe"],
        "avoid": ["silk", "banarasi", "kanjeevaram", "net", "chiffon"],
        "note": "Avoid delicate fabrics — moisture damages silk and zari",
    },
}

# City to OpenWeatherMap city name mapping
CITY_MAP = {
    "Bengaluru": "Bangalore",
    "Mumbai": "Mumbai",
    "Delhi": "New Delhi",
    "Chennai": "Chennai",
    "Kolkata": "Kolkata",
    "Hyderabad": "Hyderabad",
    "Pune": "Pune",
    "Ahmedabad": "Ahmedabad",
    "Jaipur": "Jaipur",
    "Lucknow": "Lucknow",
    "Chandigarh": "Chandigarh",
    "Kochi": "Kochi",
    "Bhopal": "Bhopal",
    "Indore": "Indore",
    "Nagpur": "Nagpur",
    "Patna": "Patna",
    "Bhubaneswar": "Bhubaneswar",
    "Surat": "Surat",
    "Coimbatore": "Coimbatore",
    "Visakhapatnam": "Visakhapatnam",
}


class WeatherService:
    """OpenWeatherMap API client with fabric recommendation logic."""

    BASE_URL = "https://api.openweathermap.org/data/2.5/weather"

    async def get_weather(self, city: str) -> Dict[str, Any]:
        """
        Fetch current weather for a city.
        Returns standardized weather dict.
        """
        owm_city = CITY_MAP.get(city, city)

        try:
            async with aiohttp.ClientSession() as session:
                params = {
                    "q": f"{owm_city},IN",
                    "appid": settings.OPENWEATHER_API_KEY,
                    "units": "metric",
                }
                async with session.get(self.BASE_URL, params=params, timeout=aiohttp.ClientTimeout(total=5)) as response:
                    if response.status != 200:
                        logger.warning(f"Weather API returned {response.status} for {city}")
                        return self._default_weather(city)

                    data = await response.json()
                    return self._parse_weather(data, city)

        except Exception as e:
            logger.error(f"Weather fetch failed for {city}: {e}")
            return self._default_weather(city)

    def _parse_weather(self, data: Dict, city: str) -> Dict[str, Any]:
        """Parse OpenWeatherMap response."""
        temp = data["main"]["temp"]
        humidity = data["main"]["humidity"]
        condition = data["weather"][0]["main"]
        description = data["weather"][0]["description"]
        icon = data["weather"][0]["icon"]

        fabric_category = self._get_fabric_category(temp, humidity, condition)
        fabric_rec = WEATHER_FABRIC_MAP.get(fabric_category, WEATHER_FABRIC_MAP["warm_pleasant"])

        return {
            "city": city,
            "temperature_celsius": round(temp, 1),
            "feels_like": round(data["main"]["feels_like"], 1),
            "humidity": humidity,
            "condition": condition,
            "description": description,
            "icon": icon,
            "fabric_category": fabric_category,
            "recommended_fabrics": fabric_rec["recommended"],
            "avoid_fabrics": fabric_rec["avoid"],
            "fabric_note": fabric_rec["note"],
        }

    def _get_fabric_category(self, temp: float, humidity: int, condition: str) -> str:
        """Map weather to fabric category."""
        if condition.lower() in ("rain", "drizzle", "thunderstorm"):
            return "rainy"
        elif temp >= 32 and humidity >= 70:
            return "hot_humid"
        elif temp >= 32:
            return "hot_dry"
        elif 24 <= temp < 32:
            return "warm_pleasant"
        elif 15 <= temp < 24:
            return "cool"
        else:
            return "cold"

    def _default_weather(self, city: str) -> Dict[str, Any]:
        """Return reasonable default weather when API is unavailable."""
        return {
            "city": city,
            "temperature_celsius": 28.0,
            "feels_like": 30.0,
            "humidity": 65,
            "condition": "Clear",
            "description": "clear sky",
            "icon": "01d",
            "fabric_category": "warm_pleasant",
            "recommended_fabrics": ["cotton", "crepe", "georgette"],
            "avoid_fabrics": ["velvet", "banarasi"],
            "fabric_note": "Typical warm Indian day — light breathable fabrics recommended",
        }
