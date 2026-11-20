#!/usr/bin/env python3
"""Run ZoomCamp pipeline (once) and export threshold grid + artifacts/latest.json."""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PIPELINE_ROOT = Path(
    os.environ.get(
        "SMA_PIPELINE_ROOT",
        str(ROOT / "pipeline"),
    )
)

os.environ.setdefault("MPLCONFIGDIR", r"E:\IT_SPACES\AI\.cache\matplotlib")
os.environ.setdefault("XDG_CACHE_HOME", r"E:\IT_SPACES\AI\.cache")
os.environ.setdefault("TEMP", r"E:\IT_SPACES\AI\.cache\tmp")
os.environ.setdefault("TMP", r"E:\IT_SPACES\AI\.cache\tmp")

sys.path.insert(0, str(PIPELINE_ROOT))

from src.load_data import load_combined_parquet  # noqa: E402
from src.modeling import attach_predictions, build_labeled_frame, fit_random_forest  # noqa: E402
from src.simulation import latest_signals, vector_simulate  # noqa: E402

DEFAULT_THRESHOLD = 0.55
THRESHOLDS = [0.55, 0.56, 0.57, 0.58, 0.59, 0.60]


def _signals_records(df) -> list[dict]:
    if df is None or len(df) == 0:
        return []
    out = []
    for row in df.itertuples(index=False):
        out.append(
            {
                "date": str(row.Date.date()) if hasattr(row.Date, "date") else str(row.Date),
                "ticker": str(row.Ticker),
                "ticker_type": str(getattr(row, "ticker_type", "")),
            }
        )
    return out


def main() -> int:
    raw = load_combined_parquet()
    frame, features = build_labeled_frame(raw)
    _, proba = fit_random_forest(frame, features)

    grid = []
    for t in THRESHOLDS:
        run_frame = frame.copy()
        run_frame, pred_col = attach_predictions(run_frame, proba, t)
        sim = vector_simulate(run_frame, pred_col)
        sig_df = latest_signals(run_frame, pred_col)
        grid.append(
            {
                "threshold": t,
                "pred_column": pred_col,
                "simulation": sim,
                "latest_signals": _signals_records(sig_df),
            }
        )

    default = next(g for g in grid if g["threshold"] == DEFAULT_THRESHOLD)
    payload = {
        "product": "Signal Desk",
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "source": {
            "pipeline": "signal-desk/pipeline",
            "data_path_note": "Local parquet on E:; not stored in this repo",
        },
        "defaults": {"trade_notional_usd": 100.0, "fee_rate": 0.002},
        "default_threshold": DEFAULT_THRESHOLD,
        "strategy": default["pred_column"],
        "rows": len(frame),
        "features": len(features),
        "simulation": default["simulation"],
        "latest_signals": default["latest_signals"],
        "threshold_grid": grid,
    }
    out = ROOT / "artifacts" / "latest.json"
    out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out} ({len(grid)} thresholds)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())