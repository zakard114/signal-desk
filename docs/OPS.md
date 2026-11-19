# Ops console

Signal Desk uses the same **in-app Ops overlay** pattern as the ML midterm HoldRisk desk (hotel-booking-cancellation): one host, no separate Grafana server.

## Open Ops

- Top-right **Ops** on the ledger desk  
- Or `GET /ops` → redirect to `/?view=ops`

## Tabs

| Tab | What it shows |
|-----|----------------|
| **Inspector** | Last simulation: mode (LIVE/MOCK), health, threshold, pred column, CAGR, trades, P&L, signal count, artifact meta. Panel title uses default text color; **Mode** green LIVE / amber MOCK; **Health** ok vs bad; **CAGR** saffron. |
| **Log** | Title **Session log**; API calls; **status column only** green (2xx) or red (4xx+). |
| **API** | Title **HTTP routes**; **Try** (desk threshold); sample URLs; `/docs` link. |
| **Grafana** | **`GET /ops/board`**: 3-col **rps · error ratio · P95** (sea / risk / saffron), **histogram + status**, audit. CAGR on Inspector only. `?v=` cache bust. |

## Backend: audit + board

- `app/audit.py` — in-process ring buffer (200 rows), 30s buckets (15-minute window).
- HTTP middleware records routes except `/static`, `/docs*`, `/health`, `/ops/board`.
- `/v1/simulation` and `/v1/signals/latest` record **extra**: `threshold`, `cagr_approx`, `signal_count` for Grafana/audit columns.

```http
GET /ops/board
```

Returns `request_count`, `simulation_count`, `error_rate`, `avg_latency_ms`, `buckets`, `series` (`latency_ms`, `cagr_p`), `status_counts`, `audit` (40 rows).

## Local scripts vs web Ops

| Name | Role |
|------|------|
| `ops/export_artifacts.py` | **E: only** — rebuild `artifacts/latest.json` (not run on Render). |
| Web **Ops** overlay | Runtime health, API docs, Grafana on the running process. |

Do not confuse the Python `ops/` folder with the `/ops` URL; the URL only opens the UI overlay.