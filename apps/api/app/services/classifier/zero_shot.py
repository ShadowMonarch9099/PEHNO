"""
CLIP zero-shot backend. Ranks the Indian garment taxonomy and fabric list by
image–text similarity. Needs no training data, so it's the MVP model until a
fine-tuned ViT exists (packages/ai/training). Model loads lazily on first use.

Default model: patrickjohncyh/fashion-clip (CLIP fine-tuned on fashion product
images). Any HF CLIP checkpoint works via HF_CLIP_MODEL.
"""
import logging
import threading

from PIL import Image

from app import knowledge
from app.core.config import settings
from app.services.classifier.base import Prediction, VisionBackend, VisionOutput

log = logging.getLogger(__name__)

# Prompt ensembles: several phrasings per label, averaged in embedding space.
_TYPE_TEMPLATES = (
    "a photo of a {label}, an Indian garment",
    "a product photo of a {label}",
    "a woman wearing a {label}",
)
_TYPE_HINTS: dict[str, str] = {
    "saree": "saree, a long draped Indian sari with pallu",
    "salwar_suit": "salwar kameez suit, a tunic with loose trousers",
    "kurta": "kurta, a long straight Indian tunic",
    "kurti": "kurti, a short Indian tunic top",
    "dupatta": "dupatta, a long Indian scarf or stole",
    "lehenga": "lehenga choli, a flared embroidered Indian skirt with blouse",
    "palazzo": "palazzo pants, wide-leg trousers",
    "anarkali": "anarkali, a long flared frock-style Indian dress",
    "indo_western": "indo-western fusion outfit, an Indian ethnic garment with western cut",
    "churidar": "churidar, tight Indian trousers gathered at the ankle",
}
_FABRIC_TEMPLATES = (
    "a close-up photo of {label} fabric clothing",
    "a garment made of {label}",
)
_FABRIC_HINTS: dict[str, str] = {
    "banarasi": "banarasi silk brocade with gold zari",
    "kanjeevaram": "kanjeevaram silk with contrast temple border",
    "raw_silk": "raw silk with a slubbed texture",
    "khadi": "handspun khadi cotton",
    "net": "sheer net tulle",
    "georgette": "lightweight crinkled georgette",
    "chiffon": "sheer flowing chiffon",
    "velvet": "plush velvet",
    "silk": "smooth glossy silk",
}


class ZeroShotBackend(VisionBackend):
    name = "zero_shot"

    def __init__(self, model_name: str | None = None, device: str | None = None) -> None:
        self.model_name = model_name or settings.HF_CLIP_MODEL
        self.device = device or settings.CLASSIFIER_DEVICE
        self._lock = threading.Lock()
        self._model = None
        self._processor = None
        self._type_labels: list[str] = []
        self._fabric_labels: list[str] = []
        self._type_text = None
        self._fabric_text = None

    # ── lazy model load ────────────────────────────────────────────────────
    def _ensure_loaded(self) -> None:
        if self._model is not None:
            return
        with self._lock:
            if self._model is not None:
                return
            import torch
            from transformers import CLIPModel, CLIPProcessor

            log.info("Loading CLIP model %s on %s", self.model_name, self.device)
            model = CLIPModel.from_pretrained(self.model_name).to(self.device).eval()
            processor = CLIPProcessor.from_pretrained(self.model_name)

            self._type_labels = [g["slug"] for g in knowledge.garment_types()]
            self._fabric_labels = sorted(knowledge.fabric_slugs())

            def embed(labels: list[str], templates: tuple[str, ...], hints: dict[str, str]):
                feats = []
                for slug in labels:
                    phrase = hints.get(slug, slug.replace("_", " "))
                    prompts = [t.format(label=phrase) for t in templates]
                    inputs = processor(text=prompts, return_tensors="pt", padding=True).to(
                        self.device
                    )
                    with torch.no_grad():
                        e = model.get_text_features(**inputs)
                    e = e / e.norm(dim=-1, keepdim=True)
                    feats.append(e.mean(dim=0))
                stacked = torch.stack(feats)
                return stacked / stacked.norm(dim=-1, keepdim=True)

            self._type_text = embed(self._type_labels, _TYPE_TEMPLATES, _TYPE_HINTS)
            self._fabric_text = embed(self._fabric_labels, _FABRIC_TEMPLATES, _FABRIC_HINTS)
            self._processor = processor
            self._model = model

    # ── inference ──────────────────────────────────────────────────────────
    def predict(self, image: Image.Image) -> VisionOutput:
        self._ensure_loaded()
        import torch

        inputs = self._processor(images=image.convert("RGB"), return_tensors="pt").to(self.device)
        with torch.no_grad():
            img = self._model.get_image_features(**inputs)
        img = img / img.norm(dim=-1, keepdim=True)
        scale = self._model.logit_scale.exp()

        def rank(text_feats, labels: list[str]) -> list[Prediction]:
            probs = (scale * img @ text_feats.T).softmax(dim=-1)[0]
            order = torch.argsort(probs, descending=True)
            return [Prediction(labels[i], float(probs[i])) for i in order.tolist()]

        return VisionOutput(
            garment_types=rank(self._type_text, self._type_labels),
            fabrics=rank(self._fabric_text, self._fabric_labels),
        )
