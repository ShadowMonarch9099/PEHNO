"""
No-model backend: makes no type/fabric guess. Colour, care and (once the user
picks a type) occasions/seasons still work — this is the manual-fallback path
the build plan asks for, and what CI runs.
"""
from PIL import Image

from app.services.classifier.base import VisionBackend, VisionOutput


class RulesBackend(VisionBackend):
    name = "rules"

    def predict(self, image: Image.Image) -> VisionOutput:
        return VisionOutput()
