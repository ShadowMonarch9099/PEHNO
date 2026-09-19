"""
get_weather(city): live OpenWeather when a key is configured (30-minute cache),
climatology otherwise or on any failure.
"""
import logging
import time
from datetime import date

from app.core.config import settings
from app.services.weather.base import Season, Weather
from app.services.weather.climatology import climatology_weather
from app.services.weather.openweather import openweather_weather

log = logging.getLogger(__name__)
_cache: dict[str, tuple[float, Weather]] = {}
CACHE_SECONDS = 1800


async def get_weather(city: str, on: date | None = None) -> Weather:
    """
    Weather for `city`. For dates beyond a live forecast's reach (> 3 days out)
    the monthly climatology is the best available estimate.
    """
    if on is not None and (on - date.today()).days > 3:
        return climatology_weather(city, on)
    if not settings.OPENWEATHER_API_KEY:
        return climatology_weather(city, on)
    key = city.lower()
    hit = _cache.get(key)
    if hit and time.monotonic() - hit[0] < CACHE_SECONDS:
        return hit[1]
    try:
        w = await openweather_weather(city, settings.OPENWEATHER_API_KEY)
        _cache[key] = (time.monotonic(), w)
        return w
    except Exception as e:  # network / quota / bad city → degrade gracefully
        log.warning("OpenWeather failed for %s (%s); using climatology", city, e)
        return climatology_weather(city)


__all__ = ["get_weather", "Weather", "Season"]
