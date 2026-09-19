from dataclasses import dataclass
from typing import Literal

Condition = Literal["sunny", "cloudy", "humid", "rain", "foggy", "cold"]
Season = Literal["summer", "monsoon", "winter", "transition"]


@dataclass
class Weather:
    city: str
    temp_c: float
    feels_like_c: float
    humidity: int
    condition: Condition
    season: Season
    source: str  # "openweather" | "climatology"
    description: str = ""


def season_for(temp_c: float, condition: str, humidity: int) -> Season:
    """Indian season from live readings: rain/humidity beats temperature."""
    if condition == "rain" or (condition == "humid" and humidity >= 75):
        return "monsoon"
    if temp_c >= 31:
        return "summer"
    if temp_c <= 19:
        return "winter"
    return "transition"
