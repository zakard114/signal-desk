"""Copy dropped PNGs from docs/images/_incoming/ into desk + ops paths."""
from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INC = ROOT / "docs" / "images" / "_incoming"

MAP = {
    "desk-after-update.png": ROOT / "docs/images/desk/desk-after-update.png",
    "desk.png": ROOT / "docs/images/desk/desk-after-update.png",
    "ops-inspector.png": ROOT / "docs/images/ops/ops-inspector.png",
    "ops-log.png": ROOT / "docs/images/ops/ops-log.png",
    "ops-api.png": ROOT / "docs/images/ops/ops-api.png",
    "ops-grafana.png": ROOT / "docs/images/ops/ops-grafana.png",
}


def main() -> None:
    if not INC.is_dir():
        INC.mkdir(parents=True, exist_ok=True)
        print(f"Created {INC} — drop PNGs here and re-run.")
        return
    copied = 0
    for name, dst in MAP.items():
        src = INC / name
        if not src.exists():
            continue
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        print(f"Copied {name} -> {dst.relative_to(ROOT)}")
        copied += 1
    if not copied:
        print("No files copied. Expected names:", ", ".join(MAP))


if __name__ == "__main__":
    main()