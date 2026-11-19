# Architecture (portfolio demo)

```text
┌─────────────────────────────────────────────────────────┐
│  Browser: static/index.html + app.js                    │
│    Desk: threshold, notional, fee → GET /v1/simulation  │
│    Ops: Inspector · Log · API · Grafana → /ops/board    │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  FastAPI app/main.py                                    │
│    GET /v1/*  → read artifacts/latest.json             │
│    audit middleware + manual audit on simulation paths  │
│    GET /ops/board → app/audit.board_payload()           │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  artifacts/latest.json (committed; baked in Docker)      │
│    threshold_grid[0.55..0.60] × (simulation + signals)  │
└─────────────────────────────────────────────────────────┘

Offline (E: only):
  ZoomCamp SMA/Project parquet → ops/export_artifacts.py → latest.json
```

**Not in cloud:** parquet, training, re-fit on each request.  
**Course repro:** https://github.com/zakard114/ZoomCamp/tree/main/SMA/Project