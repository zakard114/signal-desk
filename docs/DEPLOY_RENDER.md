# Deploy on Render (Signal Desk)

**Production:** https://signal-desk-c3dx.onrender.com (from `main` + Docker + `artifacts/latest.json`).

After code pushes, confirm **Manual Deploy** if the service lags auto-deploy (Ops **Grafana** tab and `GET /ops/board` should exist).

## Prerequisites

- GitHub repo connected: https://github.com/zakard114/signal-desk
- `artifacts/latest.json` committed (Docker image copies it in; no parquet on cloud)
- Dockerfile at repo root; health check path `/health`

## Option A — Blueprint (`render.yaml`)

1. Open https://dashboard.render.com
2. **Blueprints** → **New Blueprint Instance**
3. Connect `zakard114/signal-desk`
4. Approve service `signal-desk` (Docker, free plan)
5. Wait until deploy is **Live**; production URL: https://signal-desk-c3dx.onrender.com

## Option B — Manual Web Service

1. **New** → **Web Service** → connect repo
2. **Language:** Docker
3. **Dockerfile path:** `./Dockerfile`
4. **Health Check Path:** `/health`
5. Optional env (Dockerfile already sets default): `SIGNAL_DESK_ARTIFACT=/app/artifacts/latest.json`
6. Deploy; copy public URL

## After deploy

1. Smoke test:
   - `https://<your-host>/health` → `{"status":"ok"}` (`artifact_exists: true`)
   - `GET /v1/threshold-grid` → `"count": 6`
   - `/` → slider updates KPIs (badge: **Live · 6 thresholds**)
   - Desk **Update simulation** twice (e.g. 0.55 and 0.60) → **Ops → Grafana** shows non-zero Simulations
   - `/v1/meta` → JSON metadata
2. **`main` push** triggers rebuild; wait until **Live**, then hard-refresh the desk if static assets look stale.
3. Edit root `README.md` **Live demo** row with the Render URL when the hostname changes.
4. `git commit` + `push` (GitHub About **Website** optional, same URL)

## Cold start (free tier)

First request after idle can take ~30s. If `/health` fails once, retry. See [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## Refreshing data

Render does **not** run training. Refresh JSON locally from this repo’s [`pipeline/`](../pipeline/) (see [`PIPELINE.md`](PIPELINE.md)):

```powershell
. E:\IT_SPACES\AI\scripts\use_e_drive.ps1
cd E:\IT_SPACES\AI\Projects\sma\us-equity-signals
E:\IT_SPACES\AI\ZoomCamp\ML\.venv\Scripts\python.exe ops\export_artifacts.py
```

Commit `artifacts/latest.json` and trigger **Manual Deploy** on Render.