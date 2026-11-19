# Notes

## Artifact-backed demos

Precomputed `artifacts/latest.json` on Render avoids parquet in Git. Regenerate on E: with `ops/export_artifacts.py` (~2 min, one RF fit + six vector sims). Commit JSON and redeploy to refresh cloud KPIs.

## Threshold grid (subtle)

- Export uses `THRESHOLDS = [0.55 … 0.60]` in `ops/export_artifacts.py`.
- API/UI do **not** re-fit the model per click; they **lookup** the nearest grid row.
- **CAGR** moves slowly across cutoffs; **test_trades** and **latest_signals** row count change more obviously.
- Hero meta `pred_rf_X.XX` updates with selected threshold; artifact `generated_at` is fixed until re-export.

## Desk scaling (subtle)

- **Trade size** and **fee** adjust displayed P&L/capital client-side from artifact defaults (`defaults.trade_notional_usd`, `defaults.fee_rate`). They do not call a new server simulation.
- **Ticker filter** is client-side on the signal list returned for the current threshold.

## Ops / Grafana (subtle)

- Grafana tab polls `/ops/board` every **4s** only while that tab is visible (saves noise in Log).
- `/health` and `/ops/board` are **not** duplicated in the server audit ring (by design).
- Simulation audit rows store `cagr_approx` for the **CAGR (recent)** chart — not live market data.

## Learning in public

Use the **post URL** or **live demo URL**, not a profile-only link.  
Draft: [LIP_LINKEDIN.md](LIP_LINKEDIN.md).  
Course submission stays [ZoomCamp `SMA/Project`](https://github.com/zakard114/ZoomCamp/tree/main/SMA/Project) @ `dd4cd5a`; this repo is the portfolio/LiP companion.

## Related docs

- [OPS.md](OPS.md) — tabs and `/ops/board`
- [DEMO_WALKTHROUGH.md](DEMO_WALKTHROUGH.md) — inputs that visibly change numbers