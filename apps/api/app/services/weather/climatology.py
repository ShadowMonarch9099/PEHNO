"""
Offline fallback: typical weather for the city's region and month from
packages/ai/data/climatology.json. Always available; never wrong by much.
"""
from datetime import date

from app import knowledge
from app.services.weather.base import Weather, season_for

_CITY_REGION: dict[str, str] | None = None


def region_for_city(city: str) -> str:
    global _CITY_REGION
    if _CITY_REGION is None:
        _CITY_REGION = {c["name"].lower(): c["region"] for c in knowledge.cities()}
    return _CITY_REGION.get(city.lower(), "west")


def climatology_weather(city: str, on: date | None = None) -> Weather:
    on = on or date.today()
    table = knowledge.load("climatology")
    temp, condition, humidity = table[region_for_city(city)][str(on.month)]
    return Weather(
        city=city,
        temp_c=float(temp),
        feels_like_c=float(temp + (3 if humidity >= 75 else 0)),
        humidity=int(humidity),
        condition=condition,
        season=season_for(temp, condition, humidity),
        source="climatology",
        description=f"Typical {on.strftime('%B')} weather for {city}",
    )
