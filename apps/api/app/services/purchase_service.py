"""
Affiliate purchase → wardrobe (build plan weeks 18–19, blueprint step 7):
when a network postback confirms a conversion, the bought piece is added to the
wardrobe automatically with a placeholder tile, and the user is told how many
outfits it unlocked. They replace the tile with a photo when the parcel arrives.
"""
from __future__ import annotations

import io
import uuid

from fastapi.concurrency import run_in_threadpool
from PIL import Image, ImageDraw, ImageFont
from sqlalchemy.ext.asyncio import AsyncSession

from app import knowledge
from app.models.commerce import AffiliateClick
from app.models.garment import ClassificationStatus, Garment
from app.models.user import User
from app.services import analytics, gap_analyzer, gap_service
from app.services.classifier import rules
from app.services.classifier.color import color_hex
from app.services.notifications import Push, get_notifier
from app.services.storage import get_storage

PLACEHOLDER_NOTE = (
    "Added automatically from your {platform} purchase — replace this tile with a photo "
    "when it arrives."
)


def _tile(color: str, label: str, size: int) -> bytes:
    """A flat colour swatch with the garment name — recognisable in the grid, obviously not a photo."""
    img = Image.new("RGB", (size, int(size * 1.2)), color_hex(color))
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("arial.ttf", max(14, size // 12))
    except OSError:
        font = ImageFont.load_default()
    text = label.replace("_", " ").title()
    w = draw.textlength(text, font=font)
    fg = "#1e1b15" if color in ("white", "cream", "beige", "yellow", "golden") else "#fff8f1"
    draw.rectangle([0, img.height - size // 4, img.width, img.height], fill=fg)
    draw.text(
        ((img.width - w) / 2, img.height - size // 4 + size // 24),
        text,
        fill=color_hex(color) if fg == "#1e1b15" else "#1e1b15",
        font=font,
    )
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=80)
    return buf.getvalue()


async def add_purchased_garment(
    db: AsyncSession, user: User, click: AffiliateClick
) -> Garment | None:
    """Create the wardrobe entry for a converted click. Returns None when the click has no type."""
    if not click.gap_type or click.gap_type.startswith("campaign:"):
        return None
    tax = {g["slug"]: g for g in knowledge.garment_types()}
    entry = tax.get(click.gap_type)
    if entry is None:
        return None
    color = click.color or "navy"
    fabric = click.fabric or (entry.get("typical_fabrics") or ["cotton"])[0]
    full, thumb = await run_in_threadpool(
        lambda: (_tile(color, entry["label"], 800), _tile(color, entry["label"], 200))
    )
    storage = get_storage()
    gid = uuid.uuid4()
    image_key = f"garments/{user.id}/{gid}.jpg"
    thumb_key = f"garments/{user.id}/{gid}_thumb.jpg"
    await storage.put(image_key, full)
    await storage.put(thumb_key, thumb)
    garment = Garment(
        id=gid,
        user_id=user.id,
        image_key=image_key,
        thumbnail_key=thumb_key,
        garment_type=click.gap_type,
        fabric_type=fabric,
        color_primary=color,
        occasion_tags=rules.occasions_for(click.gap_type, fabric),
        season_tags=rules.seasons_for_fabric(fabric),
        care_profile=rules.care_profile_for(fabric),
        ai_confidence=0.0,
        classification_status=ClassificationStatus.complete,
        user_verified=False,
        notes=PLACEHOLDER_NOTE.format(platform=click.platform.value.title()),
        purchase_price=click.order_value_inr,
    )
    db.add(garment)
    await db.flush()
    gap_service.invalidate(user.id)
    analytics.track(
        user.id, "purchase_auto_added", platform=click.platform.value, gap_type=click.gap_type
    )
    return garment


async def outfits_unlocked(db: AsyncSession, user: User, garment: Garment) -> int:
    """Distinct outfits the new piece takes part in, across every occasion."""
    wardrobe = await gap_service._wardrobe(db, user)
    sets: set[frozenset[str]] = set()
    for occ in knowledge.occasions():
        sets |= {s for s in gap_analyzer.outfit_sets(wardrobe, occ["slug"]) if str(garment.id) in s}
    return len(sets)


async def notify_added(user: User, garment: Garment, unlocked: int) -> None:
    if not user.fcm_token:
        return
    label = f"{garment.color_primary} {garment.garment_type.replace('_', ' ')}"
    body = (
        f"It unlocks {unlocked} new outfit{'s' if unlocked != 1 else ''}. Add a photo when it arrives."
        if unlocked
        else "Add a photo when it arrives and we'll start styling it."
    )
    await get_notifier().send(
        user.fcm_token,
        Push(
            title=f"Your new {label} is in your wardrobe",
            body=body,
            data={"url": f"pehno://wardrobe/{garment.id}", "garment_id": str(garment.id)},
        ),
    )
