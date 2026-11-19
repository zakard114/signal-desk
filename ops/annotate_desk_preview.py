"""Numbered callouts on desk screenshot — thin red neon ring + red digit (no fill, no white halo)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "docs" / "images" / "desk" / "desk-after-update.png"
DST = ROOT / "docs" / "images" / "desk" / "desk-annotated.png"

NEON = (255, 72, 72, 255)
NEON_GLOW = (255, 72, 72, 72)

MARKERS: list[tuple[float, float, str]] = [
    (0.12, 0.11, "1"),
    (0.20, 0.36, "2"),
    (0.20, 0.52, "3"),
    (0.16, 0.66, "4"),
    (0.62, 0.36, "5"),
    (0.62, 0.47, "6"),
    (0.55, 0.68, "7"),
    (0.93, 0.04, "8"),
]

FONT_CANDIDATES = (
    "C:/Windows/Fonts/segoeuib.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
    "arial.ttf",
)


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in FONT_CANDIDATES:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def marker_box(
    draw: ImageDraw.ImageDraw,
    label: str,
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
) -> tuple[int, int, int]:
    pad = 4
    if hasattr(font, "getbbox"):
        x0, y0, x1, y1 = font.getbbox(label)
        tw, th = x1 - x0, y1 - y0
    else:
        box = draw.textbbox((0, 0), label, font=font)
        tw, th = box[2] - box[0], box[3] - box[1]
    side = max(tw, th) + 2 * pad
    half = max(9, side // 2)
    return half, pad, side


def main() -> None:
    im = Image.open(SRC).convert("RGBA")
    w, h = im.size
    overlay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    font_size = max(12, int(min(w, h) * 0.017))
    font = load_font(font_size)

    for xp, yp, label in MARKERS:
        cx = int(xp * w)
        cy = int(yp * h)
        half, _pad, _side = marker_box(draw, label, font)
        bbox = (cx - half, cy - half, cx + half, cy + half)
        glow = (cx - half - 1, cy - half - 1, cx + half + 1, cy + half + 1)
        draw.ellipse(glow, outline=NEON_GLOW, width=1)
        draw.ellipse(bbox, outline=NEON, width=1)
        draw.text((cx, cy), label, font=font, fill=NEON, anchor="mm")

    out = Image.alpha_composite(im, overlay).convert("RGB")
    DST.parent.mkdir(parents=True, exist_ok=True)
    out.save(DST, format="PNG", optimize=True)
    print(f"Wrote {DST} ({w}x{h})")


if __name__ == "__main__":
    main()