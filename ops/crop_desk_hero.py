"""Crop desk-after-update into a wide README hero (option B — live UI vignette)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "docs" / "images" / "desk" / "desk-after-update.png"
DST = ROOT / "docs" / "images" / "readme-hero-desk-crop.png"

# Fraction of source frame: top hero + inputs + KPI band (1114×935 reference)
CROP_BOX = (0.0, 0.0, 1.0, 0.58)


def main() -> None:
    im = Image.open(SRC).convert("RGBA")
    w, h = im.size
    l = int(w * CROP_BOX[0])
    t = int(h * CROP_BOX[1])
    r = int(w * CROP_BOX[2])
    b = int(h * CROP_BOX[3])
    cropped = im.crop((l, t, r, b))

    cw, ch = cropped.size
    target_w = 1200
    target_h = max(1, int(ch * target_w / cw))
    scaled = cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)

    # Bottom fade into app background (#0a0e12)
    from PIL import ImageDraw

    fade_h = min(100, target_h // 5)
    grad = Image.new("RGBA", (target_w, fade_h), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(grad)
    for row in range(fade_h):
        t = row / max(fade_h - 1, 1)
        gdraw.line([(0, row), (target_w, row)], fill=(10, 14, 18, int(255 * t)))
    base = scaled.copy()
    base.paste(grad, (0, target_h - fade_h), grad)
    scaled = base

    out = scaled.convert("RGB")
    DST.parent.mkdir(parents=True, exist_ok=True)
    out.save(DST, format="PNG", optimize=True)
    print(f"Wrote {DST} ({target_w}x{target_h})")


if __name__ == "__main__":
    main()