# Demo walkthrough (verify inputs change numbers)

Live: https://signal-desk-c3dx.onrender.com

Confirm the header badge reads **`Live · 6 thresholds`**. If it says **UI preview (mock)**, the API/artifact is unavailable — fix with [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## 1. Threshold (largest KPI swing)

The artifact stores **six cutoffs only**: **0.55, 0.56, 0.57, 0.58, 0.59, 0.60**. The API picks the **nearest** grid point (`app/sim_lookup.py`), so small moves between two points often look unchanged until you cross the midpoint (e.g. 0.554 → still 0.55).

| Threshold | ~Test trades | ~Net P&L (USD) | ~CAGR | Signals table |
|-----------|--------------|----------------|-------|----------------|
| **0.55** | 3756 | 12,984 | 1.128 | 3 tickers |
| **0.56** | 2780 | 9,897 | 1.101 | 2 (no RELIANCE) |
| **0.60** | 745 | 2,531 | 1.049 | 1 row |

**Steps:** set slider **0.55** → **Update simulation** → note **Test trades**. Move to **0.60** → **Update** again. Trades should drop sharply; CAGR changes only in the third decimal (easy to miss — use **Test trades** as the main visual).

## 2. Trade size (USD)

Scales **Net P&L** and **Assumed capital** only; **CAGR (approx.) unchanged** (client scaling in `static/app.js`).

| Notional @ 0.55 | Effect |
|-----------------|--------|
| **100** (default) | Baseline |
| **500** | ~5× P&L and capital |
| **50** | ~½ P&L and capital |

## 3. Fee rate

Weak effect on P&L (heuristic fee factor). Do not expect large KPI jumps; use threshold/notional for demos.

## 4. Ticker filter

Filters the **signals table only**; KPI cards stay the same. Try `RELIANCE` at 0.55, then `ZZZZ` for empty table.

## 5. Ops + Grafana (prove server activity)

1. Run two simulations: **0.55** then **0.60**.  
2. **Ops → Log** — green rows for `/v1/simulation` and `/v1/signals/latest`.  
3. **Ops → Grafana** — audit rows with **Thr** and **CAGR**; charts fill after a few requests.  
4. **Ops → API → Try** on `/v1/simulation` — JSON should match desk KPIs.

## Smoke URLs (no UI)

```text
GET /health
GET /v1/threshold-grid          → "count": 6
GET /v1/simulation?threshold=0.60
GET /ops/board
```