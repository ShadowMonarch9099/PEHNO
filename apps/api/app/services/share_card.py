"""
Shareable outfit card — 1080×1350 (Instagram portrait) JPEG rendered with Pillow.

Layout: occasion/festival header, garment collage (1–3 pieces, each tagged
with its type), PEHNO wordmark + "Built my look on @pehno" footer. Uses
Pillow's bundled font (Pillow ≥ 10.1) so no font files are needed.
"""
from __future__ import annotations

import io
from dataclasses import dataclass

from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1350
CREAM = (255, 248, 241)
INK = (30, 27, 21)
BRAND = (150, 73, 0)
MUTED = (143, 122, 105)
PAD = 48


@dataclass
class CardItem:
    image: bytes
    label: str  # e.g. "Kanjeevaram saree"


def _font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    try:
        return ImageFont.load_default(size=size)
    except TypeError:  # very old Pillow: bitmap font only
        return ImageFont.load_default()


def _fit(img: Image.Image, box: tuple[int, int]) -> Image.Image:
    """Cover-fit into box, centre-cropped."""
    bw, bh = box
    scale = max(bw / img.width, bh / img.height)
    resized = img.resize(
        (max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.LANCZOS
    )
    left, top = (resized.width - bw) // 2, (resized.height - bh) // 2
    return resized.crop((left, top, left + bw, top + bh))


def _rounded(img: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, img.width, img.height), radius=radius, fill=255)
    out = Image.new("RGBA", img.size)
    out.paste(img, (0, 0), mask)
    return out


def _tag(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str) -> None:
    font = _font(28)
    tw = draw.textlength(text, font=font)
    x, y = xy
    draw.rounded_rectangle((x, y, x + tw + 32, y + 48), radius=24, fill=(30, 27, 21, 200))
    draw.text((x + 16, y + 9), text, font=font, fill=CREAM)


def render_card(items: list[CardItem], *, title: str, subtitle: str, city: str | None) -> bytes:
    canvas = Image.new("RGBA", (W, H), CREAM)
    draw = ImageDraw.Draw(canvas)

    # Header
    draw.text((PAD, PAD), title.upper(), font=_font(30), fill=BRAND)
    draw.text((PAD, PAD + 44), subtitle, font=_font(52), fill=INK)

    # Collage area
    top, bottom = PAD + 140, H - 190
    area_w, area_h = W - 2 * PAD, bottom - top
    gap = 20
    n = max(1, min(3, len(items)))
    if n == 1:
        boxes = [(PAD, top, area_w, area_h)]
    elif n == 2:
        w2 = (area_w - gap) // 2
        boxes = [(PAD, top, w2, area_h), (PAD + w2 + gap, top, w2, area_h)]
    else:
        w_hero = round(area_w * 0.62)
        w_side = area_w - w_hero - gap
        h_side = (area_h - gap) // 2
        boxes = [
            (PAD, top, w_hero, area_h),
            (PAD + w_hero + gap, top, w_side, h_side),
            (PAD + w_hero + gap, top + h_side + gap, w_side, h_side),
        ]
    for item, (x, y, bw, bh) in zip(items[:n], boxes, strict=False):
        try:
            img = Image.open(io.BytesIO(item.image)).convert("RGB")
        except Exception:
            img = Image.new("RGB", (bw, bh), (219, 194, 174))
        tile = _rounded(_fit(img, (bw, bh)), 28)
        canvas.alpha_composite(tile, (x, y))
        draw = ImageDraw.Draw(canvas)
        _tag(draw, (x + 20, y + bh - 68), item.label)

    # Footer
    fy = H - 140
    draw.line((PAD, fy, W - PAD, fy), fill=(219, 194, 174), width=2)
    draw.text((PAD, fy + 28), "PEHNO", font=_font(44), fill=BRAND)
    draw.text((PAD + 190, fy + 38), "Built my look on @pehno", font=_font(30), fill=MUTED)
    if city:
        font = _font(28)
        tw = draw.textlength(city, font=font)
        draw.text((W - PAD - tw, fy + 40), city, font=font, fill=MUTED)

    out = io.BytesIO()
    canvas.convert("RGB").save(out, format="JPEG", quality=88, optimize=True)
    return out.getvalue()
