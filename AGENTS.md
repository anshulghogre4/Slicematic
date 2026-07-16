# AGENTS.md — Codex Rules for SliceMatic

> Read this file automatically. Applies to all Codex sessions on this repo.

---

## 🧠 Start Every Session By Reading the Wiki

```bash
# Run this mentally at the start of EVERY session:
1. Read wiki/index.md
2. Read wiki/handoff.md
3. Read wiki/AGENTS.md for ingest/query/lint and writeback rules
4. Read the specific wiki page for your task
```

The wiki lives at: `Slicematic/wiki/`

---

## Project Context

SliceMatic is a graded team project for FDE Academy (single-outlet pizza ordering SaaS).

**Three stages:**
- Stage 1 = PRD + Business Economics (`documents/`)
- Stage 2 = Gradio Python MVPs (`gradio-MVP/`, `GRADIO-MVP-2/`) — **do not touch for Stage 3 work**
- Stage 3 = Next.js + Supabase FullStack (`FullStack/`) ← **ACTIVE DEVELOPMENT**

---

## Critical Rules

### The Dual-File Rule — MOST IMPORTANT
When editing shared UI sections, changes must go in BOTH:
- `FullStack/components/SliceMaticStage3.tsx`
- `FullStack/app/admin-dashboard/page.tsx`

Use `grep` to confirm both files are updated:
```bash
grep -n "YOUR_CHANGED_TEXT" FullStack/components/SliceMaticStage3.tsx
grep -n "YOUR_CHANGED_TEXT" FullStack/app/admin-dashboard/page.tsx
```

### CSS
- Vanilla CSS only. No Tailwind. Ever.
- All styles: `FullStack/app/globals.css`
- Check existing classes in `wiki/css-system.md` first

### Supabase
- Always guard DB calls with `hasSupabaseEnv()` / `hasSupabaseAdminEnv()`
- Fall back gracefully when Supabase is absent

### Business Rules
- Never change pricing constants without reading `wiki/business-rules.md`
- Bill formula: subtotal → discount → taxable → GST → delivery → finalTotal

---

## Commands

```bash
cd FullStack

# Dev
npm run dev

# Test
npm run test
npm run test:watch

# Build (only if asked)
npm run build
```

---

## Mandatory: Update Changelog

After every code change, add to `FullStack/CHANGELOG.md`:
```
### [YYYY-MM-DD HH:MM:SS IST] - Title
- What changed
- Files: file1.tsx, file2.css
```

## Mandatory: Update Wiki Handoff

At end of session, update `wiki/handoff.md`:
- What was done
- Files changed
- Next steps

## Mandatory: Update the LLM Wiki

For every material `FullStack/` change, follow `wiki/AGENTS.md`:
- Update the affected topic pages.
- Record source/wiki conflicts in `wiki/contradictions.md`.
- Append an ingest, query, or lint entry to `wiki/log.md`.
- Keep `wiki/index.md` as the navigation entry point.

---

## Sensitive Files (Never Echo Secrets)

- `.env` in both root and `FullStack/`
- `.mcp.json` (Apify token)
- `db/supabase.md` (DB credentials)
- `FullStack/.env` (Supabase keys, payment keys)

---

## Two Gradio Implementations (Stage 2 — Reference Only)

| | `gradio-MVP/app.py` | `GRADIO-MVP-2/app.py` |
|---|---|---|
| Flow | Cart-based, multiple lines | Sequential 5-stage |
| More stable | ❌ | ✅ (3 verification iterations) |

These are Stage 2 artifacts. Do NOT modify them for Stage 3 work unless explicitly asked.

---

*Last updated: 2026-07-06*
