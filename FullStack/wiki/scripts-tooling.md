# 🧰 SliceMatic — Scripts & Tooling

---

## npm Scripts (run from `FullStack/`)

| Script | Command | What it does |
|---|---|---|
| `dev` | `next dev` | Start dev server on port 3000 |
| `build` | `next build` | Production bundle |
| `start` | `next start` | Run production build |
| `lint` | `next lint` | ESLint check |
| `test` | `vitest run` | Run all unit tests once |
| `test:watch` | `vitest` | Watch mode testing |
| `forecast:refresh` | `node scripts/refresh-forecast.mjs` | Refresh demand forecast cache |
| `seed:synthetic-orders` | `node scripts/seed-synthetic-orders.mjs` | Seed fake orders into Supabase |
| `setup:storage` | `node scripts/setup-storage-bucket.mjs` | Create Supabase storage bucket |

---

## Script Files (`scripts/`)

### `forecast_model.py`
- Python (scikit-learn) `RandomForestRegressor`
- Features: `weekday`, `hour`
- Input: JSON array of orders via stdin
- Output: `lib/generated/forecast-cache.json`
- Called by: `refresh-forecast.mjs` via `spawnSync`
- **Requires:** Python + scikit-learn installed

```bash
# Direct usage
cd FullStack
python scripts/forecast_model.py --stdin-json --write-cache lib/generated/forecast-cache.json < orders.json
```

### `refresh-forecast.mjs`
- Fetches orders from Supabase
- Pipes to `forecast_model.py`
- Writes cache to `lib/generated/forecast-cache.json`
- Requires: `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`

### `seed-synthetic-orders.mjs`
- Generates realistic fake order data
- Inserts into Supabase (requires DB env vars)
- Useful for testing forecast and recommendation features

### `setup-storage-bucket.mjs`
- Creates the Supabase Storage bucket for menu images
- One-time setup script

### `verify-recommend-flow.mjs`
- Smoke test for the recommendation API
- Calls `/api/recommend` and prints the response

---

## `EntryPortal` — Separate CSS File

Note: `EntryPortal` has its OWN CSS file at `components/EntryPortal/EntryPortal.css`.
This is the ONLY component with a separate CSS file — all others use `app/globals.css`.

---

## Existing Agent Skills (`FullStack/.agents/skills/`)

These project-level skills exist and should be checked before implementing from scratch:

| Skill | When to use |
|---|---|
| `supabase-postgres-best-practices` | Any DB schema or query work |
| `nextjs-app-router-patterns` | Next.js routing, layouts, server components |
| `fullstack-developer` | Full-stack architecture decisions |
| `openrouter-typescript-sdk` | OpenRouter LLM integration |
| `code-review-excellence` | Before finalizing code changes |
| `tdd` | When writing new tests |
| `webapp-testing` | Component/integration testing patterns |
| `web-design-guidelines` | UI/UX decisions |
| `tailwind-design-system` | Optional for planned token/component migration work; do not apply scattered Tailwind utilities without the bridge plan |

---

## `graphify-out/` Directory

Located in `FullStack/graphify-out/` — contains an auto-generated code dependency graph (JSON).
Not actively maintained. The `wiki/knowledge-graph.md` is the human-maintained version.

---

## PhonePe Routes (Inactive)

`app/api/payments/phonepe-callback/` and `app/api/payments/phonepe-webhook/` exist but are not connected to any UI. PhonePe integration was started but not completed. Do not rely on these.

---

*Last updated: 2026-07-06*
