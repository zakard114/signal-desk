# Deploy on Render (Signal Desk)

Deadline context: set **Live demo** in root `README.md` before **11/21** if you want the URL in LiP.

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
   - `https://<your-host>/health` → `{"status":"ok"}`
   - `/` → slider updates KPIs (badge: **Live · 6 thresholds**)
   - `/v1/meta` → JSON metadata
2. Edit root `README.md` **Live demo** row with the Render URL
3. `git commit` + `push` (GitHub About **Website** optional, same URL)

## Cold start (free tier)

First request after idle can take ~30s. If `/health` fails once, retry. See [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## Refreshing data

Render does **not** run `ops/export_artifacts.py`. On E::

```powershell
. E:\IT_SPACES\AI\scripts\use_e_drive.ps1
E:\IT_SPACES\AI\ZoomCamp\ML\.venv\Scripts\python.exe E:\IT_SPACES\AI\Projects\sma\us-equity-signals\ops\export_artifacts.py
```

Commit `artifacts/latest.json` and trigger **Manual Deploy** on Render.