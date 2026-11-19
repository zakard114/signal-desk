"""Scale Ops tab captures for full-width README."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OPS = ROOT / "docs" / "images" / "ops"
TARGET_W = 1200
NAMES = ("ops-inspector.png", "ops-log.png", "ops-api.png", "ops-grafana.png")


def main() -> None:
    for name in NAMES:
        path = OPS / name
        if not path.exists():
            print(f"skip missing {path}")
            continue
        im = Image.open(path).convert("RGB")
        w, h = im.size
        if w >= TARGET_W:
            print(f"ok {name} {w}x{h}")
            continue
        nh = max(1, int(h * TARGET_W / w))
        im.resize((TARGET_W, nh), Image.Resampling.LANCZOS).save(path, format="PNG", optimize=True)
        print(f"scaled {name} -> {TARGET_W}x{nh}")


if __name__ == "__main__":
    main()