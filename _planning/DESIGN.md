# Signal desk UI — design tokens (not hotel clone)

**Identity:** *Signal desk, not booking desk.* Dark-first “ledger” for ML ops demo.

## Color (dark default)

| Token | Value | Use |
|-------|-------|-----|
| `--bg` | `#0A0E12` | Page |
| `--surface` | `#121820` | Cards, table |
| `--border` | `rgba(255,255,255,.06)` | 1px dividers |
| `--text` | `#D8DCE3` | Body |
| `--muted` | `#8B95A8` | Labels |
| `--accent` | `#D4A24C` | Signals, CTA |
| `--loss` | `#C47A7A` | Negative P&L |

## Typography

- UI: **DM Sans** or **Source Sans 3**
- Tickers, CAGR, dates: **IBM Plex Mono** (`tabular-nums`)

## Layout (from hotel IA, not hotel chrome)

Hero = one thesis + **last pipeline run** + optional mini sparkline (20 pts).  
KPI row (4) → compact signals table → API/docs footer.

## Do not

- Full-width blue/purple booking gradient hero
- Inter/Geist + same radius as hotel-cancel-api without token pass