"""Signal Desk — read-only API over artifacts/latest.json."""

from __future__ import annotations

import time
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from app import audit
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

_MANUAL_AUDIT_PATHS = {"/v1/simulation", "/v1/signals/latest"}


@app.middleware("http")
async def audit_requests(request: Request, call_next):
    path = request.url.path
    if not audit.should_audit(path) or path in _MANUAL_AUDIT_PATHS:
        return await call_next(request)
    t0 = time.perf_counter()
    response = await call_next(request)
    ms = (time.perf_counter() - t0) * 1000
    audit.record(path, response.status_code, ms, method=request.method)
    return response


@app.get("/health")
def health():
    path = artifact_path()
    return {"status": "ok", "artifact": str(path), "artifact_exists": path.is_file()}


@app.get("/ops/board")
def ops_board():
    return audit.board_payload()


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
    t0 = time.perf_counter()
    path = "/v1/simulation"
    try:
        data = load_artifact()
    except FileNotFoundError as exc:
        ms = (time.perf_counter() - t0) * 1000
        audit.record(path, 503, ms, extra={"threshold": threshold})
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    sim = simulation_for(data, threshold)
    if threshold is not None:
        sim["threshold_selected"] = threshold
        sim["pred_column"] = f"pred_rf_{threshold:.2f}"
    ms = (time.perf_counter() - t0) * 1000
    audit.record(
        f"{path}?threshold={threshold}" if threshold is not None else path,
        200,
        ms,
        extra={
            "threshold": threshold,
            "cagr_approx": sim.get("cagr_approx"),
            "test_trades": sim.get("test_trades"),
        },
    )
    return sim


@app.get("/v1/signals/latest")
def signals_latest(threshold: float | None = Query(default=None, ge=0.5, le=0.65)):
    t0 = time.perf_counter()
    path = "/v1/signals/latest"
    try:
        data = load_artifact()
    except FileNotFoundError as exc:
        ms = (time.perf_counter() - t0) * 1000
        audit.record(path, 503, ms, extra={"threshold": threshold})
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    signals = signals_for(data, threshold)
    ms = (time.perf_counter() - t0) * 1000
    audit.record(
        f"{path}?threshold={threshold}" if threshold is not None else path,
        200,
        ms,
        extra={"threshold": threshold, "signal_count": len(signals)},
    )
    return {"signals": signals}


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