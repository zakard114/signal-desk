const MOCK_GRID = [
  { threshold: 0.55, test_trades: 3756, net_pnl_usd: 12983.6, assumed_capital_usd: 21000, cagr_approx: 1.128 },
  { threshold: 0.57, test_trades: 3100, net_pnl_usd: 11820, assumed_capital_usd: 19500, cagr_approx: 1.12 },
  { threshold: 0.6, test_trades: 2400, net_pnl_usd: 9500, assumed_capital_usd: 18000, cagr_approx: 1.095 },
];

const MOCK_SIGNALS = [
  { date: "2026-09-18", ticker: "HINDUNILVR.NS", ticker_type: "INDIA" },
  { date: "2026-09-18", ticker: "RELIANCE.NS", ticker_type: "INDIA" },
  { date: "2026-09-18", ticker: "SBIN.NS", ticker_type: "INDIA" },
];

let state = {
  meta: { strategy: "pred_rf_0.55", generated_at: "—" },
  defaults: { trade_notional_usd: 100, fee_rate: 0.002 },
  thresholdGrid: [],
  useApi: false,
};

function fmtNum(n, digits = 2) {
  if (n == null || Number.isNaN(n)) return "—";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: digits });
}

function scaleSimulation(sim, notional, fee) {
  const baseN = state.defaults.trade_notional_usd || 100;
  const baseF = state.defaults.fee_rate || 0.002;
  if (!sim || baseN <= 0) return sim;
  const r = notional / baseN;
  const feeFactor = fee / baseF;
  const out = { ...sim };
  if (out.net_pnl_usd != null) {
    out.net_pnl_usd = out.net_pnl_usd * r * (0.85 + 0.15 * feeFactor);
  }
  if (out.assumed_capital_usd != null) {
    out.assumed_capital_usd = out.assumed_capital_usd * r;
  }
  return out;
}

async function loadFromApi() {
  const [meta, gridRes] = await Promise.all([
    fetch("/v1/meta").then((r) => r.json()),
    fetch("/v1/threshold-grid").then((r) => r.json()),
  ]);
  state.meta = meta;
  state.useApi = true;
  const g = gridRes.grid || [];
  if (g.length > 0) {
    state.thresholdGrid = g.map((row) => ({
      threshold: row.threshold,
      test_trades: row.test_trades,
      net_pnl_usd: row.net_pnl_usd,
      assumed_capital_usd: row.assumed_capital_usd,
      cagr_approx: row.cagr_approx,
    }));
  }
  if (gridRes.defaults) state.defaults = gridRes.defaults;
  return true;
}

function loadMockOnly() {
  state.useApi = false;
  state.meta = { strategy: "pred_rf_0.55", generated_at: new Date().toISOString() };
  state.thresholdGrid = MOCK_GRID;
}

async function fetchRun(threshold, tickerFilter) {
  const q = `threshold=${threshold}`;
  const [sim, sig] = await Promise.all([
    fetch(`/v1/simulation?${q}`).then((r) => r.json()),
    fetch(`/v1/signals/latest?${q}`).then((r) => r.json()),
  ]);
  return { sim, signals: sig.signals || [], tickerFilter };
}

function nearestFromGrid(threshold) {
  const grid = state.thresholdGrid.length ? state.thresholdGrid : MOCK_GRID;
  let best = grid[0];
  let bestDist = Math.abs(threshold - best.threshold);
  for (const row of grid) {
    const d = Math.abs(threshold - row.threshold);
    if (d < bestDist) {
      best = row;
      bestDist = d;
    }
  }
  return {
    ...best,
    threshold_selected: threshold,
    pred_column: `pred_rf_${threshold.toFixed(2)}`,
  };
}

function renderKpis(sim) {
  const cards = [
    ["CAGR (approx.)", fmtNum(sim.cagr_approx, 3)],
    ["Net P&L (USD)", fmtNum(sim.net_pnl_usd, 1)],
    ["Test trades", fmtNum(sim.test_trades, 0)],
    ["Assumed capital", fmtNum(sim.assumed_capital_usd, 0)],
  ];
  const el = document.getElementById("kpis");
  el.innerHTML = cards
    .map(
      ([label, value]) =>
        `<div class="kpi flash"><label>${label}</label><div class="value">${value}</div></div>`
    )
    .join("");
  window.setTimeout(() => el.querySelectorAll(".kpi").forEach((k) => k.classList.remove("flash")), 400);
}

function renderSignals(rows, filter) {
  const q = (filter || "").trim().toUpperCase();
  const filtered = (rows || []).filter((r) => !q || String(r.ticker).toUpperCase().includes(q));
  const body = document.getElementById("signals-body");
  body.innerHTML = filtered.length
    ? filtered
        .map(
          (r) =>
            `<tr><td class="num">${r.date}</td><td class="ticker">${r.ticker}</td><td>${r.ticker_type || ""}</td></tr>`
        )
        .join("")
    : `<tr class="empty-row"><td colspan="3">No signals match filter.</td></tr>`;
}

function readControls() {
  const threshold = parseFloat(document.getElementById("threshold").value);
  const notional = parseFloat(document.getElementById("notional").value) || 100;
  const fee = parseFloat(document.getElementById("fee").value) || 0.002;
  const tickerFilter = document.getElementById("ticker-filter").value;
  return { threshold, notional, fee, tickerFilter };
}

function syncThresholdLabel() {
  const v = document.getElementById("threshold").value;
  document.getElementById("threshold-val").textContent = parseFloat(v).toFixed(2);
}

async function runSimulation() {
  const results = document.getElementById("results");
  const btn = document.getElementById("btn-run");
  const { threshold, notional, fee, tickerFilter } = readControls();
  results.classList.add("loading");
  btn.disabled = true;
  btn.textContent = "Running…";

  let sim;
  let signals = [];

  try {
    if (state.useApi) {
      const run = await fetchRun(threshold, tickerFilter);
      sim = scaleSimulation(run.sim, notional, fee);
      signals = run.signals;
    } else {
      await new Promise((r) => setTimeout(r, 350));
      sim = scaleSimulation(nearestFromGrid(threshold), notional, fee);
      signals = MOCK_SIGNALS;
    }
  } catch (e) {
    sim = nearestFromGrid(threshold);
    signals = MOCK_SIGNALS;
    console.warn(e);
  }

  document.getElementById("run-meta").textContent =
    `Strategy ${sim.pred_column || "—"} · artifact ${state.meta.generated_at || "—"}`;
  renderKpis(sim);
  renderSignals(signals, tickerFilter);
  results.classList.remove("loading");
  btn.disabled = false;
  btn.textContent = "Update simulation";
}

function bindUi() {
  document.getElementById("threshold").addEventListener("input", () => {
    syncThresholdLabel();
    if (state.useApi && state.thresholdGrid.length > 1) {
      runSimulation();
    }
  });
  document.getElementById("btn-run").addEventListener("click", () => runSimulation());
  document.getElementById("ticker-filter").addEventListener("input", () => {
    const { threshold, tickerFilter } = readControls();
    if (state.useApi) {
      fetch(`/v1/signals/latest?threshold=${threshold}`)
        .then((r) => r.json())
        .then((d) => renderSignals(d.signals, tickerFilter));
    } else {
      renderSignals(MOCK_SIGNALS, tickerFilter);
    }
  });
}

async function init() {
  bindUi();
  syncThresholdLabel();
  try {
    await loadFromApi();
    const n = state.thresholdGrid.length;
    document.getElementById("preview-badge").textContent =
      n > 1 ? `Live · ${n} thresholds` : "Live (re-run export for grid)";
  } catch {
    loadMockOnly();
    document.getElementById("preview-badge").textContent = "UI preview (mock data)";
    document.getElementById("run-meta").textContent = "Offline preview — start API for live artifact";
  }
  const def = state.thresholdGrid[0]?.threshold ?? 0.55;
  document.getElementById("threshold").value = String(def);
  syncThresholdLabel();
  await runSimulation();
}

document.addEventListener("DOMContentLoaded", init);