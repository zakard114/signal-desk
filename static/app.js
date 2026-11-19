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
  runHistory: [],
};

const sessionLog = [];
const RUN_HISTORY_MAX = 8;

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

async function fetchJson(path, options = {}) {
  const { skipSessionLog = false } = options;
  const t0 = performance.now();
  const res = await fetch(path);
  const ms = performance.now() - t0;
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!skipSessionLog) {
    logApi({ method: "GET", path, status: res.status, ms, ok: res.ok });
  }
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

const HOLD = "#6dcca4";
const RISK = "#e39a94";
const SEA = "#7eb8d8";
const SAFFRON = "#e0b45c";
const GRID = "rgba(231,238,244,0.16)";
const AXIS = "rgba(231,238,244,0.62)";

let boardTimer = null;

function stopBoard() {
  if (boardTimer) {
    clearInterval(boardTimer);
    boardTimer = null;
  }
}

function statusColor(status) {
  const code = Number(status);
  if (code >= 200 && code < 300) return HOLD;
  if (code >= 400) return RISK;
  return SAFFRON;
}

function logStatusClass(row) {
  if (row.method === "—") return "log-status-warn";
  const code = Number(row.status);
  if (row.ok === false || code >= 400) return "log-status-err";
  return "log-status-ok";
}

const CHART_W = 640;
const CHART_H = 180;
const CHART_PAD = { l: 44, r: 12, t: 12, b: 26 };

function chartGridParts(ceiling, innerW, innerH, padL, padT, width, padR, gridOpts) {
  const opts = gridOpts || {};
  const ySuffix = opts.ySuffix || "";
  const parts = [];
  for (let tick = 0; tick <= 3; tick += 1) {
    const y = padT + innerH - (innerH * tick) / 3;
    const label = (ceiling * tick) / 3;
    let text;
    if (opts.axisPercent) {
      text = `${Math.round((label / ceiling) * 100)}%`;
    } else if (opts.axisMs) {
      text = label >= 100 ? label.toFixed(0) : label >= 10 ? label.toFixed(0) : label.toFixed(1);
      text += ySuffix;
    } else {
      text = ceiling >= 10 ? label.toFixed(0) : label.toFixed(2);
      text += ySuffix;
    }
    parts.push(
      `<line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="${GRID}" stroke-width="1" />`
    );
    parts.push(
      `<text x="${padL - 8}" y="${y + 4}" fill="${AXIS}" font-size="10" text-anchor="end">${text}</text>`
    );
  }
  return parts;
}

function chartTimeFooter(parts, padL, innerW, baseY, width, padR) {
  const labels = ["−15m", "−10m", "−5m", "now"];
  labels.forEach((label, i) => {
    const x = padL + (innerW * i) / (labels.length - 1);
    parts.push(
      `<text x="${x.toFixed(1)}" y="${baseY + 16}" fill="${AXIS}" font-size="9" text-anchor="middle">${label}</text>`
    );
  });
  parts.push(
    `<line x1="${padL}" y1="${baseY + 1}" x2="${width - padR}" y2="${baseY + 1}" stroke="${GRID}" stroke-width="1" />`
  );
}

function bucketErrorRatios(buckets) {
  return buckets.map((bucket) => {
    const rates = bucket.rates || {};
    let err = 0;
    let total = 0;
    Object.entries(rates).forEach(([code, rps]) => {
      const v = Number(rps) || 0;
      total += v;
      if (Number(code) >= 400) err += v;
    });
    return total > 0 ? err / total : 0;
  });
}

function seriesPoints(values, innerW, innerH, padL, padT, ceiling) {
  if (!values.length) return [];
  const denom = Math.max(values.length - 1, 1);
  return values.map((value, index) => {
    const x = padL + (innerW * index) / denom;
    const y = padT + innerH - (innerH * Math.min(Number(value), ceiling)) / ceiling;
    return { x, y };
  });
}

function drawAreaChart(svg, seriesList, yMax) {
  if (!svg) return;
  const { l: padL, r: padR, t: padT, b: padB } = CHART_PAD;
  const innerW = CHART_W - padL - padR;
  const innerH = CHART_H - padT - padB;
  const baseY = padT + innerH;
  const ceiling = yMax > 0 ? yMax : 1;
  const parts = chartGridParts(ceiling, innerW, innerH, padL, padT, CHART_W, padR);
  let defs = "";
  seriesList.forEach((seriesItem, si) => {
    const values = seriesItem.values || [];
    if (!values.length) return;
    const gradId = `area-${svg.id || "c"}-${si}`;
    const stroke = seriesItem.color;
    defs += `<linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${stroke}" stop-opacity="0.5"/><stop offset="100%" stop-color="${stroke}" stop-opacity="0.03"/></linearGradient>`;
    const pts = seriesPoints(values, innerW, innerH, padL, padT, ceiling);
    const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const poly = `${pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} ${pts[pts.length - 1].x.toFixed(1)},${baseY} ${pts[0].x.toFixed(1)},${baseY}`;
    parts.push(`<polygon points="${poly}" fill="url(#${gradId})" />`);
    parts.push(
      `<polyline fill="none" stroke="${stroke}" stroke-width="2.25" stroke-linejoin="round" points="${line}" />`
    );
    const last = pts[pts.length - 1];
    parts.push(`<circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="3.5" fill="${stroke}" />`);
  });
  svg.innerHTML = `<defs>${defs}</defs>${parts.join("")}`;
}

function drawLineChart(svg, seriesList, yMax, gridOpts) {
  if (!svg) return;
  const { l: padL, r: padR, t: padT, b: padB } = CHART_PAD;
  const innerW = CHART_W - padL - padR;
  const innerH = CHART_H - padT - padB;
  const baseY = padT + innerH;
  const ceiling = yMax > 0 ? yMax : 1;
  const parts = chartGridParts(ceiling, innerW, innerH, padL, padT, CHART_W, padR, gridOpts);
  seriesList.forEach((seriesItem) => {
    const values = seriesItem.values || [];
    if (!values.length) return;
    const stroke = seriesItem.color;
    const pts = seriesPoints(values, innerW, innerH, padL, padT, ceiling);
    const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    parts.push(
      `<polyline fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${line}" />`
    );
    pts.forEach((p, i) => {
      if (values.length <= 12 || i === pts.length - 1) {
        parts.push(`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.5" fill="${stroke}" />`);
      }
    });
  });
  if (!gridOpts?.hideTimeAxis) {
    chartTimeFooter(parts, padL, innerW, baseY, CHART_W, padR);
  }
  svg.innerHTML = parts.join("");
}

function drawObsAreaLineChart(svg, seriesList, yMax, gridOpts) {
  if (!svg) return;
  const { l: padL, r: padR, t: padT, b: padB } = CHART_PAD;
  const innerW = CHART_W - padL - padR;
  const innerH = CHART_H - padT - padB;
  const baseY = padT + innerH;
  const ceiling = yMax > 0 ? yMax : 1;
  const parts = chartGridParts(ceiling, innerW, innerH, padL, padT, CHART_W, padR, gridOpts);
  let defs = "";
  seriesList.forEach((seriesItem, si) => {
    const values = seriesItem.values || [];
    if (!values.length) return;
    const stroke = seriesItem.color;
    const pts = seriesPoints(values, innerW, innerH, padL, padT, ceiling);
    const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    if (seriesItem.area) {
      const gradId = `obs-${svg.id || "o"}-${si}`;
      defs += `<linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${stroke}" stop-opacity="0.55"/><stop offset="88%" stop-color="${stroke}" stop-opacity="0.08"/><stop offset="100%" stop-color="${stroke}" stop-opacity="0"/></linearGradient>`;
      const poly = `${pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} ${pts[pts.length - 1].x.toFixed(1)},${baseY} ${pts[0].x.toFixed(1)},${baseY}`;
      parts.push(`<polygon points="${poly}" fill="url(#${gradId})" />`);
    }
    parts.push(
      `<polyline fill="none" stroke="${stroke}" stroke-width="${seriesItem.area ? 2.25 : 1.75}" stroke-linecap="round" stroke-linejoin="round" points="${line}" />`
    );
    if (seriesItem.area && pts.length) {
      const last = pts[pts.length - 1];
      parts.push(`<circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="3" fill="${stroke}" />`);
    }
  });
  chartTimeFooter(parts, padL, innerW, baseY, CHART_W, padR);
  svg.innerHTML = `<defs>${defs}</defs>${parts.join("")}`;
}

function drawStepAreaChart(svg, values, stroke, yMax, gridOpts) {
  if (!svg) return;
  if (!values.length) {
    svg.innerHTML = "";
    return;
  }
  const { l: padL, r: padR, t: padT, b: padB } = CHART_PAD;
  const innerW = CHART_W - padL - padR;
  const innerH = CHART_H - padT - padB;
  const baseY = padT + innerH;
  const ceiling = yMax > 0 ? yMax : 1;
  const gradId = `step-${svg.id || "r"}`;
  const parts = chartGridParts(ceiling, innerW, innerH, padL, padT, CHART_W, padR);
  const n = values.length;
  const slot = innerW / Math.max(n, 1);
  let lineD = "";
  let areaD = `M ${padL} ${baseY}`;
  values.forEach((value, index) => {
    const y = padT + innerH - (innerH * Math.min(Number(value), ceiling)) / ceiling;
    const x0 = padL + index * slot;
    const x1 = padL + (index + 1) * slot;
    if (index === 0) lineD += `M ${x0} ${y}`;
    else lineD += ` H ${x0} V ${y}`;
    lineD += ` H ${x1}`;
    areaD += ` L ${x0} ${baseY} L ${x0} ${y} L ${x1} ${y}`;
  });
  areaD += ` L ${padL + innerW} ${baseY} Z`;
  const defs = `<linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${stroke}" stop-opacity="0.55"/><stop offset="100%" stop-color="${stroke}" stop-opacity="0.02"/></linearGradient>`;
  parts.push(`<path d="${areaD}" fill="url(#${gradId})" />`);
  parts.push(`<path fill="none" stroke="${stroke}" stroke-width="2.25" d="${lineD}" />`);
  chartTimeFooter(parts, padL, innerW, baseY, CHART_W, padR);
  svg.innerHTML = `<defs>${defs}</defs>${parts.join("")}`;
}

function drawHistogram(svg, values, color) {
  if (!svg) return;
  const { l: padL, r: padR, t: padT, b: padB } = CHART_PAD;
  const innerW = CHART_W - padL - padR;
  const innerH = CHART_H - padT - padB;
  const baseY = padT + innerH;
  const nums = values.map(Number).filter((v) => !Number.isNaN(v) && v >= 0);
  if (!nums.length) {
    svg.innerHTML = "";
    return;
  }
  const bins = 14;
  const maxLat = Math.max(...nums, 1);
  const counts = Array(bins).fill(0);
  nums.forEach((v) => {
    const idx = Math.min(bins - 1, Math.floor((v / maxLat) * bins));
    counts[idx] += 1;
  });
  const ceiling = Math.max(...counts, 1);
  const parts = chartGridParts(ceiling, innerW, innerH, padL, padT, CHART_W, padR);
  const slot = innerW / bins;
  const barW = slot * 0.72;
  counts.forEach((count, index) => {
    const h = (innerH * count) / ceiling;
    const x = padL + index * slot + (slot - barW) / 2;
    const y = baseY - h;
    parts.push(
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(h, 0).toFixed(1)}" rx="2" fill="${color}" fill-opacity="0.92" />`
    );
  });
  svg.innerHTML = parts.join("");
}

function drawBars(svg, items, yMax) {
  if (!svg) return;
  const { l: padL, r: padR, t: padT, b: padB } = CHART_PAD;
  const innerW = CHART_W - padL - padR;
  const innerH = CHART_H - padT - padB;
  const ceiling = yMax > 0 ? yMax : 1;
  const parts = chartGridParts(ceiling, innerW, innerH, padL, padT, CHART_W, padR);
  const n = Math.max(items.length, 1);
  const slot = innerW / n;
  const barW = Math.min(72, slot * 0.55);
  items.forEach((item, index) => {
    const h = (innerH * Math.min(item.value, ceiling)) / ceiling;
    const x = padL + slot * index + (slot - barW) / 2;
    const y = padT + innerH - h;
    parts.push(
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(h, 0).toFixed(1)}" rx="3" fill="${item.color}" fill-opacity="0.9" />`
    );
    parts.push(
      `<text x="${(x + barW / 2).toFixed(1)}" y="${CHART_H - 8}" fill="${AXIS}" font-size="10" text-anchor="middle">${item.label}</text>`
    );
  });
  svg.innerHTML = parts.join("");
}

function renderLegend(id, items) {
  const box = document.getElementById(id);
  if (!box) return;
  box.replaceChildren();
  items.forEach((item) => {
    const span = document.createElement("span");
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.background = item.color;
    span.append(swatch, document.createTextNode(item.label));
    box.appendChild(span);
  });
}

function paintCharts(board) {
  const buckets = board.buckets || [];
  const rateValues = buckets.map((bucket) =>
    Object.values(bucket.rates || {}).reduce((sum, v) => sum + Number(v || 0), 0)
  );
  const rateMax = Math.max(...rateValues, 0.01);
  drawStepAreaChart(document.getElementById("chart-rate"), rateValues, SEA, rateMax);
  renderLegend("rate-legend", [{ color: SEA, label: "rps (all statuses)" }]);

  const errRatios = bucketErrorRatios(buckets);
  const errMax = Math.max(...errRatios, 0.05, 0.01);
  drawLineChart(
    document.getElementById("chart-error"),
    [{ color: RISK, values: errRatios }],
    errMax,
    { axisPercent: true }
  );
  renderLegend("error-legend", [{ color: RISK, label: "4xx+5xx / total" }]);

  const p95 = buckets.map((bucket) => Number(bucket.p95 || 0));
  const p99 = buckets.map((bucket) => Number(bucket.p99 || 0));
  let latMax = Math.max(...p95, ...p99, 0);
  const latGridOpts = { axisMs: true, ySuffix: " ms" };
  const rawLat = (board.series && board.series.latency_ms) || [];
  let latSeries;
  if (latMax === 0 && rawLat.length) {
    latSeries = [{ color: SAFFRON, area: true, values: rawLat.map(Number) }];
    latMax = Math.max(...rawLat, 1);
    renderLegend("latency-legend", [{ color: SAFFRON, label: "Latency (per request)" }]);
  } else {
    latMax = Math.max(latMax, 1);
    latSeries = [
      { color: SAFFRON, area: true, values: p95 },
      { color: SEA, values: p99 },
    ];
    renderLegend("latency-legend", [
      { color: SAFFRON, label: "P95" },
      { color: SEA, label: "P99" },
    ]);
  }
  drawObsAreaLineChart(document.getElementById("chart-latency"), latSeries, latMax, latGridOpts);

  const auditLat = (board.audit || []).map((r) => Number(r.latency_ms)).filter((v) => !Number.isNaN(v));
  drawHistogram(document.getElementById("chart-latency-hist"), auditLat, SAFFRON);
  renderLegend("lat-hist-legend", [{ color: SAFFRON, label: `Recent requests (n=${auditLat.length})` }]);

  const counts = board.status_counts || {};
  const barItems = Object.keys(counts)
    .sort()
    .map((code) => ({
      label: code,
      value: Number(counts[code] || 0),
      color: statusColor(code),
    }));
  const barMax = barItems.reduce((max, item) => Math.max(max, item.value), 0);
  drawBars(document.getElementById("chart-status"), barItems, barMax);
  renderLegend(
    "status-legend",
    barItems.map((item) => ({ color: item.color, label: "HTTP " + item.label }))
  );
}

function paintAudit(rows) {
  const boardBody = document.getElementById("board-body");
  const note = document.getElementById("audit-filter");
  if (!boardBody) return;
  if (!rows.length) {
    if (note) note.textContent = "No requests yet. Run Update simulation on the desk.";
    boardBody.innerHTML = '<tr><td colspan="8">No server audit rows yet.</td></tr>';
    return;
  }
  if (note) note.textContent = `${rows.length} line${rows.length === 1 ? "" : "s"} on this process.`;
  boardBody.innerHTML = rows
    .map((r) => {
      const ex = r.extra || {};
      const httpErr = Number(r.status) >= 400;
      const isSim = String(r.path || "").includes("simulation");
      const cagr = ex.cagr_approx != null ? Number(ex.cagr_approx).toFixed(3) : "—";
      const thr = ex.threshold != null ? Number(ex.threshold).toFixed(2) : "—";
      const sigs = ex.signal_count != null ? String(ex.signal_count) : "—";
      const cls = [httpErr ? "error" : "", isSim ? "sim" : ""].filter(Boolean).join(" ");
      const stCls = httpErr ? "" : "status-2xx";
      return `<tr class="${cls}"><td>${r.time || "—"}</td><td class="${stCls}">${r.status ?? "—"}</td><td>${r.method || "—"}</td><td class="path">${r.path || "—"}</td><td class="num">${r.latency_ms ?? "—"}</td><td class="p">${cagr}</td><td>${thr}</td><td>${sigs}</td></tr>`;
    })
    .join("");
}

async function refreshBoard() {
  const { threshold } = readControls();
  const thrEl = document.getElementById("m-thr");
  if (thrEl) thrEl.textContent = threshold.toFixed(2);
  try {
    const board = await fetchJson("/ops/board", { skipSessionLog: true });
    const stats = board.stats || {};
    const requests = stats.requests ?? board.request_count ?? 0;
    const rate = Number(stats.error_rate ?? board.error_rate ?? 0);
    const avgMs = stats.avg_ms ?? board.avg_latency_ms;
    const errors = board.error_count ?? 0;
    document.getElementById("m-requests").textContent = String(requests);
    const errEl = document.getElementById("m-errors");
    errEl.textContent = `${(rate * 100).toFixed(1)}%`;
    errEl.className = rate > 0 ? "stop" : "ok";
    const latEl = document.getElementById("m-latency");
    latEl.textContent = avgMs == null ? "0 ms" : `${avgMs} ms`;
    latEl.className = "ok";
    document.getElementById("m-count").textContent = String(board.simulation_count ?? 0);
    const highEl = document.getElementById("m-high");
    highEl.textContent = String(errors);
    highEl.className = errors > 0 ? "stop" : "ok";
    paintCharts(board);
    paintAudit(board.audit || []);
  } catch (e) {
    console.warn(e);
  }
}

function loadGrafana() {
  refreshBoard().catch(() => {});
  stopBoard();
  boardTimer = setInterval(() => {
    const panel = document.querySelector('[data-panel="grafana"]');
    if (!panel || panel.hidden) {
      stopBoard();
      return;
    }
    refreshBoard().catch(() => {});
  }, 4000);
}

function refreshOpsAll() {
  refreshInspector();
  refreshOpsLog();
  refreshBoard().catch(() => {});
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

function pushRunHistory(sim, threshold) {
  if (!sim) return;
  state.runHistory.unshift({
    time: new Date().toLocaleTimeString(),
    threshold: Number(threshold),
    cagr: sim.cagr_approx,
    trades: sim.test_trades,
    pnl: sim.net_pnl_usd,
  });
  if (state.runHistory.length > RUN_HISTORY_MAX) {
    state.runHistory.length = RUN_HISTORY_MAX;
  }
  renderRunHistory();
}

function renderRunHistory() {
  const wrap = document.getElementById("run-history");
  const list = document.getElementById("run-history-list");
  if (!list || !wrap) return;
  if (!state.runHistory.length) {
    wrap.hidden = true;
    list.innerHTML = "";
    return;
  }
  wrap.hidden = false;
  list.innerHTML = state.runHistory
    .map((row) => {
      const thr = Number.isFinite(row.threshold) ? row.threshold.toFixed(2) : "—";
      return `<li><span class="run-time">${row.time}</span><strong>@${thr}</strong> · CAGR ${fmtNum(row.cagr, 3)} · trades ${fmtNum(row.trades, 0)} · P&amp;L ${fmtNum(row.pnl, 1)}</li>`;
    })
    .join("");
}

function renderKpis(sim) {
  const pnl = sim.net_pnl_usd;
  const pnlClass =
    pnl != null && !Number.isNaN(Number(pnl)) && Number(pnl) < 0 ? "kpi-pnl-neg" : "kpi-pnl-pos";
  const cards = [
    ["CAGR (approx.)", fmtNum(sim.cagr_approx, 3), "kpi-cagr"],
    ["Net P&L (USD)", fmtNum(sim.net_pnl_usd, 1), pnlClass],
    ["Test trades", fmtNum(sim.test_trades, 0), ""],
    ["Assumed capital", fmtNum(sim.assumed_capital_usd, 0), ""],
  ];
  const el = document.getElementById("kpis");
  el.innerHTML = cards
    .map(
      ([label, value, valueClass]) =>
        `<div class="kpi flash"><label>${label}</label><div class="value ${valueClass}">${value}</div></div>`
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
            `<tr><td class="num">${r.date}</td><td class="ticker">${r.ticker}</td><td class="signal-type">${r.ticker_type || ""}</td></tr>`
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

function defaultDeskControls() {
  const grid = state.thresholdGrid.length ? state.thresholdGrid : MOCK_GRID;
  const thr =
    grid.find((r) => r.threshold === 0.55)?.threshold ??
    grid[0]?.threshold ??
    0.55;
  return {
    threshold: thr,
    notional: state.defaults.trade_notional_usd || 100,
    fee: state.defaults.fee_rate || 0.002,
    tickerFilter: "",
  };
}

async function resetDeskInputs() {
  const d = defaultDeskControls();
  document.getElementById("threshold").value = String(d.threshold);
  document.getElementById("notional").value = String(d.notional);
  document.getElementById("fee").value = String(d.fee);
  document.getElementById("ticker-filter").value = "";
  syncThresholdLabel();
  syncApiSample();
  await runSimulation({ recordHistory: true });
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
    title.className = "entry-title";
  }

  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text ?? "—";
  };
  set("insp-mode", mode);
  const modeEl = document.getElementById("insp-mode");
  if (modeEl) modeEl.className = state.useApi ? "live" : "mock";
  set("insp-health", healthText);
  const healthEl = document.getElementById("insp-health");
  if (healthEl) {
    healthEl.className =
      health && health.status === "ok" && health.artifact_exists ? "ok" : health ? "bad" : "";
  }
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
      const stCls = logStatusClass(row);
      return `<li><span class="log-time">${row.time}</span><span class="log-meth">${row.method}</span><span class="log-path">${row.path}</span><span class="log-status ${stCls}">${row.status} · ${row.ms}ms</span></li>`;
    })
    .join("");
}

function syncApiSample() {
  const el = document.getElementById("api-sample");
  if (!el) return;
  const base = window.location.origin;
  const thr = readControls().threshold.toFixed(2);
  el.textContent = `GET ${base}/v1/simulation?threshold=${thr}
GET ${base}/v1/signals/latest?threshold=${thr}
GET ${base}/health
GET ${base}/ops/board`;
}

function showApiResponse(data) {
  const el = document.getElementById("api-response");
  if (!el) return;
  el.textContent = JSON.stringify(data, null, 2);
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
    syncApiSample();
    refreshOpsAll();
    const grafanaOn = document.querySelector('.tab[data-tab="grafana"]')?.classList.contains("on");
    if (grafanaOn) loadGrafana();
    if (window.history.replaceState) {
      window.history.replaceState(null, "", "/?view=ops");
    }
  };

  const showDesk = () => {
    stopBoard();
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
      if (name === "grafana") loadGrafana();
      else stopBoard();
      if (name === "api") syncApiSample();
    });
  });

  document.querySelectorAll(".try-api").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const path = btn.getAttribute("data-path");
      if (!path) return;
      let url = path;
      if (btn.getAttribute("data-threshold") === "1") {
        url = `${path}?threshold=${readControls().threshold}`;
      }
      try {
        const data = await fetchJson(url);
        showApiResponse(data);
        syncApiSample();
        refreshInspector();
      } catch (e) {
        showApiResponse({ error: String(e.message || e) });
      }
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

async function runSimulation(opts = {}) {
  const { recordHistory = false } = opts;
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
  if (recordHistory) {
    pushRunHistory(sim, threshold);
  }
  state.lastSignalCount = renderSignals(signals, tickerFilter);
  refreshInspector();
  refreshBoard().catch(() => {});
  results.classList.remove("loading");
  btn.disabled = false;
  btn.textContent = "Update simulation";
}

function bindUi() {
  document.getElementById("threshold").addEventListener("input", () => {
    syncThresholdLabel();
    syncApiSample();
  });
  document.getElementById("btn-run").addEventListener("click", () => runSimulation({ recordHistory: true }));
  document.getElementById("btn-reset").addEventListener("click", () => resetDeskInputs());
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
  syncApiSample();
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