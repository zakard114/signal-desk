"""Trim letterboxing from desk capture, scale for README, refresh annotation source."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "docs" / "images" / "desk" / "desk-capture-raw.png"
SRC = ROOT / "docs" / "images" / "desk" / "desk-after-update.png"
DST = ROOT / "docs" / "images" / "desk" / "desk-plain.png"
OUT = ROOT / "docs" / "images" / "desk" / "desk-after-update.png"
TARGET_W = 1400


def content_bbox(im: Image.Image, pad: int = 8) -> tuple[int, int, int, int]:
    rgb = im.convert("RGB")
    w, h = rgb.size
    px = rgb.load()
    min_x, min_y = w, h
    max_x, max_y = 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if r > 22 or g > 22 or b > 26:
                min_x = min(min_x, x)
                max_x = max(max_x, x)
                min_y = min(min_y, y)
                max_y = max(max_y, y)
    if max_x <= min_x:
        return 0, 0, w, h
    l = max(0, min_x - pad)
    t = max(0, min_y - pad)
    r = min(w, max_x + pad + 1)
    b = min(h, max_y + pad + 1)
    return l, t, r, b


def main() -> None:
    import shutil

    if SRC.exists() and not RAW.exists():
        shutil.copy2(SRC, RAW)
    path = RAW if RAW.exists() else SRC
    im = Image.open(path).convert("RGB")
    box = content_bbox(im)
    cropped = im.crop(box)
    cw, ch = cropped.size
    scale = TARGET_W / cw
    target_h = max(1, int(ch * scale))
    scaled = cropped.resize((TARGET_W, target_h), Image.Resampling.LANCZOS)
    DST.parent.mkdir(parents=True, exist_ok=True)
    scaled.save(OUT, format="PNG", optimize=True)
    scaled.save(DST, format="PNG", optimize=True)
    print(f"Crop {box} -> {TARGET_W}x{target_h} wrote {OUT}")


if __name__ == "__main__":
    main()