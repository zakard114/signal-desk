# Learning in Public (LinkedIn) — draft

SMA 2026 optional LiP: prefer **post URL** or **live demo URL**, not profile-only links.

## Checklist

- [x] Render demo https://signal-desk-c3dx.onrender.com
- [x] Ops + Grafana (`GET /ops/board`) on live host
- [ ] Post published on LinkedIn
- [ ] Optional: add post URL or demo URL to course LiP field if the form allows

## English draft (edit tone to yours)

**Title line:** Signal Desk — US equity ML signals (SMA capstone companion)

**Body:**

Finished Stock Markets Analytics capstone Attempt 1 (random forest + vector simulation on combined US equity features).

For Learning in Public I split the work:

- **Repro / course:** [ZoomCamp SMA/Project](https://github.com/zakard114/ZoomCamp/tree/main/SMA/Project) — training notebook, parquet pipeline, graded snapshot.
- **Demo:** [Signal Desk](https://github.com/zakard114/signal-desk) — FastAPI + ledger UI over frozen simulation artifacts (threshold slider, KPIs, latest signals), in-app Ops with Grafana-style board (`/ops/board`). No parquet in the demo repo; cloud serves precomputed JSON.

Stack: Python, scikit-learn, FastAPI, Docker, Render.

**Live demo:** https://signal-desk-c3dx.onrender.com

**What I learned:** threshold choice changes CAGR and trade count a lot; exporting a small threshold grid made the API/UI honest without re-fitting on every click.

Hashtags (pick a few): `#MachineLearning` `#Python` `#FastAPI` `#DataTalksClub` `#StockMarketAnalytics`

## 한국어 초안 (짧게)

SMA 캡스톤(랜덤포레스트 + 벡터 시뮬) 제출 후, LiP용으로 **Signal Desk** 데모를 따로 올렸습니다.

- 재현용: [ZoomCamp SMA/Project](https://github.com/zakard114/ZoomCamp/tree/main/SMA/Project)
- 데모: https://github.com/zakard114/signal-desk (FastAPI, threshold 슬라이더, KPI/시그널 테이블)

라이브 URL: https://signal-desk-c3dx.onrender.com

## README screenshots (optional)

1. Home: threshold + simulation KPIs (`http://127.0.0.1:8080/` or Render `/`)
2. Latest signals table after **Update simulation**

Save under `docs/images/` and link from root `README.md` when ready.