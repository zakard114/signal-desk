# Evaluation criteria (course rubric)

Maps the **course capstone** and **this repo** to the official [Stock Markets Analytics Zoomcamp project rubric](https://github.com/DataTalksClub/stock-markets-analytics-zoomcamp/blob/main/projects/README.md) (maximum **36** points; **minimum 6** from the **bold** checkboxes in sections 1–6). Peer reviewers use the course form — **do not inflate scores** here; follow the **Evidence** links.

| Submitted to course form | Role |
|--------------------------|------|
| [ZoomCamp `SMA/Project`](https://github.com/zakard114/ZoomCamp/tree/main/SMA/Project) | **Graded pipeline** — data → features → RF/DT → multi-strategy sim → `run.py` / `project.ipynb` |
| **This repo** (`signal-desk`) + https://signal-desk-c3dx.onrender.com | **LiP / portfolio** — frozen artifact API, desk UI, Ops monitoring, Render deploy |

| # | Rubric block (official) | Max | Claimed | Evidence |
|---|-------------------------|-----|---------|----------|
| 1 | **Problem description** | 4 | 3 | [`SMA/Project` problem](https://github.com/zakard114/ZoomCamp/tree/main/SMA/Project#problem); [`docs/FINDINGS.md`](https://github.com/zakard114/ZoomCamp/tree/main/SMA/Project/docs/FINDINGS.md); [Mission](../README.md#mission) + [Problem](../README.md#problem) |
| 2 | **Data sources** | 4 | 2 | [Lecture sources](https://github.com/zakard114/ZoomCamp/tree/main/SMA/Project#data-sources-lecture); [20+ derived features](https://github.com/zakard114/ZoomCamp/tree/main/SMA/Project#derived-features-rubric-2--20-documented) (local parquet on E:) |
| 3 | **Data transformations + EDA** | 3 | 3 | [`FEATURE_SETS`](https://github.com/zakard114/ZoomCamp/blob/main/SMA/Project/src/features.py); `run_eda.py` + [`src/eda.py`](https://github.com/zakard114/ZoomCamp/blob/main/SMA/Project/src/eda.py) |
| 4 | **Modeling** | 5 | 4 | RF + DT ([`modeling.py`](https://github.com/zakard114/ZoomCamp/blob/main/SMA/Project/src/modeling.py)); thresholds `0.55`/`0.57`; [`src/tuning.py`](https://github.com/zakard114/ZoomCamp/blob/main/SMA/Project/src/tuning.py) |
| 5 | **Trading simulation** | 8 | 5 | Multi-strategy + [`benchmark.py`](https://github.com/zakard114/ZoomCamp/blob/main/SMA/Project/src/benchmark.py) (CAGR, Sharpe, drawdown, passive baseline); desk grid → [`artifacts/latest.json`](../artifacts/latest.json) |
| 6 | **Automation** | 5 | 4 | [`run.py`](https://github.com/zakard114/ZoomCamp/tree/main/SMA/Project#reproduce), `project.ipynb`, [`docs/AUTOMATION.md`](https://github.com/zakard114/ZoomCamp/tree/main/SMA/Project/docs/AUTOMATION.md); [`Dockerfile`](../Dockerfile), `ops/export_artifacts.py` |
| 7 | **Bonus** | 7 | 4 | Container, cloud ([DEPLOY_RENDER.md](DEPLOY_RENDER.md)), monitoring ([Ops → Grafana](../README.md#screenshots)). Peer subjective (+1–2) not in **Claimed**. |
| | **Total (self-assessment)** | **36** | **25** | **≥6** from **bold** rows in 1–6 evidenced in [`SMA/Project`](https://github.com/zakard114/ZoomCamp/tree/main/SMA/Project) (`run.py`, `run_eda.py`). |

**Claimed** = self-score only where linked evidence exists in the capstone repo + this portfolio layer. Not counted: 1M-row dataset, novel API, exact `iterrows` sim, broker API, peer discretionary bonus. Peers and the course form decide the final score.

## Quick verification commands

```powershell
# Capstone pipeline (replace clone path):
cd E:\IT_SPACES\AI\ZoomCamp\SMA\Project
E:\IT_SPACES\AI\ZoomCamp\ML\.venv\Scripts\python.exe run.py

# This repo — API + artifact:
cd E:\IT_SPACES\AI\Projects\sma\us-equity-signals
uvicorn app.main:app --port 8080
# Smoke: GET http://127.0.0.1:8080/v1/threshold-grid  →  "count": 6
```