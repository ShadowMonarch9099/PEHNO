"""
Fine-tuned ViT backend (garment type). Loads the checkpoint produced by
packages/ai/training/train_vit.py. Fabric ranking is delegated to CLIP zero-shot
until a fabric head is trained.
"""
import logging
import threading
from pathlib import Path

from PIL import Image

from app.core.config import settings
from app.services.classifier.base import Prediction, VisionBackend, VisionOutput
from app.services.classifier.zero_shot import ZeroShotBackend

log = logging.getLogger(__name__)


class ViTBackend(VisionBackend):
    name = "vit"

    def __init__(self, model_dir: str | None = None) -> None:
        self.model_dir = Path(model_dir or settings.VIT_MODEL_DIR)
        if not self.model_dir.is_absolute():
            self.model_dir = (Path(__file__).resolve().parents[3] / self.model_dir).resolve()
        self._lock = threading.Lock()
        self._model = None
        self._processor = None
        self._fabric = ZeroShotBackend()

    def _ensure_loaded(self) -> None:
        if self._model is not None:
            return
        with self._lock:
            if self._model is not None:
                return
            from transformers import AutoImageProcessor, AutoModelForImageClassification

            if not self.model_dir.exists():
                raise FileNotFoundError(
                    f"No fine-tuned model at {self.model_dir}; run packages/ai/training/train_vit.py"
                )
            log.info("Loading fine-tuned ViT from %s", self.model_dir)
            self._processor = AutoImageProcessor.from_pretrained(self.model_dir)
            self._model = (
                AutoModelForImageClassification.from_pretrained(self.model_dir)
                .to(settings.CLASSIFIER_DEVICE)
                .eval()
            )

    def predict(self, image: Image.Image) -> VisionOutput:
        self._ensure_loaded()
        import torch

        inputs = self._processor(images=image.convert("RGB"), return_tensors="pt").to(
            settings.CLASSIFIER_DEVICE
        )
        with torch.no_grad():
            probs = self._model(**inputs).logits.softmax(dim=-1)[0]
        id2label = self._model.config.id2label
        order = torch.argsort(probs, descending=True).tolist()
        types = [Prediction(id2label[i], float(probs[i])) for i in order]
        return VisionOutput(garment_types=types, fabrics=self._fabric.predict(image).fabrics)
