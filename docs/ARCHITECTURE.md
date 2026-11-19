# Architecture

Summary infographic and request path also appear on the [repository README](../README.md#architecture).

![Live path — Browser → FastAPI → artifacts/latest.json](images/architecture/live-path-infographic-v1.jpg)

**Live path:** Browser (`static/`) → Render FastAPI → `artifacts/latest.json` · Ops → `GET /ops/board` on the same process.  
**Offline (E: only):** ZoomCamp [`SMA/Project`](https://github.com/zakard114/ZoomCamp/tree/main/SMA/Project) parquet → `ops/export_artifacts.py` → `latest.json`.

**Not in cloud:** parquet, training, re-fit on each request.

```mermaid
flowchart TD
    User["User / Reviewer"] --> Browser["Browser<br/>static/index.html + app.js"]
    Browser --> Desk["Signal Desk<br/>threshold · Update simulation · KPIs · signals"]
    Browser --> Ops["Ops overlay<br/>Inspector · Log · API · Grafana tab"]
    Desk --> API["FastAPI app/main.py<br/>GET /v1/*"]
    Ops --> Board["GET /ops/board<br/>app/audit.board_payload()"]
    API --> Artifact[("artifacts/latest.json<br/>threshold grid 0.55–0.60 · baked in Docker")]
    Board --> API
    Export["Offline (E: only)<br/>SMA/Project parquet → export_artifacts.py"] -.-> Artifact
    Render["Render web service<br/>signal-desk-c3dx.onrender.com"] --> API

    linkStyle default stroke:#d4a24c,stroke-width:1.5px

    style User fill:#0a0e12,color:#d8dce3,stroke:#d4a24c
    style Browser fill:#121820,color:#d8dce3,stroke:#d4a24c
    style Desk fill:#0f1419,color:#d8dce3,stroke:#6dcca4
    style Ops fill:#0f1419,color:#d8dce3,stroke:#6dcca4
    style API fill:#3d3424,color:#d8dce3,stroke:#d4a24c
    style Board fill:#121820,color:#d8dce3,stroke:#d4a24c
    style Artifact fill:#1e3a5f,color:#d8dce3,stroke:#60a5fa
    style Export fill:#0a0e12,color:#8b95a8,stroke:#64748b
    style Render fill:#0a0e12,color:#d8dce3,stroke:#d4a24c
```

## ASCII (quick reference)

```text
Browser → FastAPI → artifacts/latest.json
Desk: /v1/simulation, /v1/signals/latest
Ops: /ops/board (in-app Grafana tab)
```

Full screenshots and numbered desk callouts: [PREVIEW.md](PREVIEW.md).