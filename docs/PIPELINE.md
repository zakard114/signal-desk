# ML pipeline (local reproduction)

All capstone **training, simulation, and analysis** code lives in [`../pipeline/`](../pipeline/) in this repository.

## Data (not in Git)

Combined equity panel per course Modules 02–04 (YFinance, TA features, FRED macro, labels). Build or place locally:

`E:/IT_SPACES/AI/ZoomCamp/SMA/04/trading_strategy_and_simulation/stocks_df_combined_2026_09_18.parquet.brotli`

Override path:

```powershell
$env:SMA_DATA_PATH = "E:\path\to\your\combined.parquet.brotli"
```

See [`pipeline/README.md`](../pipeline/README.md) for sources table and feature lists.

## Reproduce

```powershell
. E:\IT_SPACES\AI\scripts\use_e_drive.ps1
cd E:\IT_SPACES\AI\Projects\sma\us-equity-signals\pipeline
E:\IT_SPACES\AI\ZoomCamp\ML\.venv\Scripts\python.exe run.py
E:\IT_SPACES\AI\ZoomCamp\ML\.venv\Scripts\python.exe run_analysis.py
```

Deep notes: [`pipeline/docs/FINDINGS.md`](../pipeline/docs/FINDINGS.md).  
Verified snapshot: [`pipeline/docs/analysis_snapshot.json`](../pipeline/docs/analysis_snapshot.json).

## Refresh cloud desk numbers

```powershell
cd E:\IT_SPACES\AI\Projects\sma\us-equity-signals
E:\IT_SPACES\AI\ZoomCamp\ML\.venv\Scripts\python.exe ops\export_artifacts.py
git add artifacts/latest.json
git commit -m "chore: refresh artifacts from pipeline run"
git push origin main
```

Render redeploys from `main` (see root README — deploy section).