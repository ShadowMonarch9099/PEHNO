"""
Garment image processing: validate → auto-orient → RGB → resize → JPEG under a
size budget, plus a square thumbnail. Pure CPU; call via run_in_threadpool.
"""
import io
from dataclasses import dataclass

from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import settings

ACCEPTED_FORMATS = {"JPEG", "PNG", "WEBP", "HEIF"}


class InvalidImageError(ValueError):
    pass


@dataclass
class ProcessedImage:
    full: bytes
    thumbnail: bytes
    width: int
    height: int


def _to_jpeg(img: Image.Image, target_bytes: int) -> bytes:
    """Encode as JPEG, stepping quality down until under target (floor 55)."""
    for quality in (88, 80, 72, 64, 55):
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=quality, optimize=True, progressive=True)
        if buf.tell() <= target_bytes:
            break
    return buf.getvalue()


def process_garment_image(data: bytes) -> ProcessedImage:
    if len(data) > settings.MAX_UPLOAD_BYTES:
        raise InvalidImageError(
            f"Image is larger than {settings.MAX_UPLOAD_BYTES // (1024 * 1024)} MB"
        )
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except (UnidentifiedImageError, OSError) as e:
        raise InvalidImageError("File is not a supported image (JPEG, PNG, WEBP)") from e
    if img.format not in ACCEPTED_FORMATS:
        raise InvalidImageError(f"Unsupported image format: {img.format}")

    img = ImageOps.exif_transpose(img) or img  # respect phone orientation
    if img.mode != "RGB":
        img = img.convert("RGB")

    full = img.copy()
    full.thumbnail((settings.IMAGE_MAX_SIDE, settings.IMAGE_MAX_SIDE), Image.LANCZOS)

    thumb = ImageOps.fit(img, (settings.THUMBNAIL_SIDE, settings.THUMBNAIL_SIDE), Image.LANCZOS)

    return ProcessedImage(
        full=_to_jpeg(full, settings.IMAGE_TARGET_BYTES),
        thumbnail=_to_jpeg(thumb, 60 * 1024),
        width=full.width,
        height=full.height,
    )
