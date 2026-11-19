"""Load precomputed pipeline output for cloud/demo (no parquet on Render)."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ARTIFACT = ROOT / "artifacts" / "latest.json"


def artifact_path() -> Path:
    override = os.environ.get("SIGNAL_DESK_ARTIFACT")
    return Path(override) if override else DEFAULT_ARTIFACT


def load_artifact() -> dict[str, Any]:
    path = artifact_path()
    if not path.is_file():
        raise FileNotFoundError(f"Artifact not found: {path}")
  # json.loads: serve frozen run output in cloud (regenerate locally via ops/export_artifacts.py)
    return json.loads(path.read_text(encoding="utf-8"))