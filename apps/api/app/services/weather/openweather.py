"""
OpenWeatherMap current-conditions client (by lat/lon from cities.json).
"""
import httpx

from app import knowledge
from app.services.weather.base import Condition, Weather, season_for

_URL = "https://api.openweathermap.org/data/2.5/weather"


def _condition(main: str, humidity: int) -> Condition:
    m = main.lower()
    if m in ("rain", "drizzle", "thunderstorm"):
        return "rain"
    if m in ("mist", "fog", "haze", "smoke"):
        return "foggy"
    if m in ("clouds",):
        return "humid" if humidity >= 75 else "cloudy"
    return "humid" if humidity >= 80 else "sunny"


async def openweather_weather(city: str, api_key: str) -> Weather:
    coords = next((c for c in knowledge.cities() if c["name"].lower() == city.lower()), None)
    params = {"appid": api_key, "units": "metric"}
    if coords:
        params.update(lat=coords["lat"], lon=coords["lon"])
    else:
        params["q"] = f"{city},IN"
    async with httpx.AsyncClient(timeout=8) as client:
        r = await client.get(_URL, params=params)
        r.raise_for_status()
        d = r.json()
    humidity = int(d["main"]["humidity"])
    temp = float(d["main"]["temp"])
    cond = _condition(d["weather"][0]["main"], humidity)
    return Weather(
        city=city,
        temp_c=temp,
        feels_like_c=float(d["main"].get("feels_like", temp)),
        humidity=humidity,
        condition=cond,
        season=season_for(temp, cond, humidity),
        source="openweather",
        description=d["weather"][0].get("description", "").capitalize(),
    )
