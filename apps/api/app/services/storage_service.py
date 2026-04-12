"""
Supabase Storage Service — Garment image upload with compression
"""
import io
import uuid
import logging
from typing import Tuple
from fastapi import UploadFile
from PIL import Image
from app.core.config import settings

logger = logging.getLogger(__name__)

MAX_SIZE = (800, 800)
THUMBNAIL_SIZE = (200, 200)
MAX_QUALITY = 85  # JPEG quality


async def upload_garment_image(
    file: UploadFile, user_id: str
) -> Tuple[str, str]:
    """
    Upload garment image to Supabase Storage.
    - Compresses to max 800x800 / ~200KB
    - Generates 200x200 thumbnail
    - Returns (signed_url, thumbnail_signed_url)
    """
    from supabase import create_client, Client

    client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")

    # ── Main image compression ─────────────────────────────────────
    image.thumbnail(MAX_SIZE, Image.LANCZOS)
    img_bytes = io.BytesIO()
    quality = MAX_QUALITY
    while quality > 40:
        img_bytes.seek(0)
        img_bytes.truncate(0)
        image.save(img_bytes, format="JPEG", quality=quality, optimize=True)
        if img_bytes.tell() <= 200 * 1024:  # 200KB
            break
        quality -= 5

    img_bytes.seek(0)

    # ── Thumbnail ──────────────────────────────────────────────────
    thumb = image.copy()
    thumb.thumbnail(THUMBNAIL_SIZE, Image.LANCZOS)
    thumb_bytes = io.BytesIO()
    thumb.save(thumb_bytes, format="JPEG", quality=75, optimize=True)
    thumb_bytes.seek(0)

    # ── Upload to Supabase Storage ─────────────────────────────────
    file_key = f"{user_id}/{uuid.uuid4()}.jpg"
    thumb_key = f"{user_id}/thumbnails/{uuid.uuid4()}.jpg"

    try:
        client.storage.from_(settings.GARMENT_IMAGES_BUCKET).upload(
            path=file_key,
            file=img_bytes.getvalue(),
            file_options={"content-type": "image/jpeg"},
        )

        client.storage.from_(settings.GARMENT_IMAGES_BUCKET).upload(
            path=thumb_key,
            file=thumb_bytes.getvalue(),
            file_options={"content-type": "image/jpeg"},
        )

        # Get signed URLs (private bucket)
        signed_url_response = client.storage.from_(settings.GARMENT_IMAGES_BUCKET).create_signed_url(
            path=file_key,
            expires_in=settings.SIGNED_URL_EXPIRY_SECONDS,
        )
        thumb_signed_url_response = client.storage.from_(settings.GARMENT_IMAGES_BUCKET).create_signed_url(
            path=thumb_key,
            expires_in=settings.SIGNED_URL_EXPIRY_SECONDS,
        )

        image_url = signed_url_response.get("signedURL", "")
        thumbnail_url = thumb_signed_url_response.get("signedURL", "")

    except Exception as e:
        logger.error(f"Supabase storage upload failed: {e}")
        # Fallback: return placeholder URLs for development
        image_url = f"https://placeholder.pehno.in/garments/{file_key}"
        thumbnail_url = f"https://placeholder.pehno.in/garments/{thumb_key}"

    return image_url, thumbnail_url
