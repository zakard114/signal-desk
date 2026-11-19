"""Numbered callouts on desk screenshot — thin red neon ring + red digit (no fill, no white halo)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "docs" / "images" / "desk" / "desk-after-update.png"
DST = ROOT / "docs" / "images" / "desk" / "desk-annotated.png"

NEON = (255, 72, 72, 255)
NEON_GLOW = (255, 72, 72, 72)

# Trimmed desk frame (~1400px wide); run ops/crop_desk_frame.py first.
MARKERS: list[tuple[float, float, str]] = [
    (0.32, 0.12, "1"),
    (0.20, 0.34, "2"),
    (0.20, 0.46, "3"),
    (0.20, 0.68, "4"),
    (0.62, 0.34, "5"),
    (0.58, 0.44, "6"),
    (0.62, 0.70, "7"),
    (0.94, 0.04, "8"),
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
    font_size = max(13, int(min(w, h) * 0.020))
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

    bx, by = int(0.20 * w), int(0.58 * h)
    half, _, _ = marker_box(draw, "b", font)
    draw.ellipse((bx - half, by - half, bx + half, by + half), outline=NEON, width=1)
    draw.text((bx, by), "b", font=load_font(max(10, font_size - 2)), fill=NEON, anchor="mm")

    out = Image.alpha_composite(im, overlay).convert("RGB")
    DST.parent.mkdir(parents=True, exist_ok=True)
    out.save(DST, format="PNG", optimize=True)
    print(f"Wrote {DST} ({w}x{h})")


if __name__ == "__main__":
    main()