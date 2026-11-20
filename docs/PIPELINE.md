# ML pipeline (local reproduction)

All capstone **training, simulation, and analysis** code lives in [`../pipeline/`](../pipeline/) in this repository.

## Data (not in Git)

Combined equity panel per [SMA Modules 02–04](https://github.com/DataTalksClub/stock-markets-analytics-zoomcamp): **YFinance** prices/volume, **lecture TA/pattern** columns, **FRED** macro, forward-return labels.

1. **Build** the combined table using course Module 02 instructions (one `stocks_df_combined_*.parquet` or `.parquet.brotli`).
2. **Point** the pipeline at your file:

```powershell
$env:SMA_DATA_PATH = "/path/to/stocks_df_combined_2026_09_18.parquet.brotli"
```

If unset, `pipeline/src/config.py` uses a default path on the author’s machine only — **set `SMA_DATA_PATH` on your clone**.

Feature sources table: [`pipeline/README.md`](../pipeline/README.md).

## Reproduce

From **repository root** (`<your-clone-root>`):

```bash
cd pipeline
python -m venv .venv && source .venv/bin/activate   # or your existing venv
pip install -r requirements.txt
pip install -r ../requirements.txt                  # app deps if shared venv
python run.py
python run_analysis.py
```

PowerShell: same `cd pipeline`, activate venv, `python run.py`.

Deep notes: [`pipeline/docs/FINDINGS.md`](../pipeline/docs/FINDINGS.md).  
Verified snapshot: [`pipeline/docs/analysis_snapshot.json`](../pipeline/docs/analysis_snapshot.json).

## Refresh cloud desk numbers

From repository root:

```bash
python ops/export_artifacts.py
git add artifacts/latest.json
git commit -m "chore: refresh artifacts from pipeline run"
git push origin main
```

Render redeploys from `main` (see root README — deploy section).

## Author machine (optional)

The author uses a fixed Windows data path and `E:` caches; see [`NOTES.md`](NOTES.md#paths-and-clone-roots). Reviewers should use `SMA_DATA_PATH` and their own clone root only.