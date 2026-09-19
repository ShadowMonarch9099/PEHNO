"""
Classifier contracts. A VisionBackend only ranks garment types and fabrics;
colour, occasions, seasons and care are derived deterministically on top.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field

from PIL import Image


@dataclass
class Prediction:
    label: str
    confidence: float  # 0..1


@dataclass
class VisionOutput:
    garment_types: list[Prediction] = field(default_factory=list)  # ranked, best first
    fabrics: list[Prediction] = field(default_factory=list)


@dataclass
class ClassificationResult:
    garment_type: str
    fabric_type: str
    color_primary: str
    color_accent: str | None
    occasion_tags: list[str]
    season_tags: list[str]
    regional_style: str | None
    care_profile: dict
    confidence: float
    backend: str
    candidates: dict  # {"garment_types": [...], "fabrics": [...]} for the feedback loop


class VisionBackend(ABC):
    name: str = "base"

    @abstractmethod
    def predict(self, image: Image.Image) -> VisionOutput:
        ...
