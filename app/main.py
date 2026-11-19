"""Signal Desk — read-only API over artifacts/latest.json."""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.artifacts import artifact_path, load_artifact
from app.sim_lookup import signals_for, simulation_for

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "static"

app = FastAPI(
    title="Signal Desk",
    description="US equity ML signals demo (artifact-backed).",
    version="0.1.0",
)

app.mount("/static", StaticFiles(directory=STATIC), name="static")


@app.get("/health")
def health():
    path = artifact_path()
    return {"status": "ok", "artifact": str(path), "artifact_exists": path.is_file()}


@app.get("/v1/meta")
def meta():
    try:
        data = load_artifact()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {
        "product": data.get("product", "Signal Desk"),
        "generated_at": data.get("generated_at"),
        "strategy": data.get("strategy"),
        "source": data.get("source"),
    }


@app.get("/v1/threshold-grid")
def threshold_grid():
    try:
        data = load_artifact()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    grid = data.get("threshold_grid") or []
    return {
        "default_threshold": data.get("default_threshold", 0.55),
        "defaults": data.get("defaults", {}),
        "grid": [{**{"threshold": g["threshold"]}, **g.get("simulation", {})} for g in grid],
        "count": len(grid),
    }


@app.get("/v1/simulation")
def simulation(threshold: float | None = Query(default=None, ge=0.5, le=0.65)):
    try:
        data = load_artifact()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    sim = simulation_for(data, threshold)
    if threshold is not None:
        sim["threshold_selected"] = threshold
        sim["pred_column"] = f"pred_rf_{threshold:.2f}"
    return sim


@app.get("/v1/signals/latest")
def signals_latest(threshold: float | None = Query(default=None, ge=0.5, le=0.65)):
    try:
        data = load_artifact()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"signals": signals_for(data, threshold)}


@app.get("/ops")
def ops_page():
    return RedirectResponse(url="/?view=ops", status_code=302)


@app.get("/")
def index():
    return FileResponse(STATIC / "index.html")


@app.get("/preview")
def preview_page():
    """Static UI only — same layout; useful for design review."""
    return FileResponse(STATIC / "preview.html")