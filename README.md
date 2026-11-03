# rig

Keeps a lane's lights on while nobody is in it: a heartbeat every minute, a status board, and
(next) a morning digest of what ran overnight.

```sh
cp .env.example .env   # set LANE_MARKER
pnpm install
pnpm dev               # http://localhost:8787
```

Working on it with an agent: start at [AGENTS.md](AGENTS.md).

Command-generated HTML exports and the approval-gated Pages workflow are described in [the preview guide](docs/preview.md).

`GET /api/digest/:night` returns the night's digest as JSON: `{ "rows": [...], "badLines": 0, "counts": { "ok": 0, "retry": 0, "fail": 0 } }`. Its rows use the same job ordering as `/digest/:night`; a missing or invalid night returns 404, while an existing empty night returns empty rows and zero counts.
