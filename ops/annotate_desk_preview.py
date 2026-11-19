"""Numbered callouts on desk screenshot — thin red neon ring + red digit (no fill, no white halo)."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "docs" / "images" / "desk" / "desk-after-update.png"
DST = ROOT / "docs" / "images" / "desk" / "desk-annotated.png"
COORDS = ROOT / "docs" / "images" / "desk" / "marker_coords.json"

NEON = (255, 72, 72, 255)
NEON_GLOW = (255, 72, 72, 72)
LAYOUT_VIEWPORT_H = 900

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


def content_bbox(im: Image.Image, pad: int = 6) -> tuple[int, int, int, int]:
    rgb = im.convert("RGB")
    w, h = rgb.size
    px = rgb.load()
    min_x, min_y = w, h
    max_x, max_y = 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if r > 24 or g > 24 or b > 28:
                min_x = min(min_x, x)
                max_x = max(max_x, x)
                min_y = min(min_y, y)
                max_y = max(max_y, y)
    if max_x <= min_x:
        return 0, 0, w, h
    return (
        max(0, min_x - pad),
        max(0, min_y - pad),
        min(w, max_x + pad + 1),
        min(h, max_y + pad + 1),
    )


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


def layout_pixel_to_norm(
    dom_x: float,
    dom_y: float,
    img_w: int,
    img_h: int,
    box: tuple[int, int, int, int],
    layout_h: float = LAYOUT_VIEWPORT_H,
    y_bias: float = 0.0,
) -> tuple[float, float]:
    _l, t, _r, b = box
    ch = max(1, b - t)
    cy = t + (dom_y + y_bias) * (ch / layout_h)
    cx = dom_x
    return cx / img_w, cy / img_h


def load_markers(im: Image.Image) -> list[tuple[float, float, str, bool]]:
    data = json.loads(COORDS.read_text(encoding="utf-8"))
    box = content_bbox(im)
    layout_h = float(data.get("layout_viewport_h", LAYOUT_VIEWPORT_H))
    y_bias = float(data.get("layout_y_bias", 0))
    out: list[tuple[float, float, str, bool]] = []
    for m in data["markers"]:
        if "dom_x" in m and "dom_y" in m:
            x, y = layout_pixel_to_norm(
                float(m["dom_x"]),
                float(m["dom_y"]),
                im.size[0],
                im.size[1],
                box,
                layout_h,
                y_bias,
            )
        else:
            x, y = float(m["x"]), float(m["y"])
        out.append((x, y, str(m["label"]), bool(m.get("small", False))))
    return out


def draw_marker(
    draw: ImageDraw.ImageDraw,
    cx: int,
    cy: int,
    label: str,
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
    *,
    small: bool = False,
) -> None:
    f = load_font(max(10, int(font.size * 0.82))) if small else font
    half, _, _ = marker_box(draw, label, f)
    bbox = (cx - half, cy - half, cx + half, cy + half)
    glow = (cx - half - 1, cy - half - 1, cx + half + 1, cy + half + 1)
    draw.ellipse(glow, outline=NEON_GLOW, width=1)
    draw.ellipse(bbox, outline=NEON, width=1)
    draw.text((cx, cy), label, font=f, fill=NEON, anchor="mm")


def main() -> None:
    im = Image.open(SRC).convert("RGBA")
    w, h = im.size
    box = content_bbox(im)
    overlay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    font_size = max(13, int(min(w, h) * 0.018))
    font = load_font(font_size)
    markers = load_markers(im)

    for xp, yp, label, small in markers:
        cx, cy = int(xp * w), int(yp * h)
        draw_marker(draw, cx, cy, label, font, small=small)

    out = Image.alpha_composite(im, overlay).convert("RGB")
    DST.parent.mkdir(parents=True, exist_ok=True)
    out.save(DST, format="PNG", optimize=True)
    print(f"Wrote {DST} ({w}x{h}) content_box={box}")


if __name__ == "__main__":
    main()