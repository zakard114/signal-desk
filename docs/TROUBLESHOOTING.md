# Troubleshooting

## Badge says UI preview (mock)

**Symptom:** `UI preview (mock data)`; KPIs look like static mock; threshold grid shallow.

**Cause:** Browser could not load `/v1/meta` and `/v1/threshold-grid` (API down, CORS unlikely same-origin, or 503 missing artifact).

**Fix:** Check `GET /health` → `artifact_exists: true`. On Render, cold-start 30–60s then retry. Locally run uvicorn from repo root with `artifacts/latest.json` present.

## UI slider does not change KPI numbers

**Symptom:** Threshold moves but CAGR / trades stay fixed.

**Causes (check in order):**

1. **Single-point artifact** — only one row in `threshold_grid`.  
   **Fix:** Run `ops/export_artifacts.py` on E:. Badge → `Live · 6 thresholds`.

2. **Between grid points** — slider at e.g. 0.53 maps to nearest **0.55**; identical KPI until you reach **0.555+** (nearest to 0.56).  
   **Fix:** Jump to **0.55** vs **0.60** for a clear demo ([DEMO_WALKTHROUGH.md](DEMO_WALKTHROUGH.md)).

3. **Only CAGR watched** — CAGR changes ~1.128 → ~1.049; trades drop 3756 → 745.  
   **Fix:** Watch **Test trades** and signals table row count.

## CAGR barely moves; P&L does

**Symptom:** Notional 100 → 500 changes P&L, not CAGR.

**Cause:** Expected. CAGR comes from artifact sim; notional scales client-side.

**Fix:** None — document behavior in demos.

## `export_artifacts.py` takes ~2 minutes

**Symptom:** Script appears hung.

**Cause:** ~200k rows, one RandomForest fit, six simulations.

**Fix:** Run after `use_e_drive.ps1` on E:. ZoomCamp parquet must exist. Not run on Render.

## Render shows stale or empty data

**Symptom:** 503 on `/v1/*` or old metrics after capstone refresh.

**Cause:** Stale `artifacts/latest.json` in Docker image or missing file in build.

**Fix:** Re-export locally, commit `artifacts/latest.json`, push, **Manual Deploy** on Render. Verify `GET /v1/threshold-grid` → `"count": 6`.

## Render deploy shows old Ops (no Grafana tab)

**Symptom:** Separate `/ops` page or header **API → /docs** only.

**Cause:** Browser cache or deploy not finished.

**Fix:** Hard refresh; confirm GitHub `main` latest; trigger Manual Deploy; check `GET /ops/board` returns JSON.

## Ops Grafana empty charts

**Symptom:** Metrics 0; audit “No requests yet”.

**Cause:** No API traffic yet or Grafana tab opened before any desk simulation.

**Fix:** On desk, **Update simulation** at least twice (e.g. 0.55 and 0.60). Open **Ops → Grafana**; wait one poll (4s).

## Ops vs API docs

**Symptom:** Looking for Swagger from the desk header.

**Fix:** **Ops → API** for routes, **Try**, and samples. **OpenAPI `/docs`** linked inside API tab only.

## Course submission vs this demo

**Symptom:** Which URL for the course form?

**Fix:** Keep [ZoomCamp `SMA/Project`](https://github.com/zakard114/ZoomCamp/tree/main/SMA/Project) and commit `dd4cd5a`. This repo + https://signal-desk-c3dx.onrender.com is LiP / portfolio.