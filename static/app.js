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
  health: null,
  lastSim: null,
  lastSignalCount: 0,
};

const sessionLog = [];

function fmtNum(n, digits = 2) {
  if (n == null || Number.isNaN(n)) return "—";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: digits });
}

function logApi({ method, path, status, ms, ok }) {
  sessionLog.unshift({
    time: new Date().toLocaleTimeString(),
    method,
    path,
    status,
    ms: Math.round(ms),
    ok,
  });
  if (sessionLog.length > 60) sessionLog.pop();
  refreshOpsLog();
}

async function fetchJson(path) {
  const t0 = performance.now();
  const res = await fetch(path);
  const ms = performance.now() - t0;
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  logApi({ method: "GET", path, status: res.status, ms, ok: res.ok });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
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
    fetchJson("/v1/meta"),
    fetchJson("/v1/threshold-grid"),
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

async function fetchRun(threshold) {
  const q = `threshold=${threshold}`;
  const [sim, sig] = await Promise.all([
    fetchJson(`/v1/simulation?${q}`),
    fetchJson(`/v1/signals/latest?${q}`),
  ]);
  return { sim, signals: sig.signals || [] };
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
  return filtered.length;
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

function refreshInspector() {
  const title = document.getElementById("insp-title");
  if (!title) return;
  const sim = state.lastSim;
  const mode = state.useApi ? "LIVE (artifact)" : "MOCK (offline)";
  const health = state.health;
  const healthText =
    health && health.status === "ok"
      ? health.artifact_exists
        ? "ok · artifact present"
        : "ok · artifact missing"
      : health
        ? String(health.status || "unknown")
        : "—";

  if (!sim) {
    title.textContent = "No simulation yet";
    title.className = "entry-title";
  } else {
    title.textContent = `Simulation @ ${sim.threshold_selected != null ? sim.threshold_selected.toFixed(2) : "—"}`;
    title.className = "entry-title ok";
  }

  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text ?? "—";
  };
  set("insp-mode", mode);
  set("insp-health", healthText);
  set("insp-threshold", sim?.threshold_selected != null ? sim.threshold_selected.toFixed(2) : "—");
  set("insp-pred", sim?.pred_column || state.meta.strategy || "—");
  set("insp-cagr", sim ? fmtNum(sim.cagr_approx, 3) : "—");
  set("insp-trades", sim ? fmtNum(sim.test_trades, 0) : "—");
  set("insp-pnl", sim ? fmtNum(sim.net_pnl_usd, 1) : "—");
  set("insp-signals", String(state.lastSignalCount));
  set("insp-artifact", health?.artifact ? "on disk in image" : "—");
  set("insp-generated", state.meta.generated_at || "—");
  set("insp-source", state.meta.source || "—");
}

function refreshOpsLog() {
  const list = document.getElementById("log-list");
  if (!list) return;
  if (!sessionLog.length) {
    list.innerHTML = '<li class="log-empty">No API calls in this session yet.</li>';
    return;
  }
  list.innerHTML = sessionLog
    .map((row) => {
      const cls = row.ok ? "ok" : "err";
      return `<li class="${cls}"><span>${row.time}</span><span>${row.method}</span><span>${row.path}</span><span>${row.status} · ${row.ms}ms</span></li>`;
    })
    .join("");
}

function setApiSampleBase() {
  const el = document.getElementById("api-sample");
  if (!el) return;
  const base = window.location.origin;
  el.textContent = `GET ${base}/v1/simulation?threshold=0.55
GET ${base}/v1/signals/latest?threshold=0.55
GET ${base}/health`;
}

function bindOpsUi() {
  const deskShell = document.getElementById("desk-shell");
  const opsStage = document.getElementById("ops-stage");
  const openOps = document.getElementById("open-ops");
  const closeOps = document.getElementById("close-ops");
  if (!opsStage || !openOps || !closeOps || !deskShell) return;

  const showOps = () => {
    deskShell.hidden = true;
    opsStage.hidden = false;
    document.body.classList.add("mode-ops");
    document.body.classList.remove("mode-desk");
    refreshInspector();
    refreshOpsLog();
    if (window.history.replaceState) {
      window.history.replaceState(null, "", "/?view=ops");
    }
  };

  const showDesk = () => {
    opsStage.hidden = true;
    deskShell.hidden = false;
    document.body.classList.add("mode-desk");
    document.body.classList.remove("mode-ops");
    if (window.history.replaceState) {
      window.history.replaceState(null, "", "/");
    }
  };

  openOps.addEventListener("click", showOps);
  closeOps.addEventListener("click", showDesk);

  document.querySelectorAll(".ops-head .tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.getAttribute("data-tab");
      document.querySelectorAll(".ops-head .tab").forEach((b) => {
        b.classList.toggle("on", b === btn);
        b.setAttribute("aria-selected", b === btn ? "true" : "false");
      });
      document.querySelectorAll("[data-panel]").forEach((panel) => {
        panel.hidden = panel.getAttribute("data-panel") !== name;
      });
    });
  });

  const params = new URLSearchParams(window.location.search);
  if (params.get("view") === "ops" || window.location.pathname === "/ops") {
    showOps();
  } else {
    document.body.classList.add("mode-desk");
  }
}

async function loadHealth() {
  try {
    state.health = await fetchJson("/health");
  } catch {
    state.health = { status: "unreachable", artifact_exists: false };
  }
  refreshInspector();
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
      const run = await fetchRun(threshold);
      sim = scaleSimulation(run.sim, notional, fee);
      signals = run.signals;
    } else {
      await new Promise((r) => setTimeout(r, 350));
      sim = scaleSimulation(nearestFromGrid(threshold), notional, fee);
      signals = MOCK_SIGNALS;
      logApi({
        method: "—",
        path: "mock simulation",
        status: 200,
        ms: 350,
        ok: true,
      });
    }
  } catch (e) {
    sim = scaleSimulation(nearestFromGrid(threshold), notional, fee);
    signals = MOCK_SIGNALS;
    console.warn(e);
  }

  state.lastSim = sim;
  document.getElementById("run-meta").textContent =
    `Strategy ${sim.pred_column || "—"} · artifact ${state.meta.generated_at || "—"}`;
  renderKpis(sim);
  state.lastSignalCount = renderSignals(signals, tickerFilter);
  refreshInspector();
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
      fetchJson(`/v1/signals/latest?threshold=${threshold}`)
        .then((d) => {
          state.lastSignalCount = renderSignals(d.signals, tickerFilter);
          refreshInspector();
        })
        .catch(() => renderSignals(MOCK_SIGNALS, tickerFilter));
    } else {
      state.lastSignalCount = renderSignals(MOCK_SIGNALS, tickerFilter);
      refreshInspector();
    }
  });
}

async function init() {
  bindOpsUi();
  setApiSampleBase();
  bindUi();
  syncThresholdLabel();
  try {
    await loadFromApi();
    const n = state.thresholdGrid.length;
    document.getElementById("preview-badge").textContent =
      n > 1 ? `Live · ${n} thresholds` : "Live (re-run export for grid)";
    await loadHealth();
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