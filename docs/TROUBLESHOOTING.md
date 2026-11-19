# Troubleshooting

## UI slider does not change KPI numbers

**Symptom:** Threshold moves but CAGR / trades stay fixed.

**Cause:** `artifacts/latest.json` had only one simulation row.

**Fix:** Run `ops/export_artifacts.py` on E:. Restart uvicorn. Badge should show `Live · 6 thresholds`.

## `export_artifacts.py` takes ~2 minutes

**Symptom:** Script appears hung.

**Cause:** ~200k rows, one RandomForest fit, six simulations.

**Fix:** Run after `use_e_drive.ps1` on E:. Not for Render.

## Render shows stale or empty data

**Symptom:** 503 or old metrics.

**Cause:** Stale `artifacts/latest.json` in image or cold start.

**Fix:** Commit refreshed artifact, redeploy, check `/health`.

## Course submission vs this demo

**Symptom:** Which URL for the course form?

**Fix:** Keep [ZoomCamp `SMA/Project`](https://github.com/zakard114/ZoomCamp/tree/main/SMA/Project) and commit `dd4cd5a`. This repo is LiP / portfolio.