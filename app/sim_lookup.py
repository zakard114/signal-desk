"""Pick simulation + signals for a threshold from artifact."""

from __future__ import annotations

from typing import Any


def _match_threshold(grid: list[dict], threshold: float) -> dict | None:
    if not grid:
        return None
    best = min(grid, key=lambda row: abs(float(row["threshold"]) - threshold))
    return best


def simulation_for(data: dict[str, Any], threshold: float | None) -> dict[str, Any]:
    grid = data.get("threshold_grid") or []
    if threshold is not None and grid:
        row = _match_threshold(grid, threshold)
        if row:
            return dict(row.get("simulation") or {})
    return dict(data.get("simulation") or {})


def signals_for(data: dict[str, Any], threshold: float | None) -> list[dict]:
    grid = data.get("threshold_grid") or []
    if threshold is not None and grid:
        row = _match_threshold(grid, threshold)
        if row:
            return list(row.get("latest_signals") or [])
    return list(data.get("latest_signals") or [])