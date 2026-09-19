"""
Dominant-colour extraction → PEHNO colour names. Deterministic, no model.

Approach: centre-crop (drop background edges), downscale, median-cut quantise to
8 colours, then map each palette entry to the nearest named colour in HSV space
and aggregate by pixel share.
"""
import colorsys
from collections import Counter

from PIL import Image

# (name, hue_deg, sat, val) anchors; achromatic names handled by rules first.
# maroon/navy/brown/golden are value/saturation-dependent and handled by rules above.
_HUE_ANCHORS: list[tuple[str, float]] = [
    ("red", 0),
    ("orange", 25),
    ("yellow", 52),
    ("green", 120),
    ("teal", 175),
    ("blue", 220),
    ("purple", 280),
    ("pink", 330),
]


def name_for_rgb(rgb: tuple[int, int, int]) -> str:
    r, g, b = (c / 255 for c in rgb)
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    hue = h * 360
    if v < 0.16:
        return "black"
    if s < 0.12:
        if v > 0.9:
            return "white"
        if v > 0.72:
            return "cream" if 20 <= hue <= 70 else "grey"
        return "grey"
    if s < 0.3 and v > 0.85:
        return "cream" if 20 <= hue <= 70 else "white"
    if s < 0.35 and 0.5 < v <= 0.85 and 15 <= hue <= 60:
        return "beige"
    if 15 <= hue <= 45 and v < 0.62:
        return "brown"
    if 40 <= hue <= 60 and s > 0.5 and v > 0.6:
        return "golden"
    if (hue < 15 or hue >= 340) and v < 0.58:
        return "maroon"
    if 200 <= hue <= 250 and v < 0.5:
        return "navy"
    best, best_d = "multicolor", 999.0
    for name, anchor in _HUE_ANCHORS:
        d = min(abs(hue - anchor), 360 - abs(hue - anchor))
        if d < best_d:
            best, best_d = name, d
    return best


def dominant_colors(image: Image.Image) -> tuple[str, str | None]:
    """Return (primary, accent). Accent is None when the garment is essentially one colour."""
    w, h = image.size
    crop = image.crop((int(w * 0.15), int(h * 0.15), int(w * 0.85), int(h * 0.85))).convert("RGB")
    crop.thumbnail((160, 160))
    quant = crop.quantize(colors=8, method=Image.Quantize.MEDIANCUT)
    palette = quant.getpalette()[: 8 * 3]
    counts = Counter()
    for idx, n in ((px, c) for c, px in quant.getcolors() or []):
        rgb = tuple(palette[idx * 3 : idx * 3 + 3])
        counts[name_for_rgb(rgb)] += n
    if not counts:
        return "unknown", None
    total = sum(counts.values())
    ranked = counts.most_common()
    primary = ranked[0][0]
    accent = next((name for name, n in ranked[1:] if n / total >= 0.15 and name != primary), None)
    if len([1 for _, n in ranked if n / total >= 0.15]) >= 4:
        return "multicolor", primary
    return primary, accent
