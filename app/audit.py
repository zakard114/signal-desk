"""In-process request audit for GET /ops/board (HoldRisk-style Grafana tab)."""

from __future__ import annotations

import threading
import time
from collections import deque

_AUDIT_LOCK = threading.Lock()
_AUDIT: deque = deque(maxlen=200)
_STARTED = time.time()
_BUCKET_S = 30
_N_BUCKETS = 30

SKIP_PATHS = {"/ops/board", "/health", "/favicon.ico"}
SKIP_PREFIXES = ("/static", "/docs", "/redoc", "/openapi")


def should_audit(path: str) -> bool:
    if path in SKIP_PATHS:
        return False
    return not any(path.startswith(p) for p in SKIP_PREFIXES)


def record(
    path: str,
    status: int,
    latency_ms: float,
    *,
    method: str = "GET",
    extra: dict | None = None,
) -> None:
    row = {
        "time": time.strftime("%H:%M:%S"),
        "ts": time.time(),
        "method": method,
        "path": path,
        "status": int(status),
        "latency_ms": round(float(latency_ms), 1),
        "extra": extra or {},
    }
    with _AUDIT_LOCK:
        _AUDIT.appendleft(row)


def _percentile(values: list[float], q: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    if len(ordered) == 1:
        return round(float(ordered[0]), 2)
    pos = (len(ordered) - 1) * q
    lo = int(pos)
    hi = min(lo + 1, len(ordered) - 1)
    frac = pos - lo
    return round(ordered[lo] * (1.0 - frac) + ordered[hi] * frac, 2)


def _ops_buckets(rows: list[dict]) -> list[dict]:
    now = time.time()
    origin = now - (_BUCKET_S * _N_BUCKETS)
    buckets = [{"rates": {}, "latencies": []} for _ in range(_N_BUCKETS)]
    for row in rows:
        ts = float(row.get("ts") or 0)
        if ts < origin:
            continue
        idx = int((ts - origin) / _BUCKET_S)
        idx = max(0, min(idx, _N_BUCKETS - 1))
        bucket = buckets[idx]
        code = str(int(row.get("status") or 0))
        bucket["rates"][code] = bucket["rates"].get(code, 0) + 1
        bucket["latencies"].append(float(row.get("latency_ms") or 0))
    out = []
    for bucket in buckets:
        lats = bucket["latencies"]
        rates = {
            code: round(count / float(_BUCKET_S), 4) for code, count in bucket["rates"].items()
        }
        out.append(
            {
                "rates": rates,
                "p95": _percentile(lats, 0.95) if lats else 0.0,
                "p99": _percentile(lats, 0.99) if lats else 0.0,
                "n": sum(bucket["rates"].values()),
            }
        )
    return out


def _status_counts(rows: list[dict]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for row in rows:
        key = str(int(row.get("status") or 0))
        counts[key] = counts.get(key, 0) + 1
    return counts


def _board_series(rows: list[dict]) -> dict:
    chrono = list(reversed(rows))[-40:]
    latency_ms = [float(r.get("latency_ms") or 0) for r in chrono]
    cagr_p = []
    for row in chrono:
        extra = row.get("extra") or {}
        c = extra.get("cagr_approx")
        if c is None:
            continue
        cagr_p.append(round(float(c), 4))
    return {"latency_ms": latency_ms, "cagr_p": cagr_p}


def board_payload() -> dict:
    with _AUDIT_LOCK:
        rows = list(_AUDIT)
    sims = [r for r in rows if "/v1/simulation" in str(r.get("path"))]
    errors = sum(1 for r in rows if int(r.get("status") or 0) >= 400)
    n = len(rows)
    latencies = [float(r["latency_ms"]) for r in rows if r.get("latency_ms") is not None]
    avg_latency = round(sum(latencies) / len(latencies), 1) if latencies else None
    error_rate = round(errors / n, 4) if n else 0.0
    return {
        "uptime_s": int(time.time() - _STARTED),
        "request_count": n,
        "simulation_count": len(sims),
        "error_count": errors,
        "error_rate": error_rate,
        "avg_latency_ms": avg_latency,
        "stats": {
            "requests": n,
            "error_rate": error_rate,
            "avg_ms": avg_latency,
        },
        "buckets": _ops_buckets(rows),
        "series": _board_series(rows),
        "status_counts": _status_counts(rows),
        "audit": rows[:40],
    }


def uptime_started() -> float:
    return _STARTED