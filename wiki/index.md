# 🍕 SliceMatic LLM Wiki — Master Index

> **This wiki is the shared brain for ALL AI agents (Antigravity, Cursor, Claude Code).**  
> Maintained in the Karpathy-style: structured Markdown, human-curated, compounding over time.  
> **START HERE before every session. Read `handoff.md` next.**

---

## 📚 Wiki Pages

| Page | What it covers |
|---|---|
| [index.md](./index.md) | This file — master map |
| [architecture.md](./architecture.md) | System design, data flow, dual-file pattern |
| [components.md](./components.md) | Every component, its role, imports, and key patterns |
| [api-contracts.md](./api-contracts.md) | All API routes, payloads, responses |
| [css-system.md](./css-system.md) | Design tokens, class inventory, styling rules |
| [state-management.md](./state-management.md) | Zustand store, sessionStorage, state flow |
| [business-rules.md](./business-rules.md) | Pricing, validation, GST, discount constants |
| [auth-flows.md](./auth-flows.md) | Customer auth, admin auth, guest mode, OTP |
| [payments.md](./payments.md) | Cashfree, Razorpay, Cash flow |
| [database-schema.md](./database-schema.md) | Full Supabase schema, table definitions, column mappings |
| [env-vars.md](./env-vars.md) | All environment variables, required vs optional, degradation behaviour |
| [testing.md](./testing.md) | Vitest test files, coverage, known gaps |
| [scripts-tooling.md](./scripts-tooling.md) | npm scripts, Python forecast, seed scripts, skills inventory |
| [decisions.md](./decisions.md) | Architecture Decision Records (WHY things are built this way) |
| [knowledge-graph.md](./knowledge-graph.md) | Entity relationships — who calls what |
| [handoff.md](./handoff.md) | **Current session state — ALWAYS update this at end of session** |

---

## ⚠️ Known Gotchas (Read Before You Burn Time)

| Gotcha | Detail |
|---|---|
| **PhonePe routes exist but are dead** | `app/api/payments/phonepe-*` routes exist but have no UI wiring. Ignore them. |
| **EntryPortal has its own CSS** | `components/EntryPortal/EntryPortal.css` — the ONLY component with a separate CSS file |
| **DB column names ≠ TypeScript names** | `pizza_type_id` → `id`, `pizza_name` → `name`, `is_available` → `available`. See `database-schema.md` |
| **Supabase schema is `slicematic.*`** | NOT `public.*`. All queries must use `.schema("slicematic")` |
| **`tailwind-design-system` skill exists but DO NOT USE** | The project uses Vanilla CSS. Applying that skill will break things. |
| **`graphify-out/` is stale** | Auto-generated, not maintained. Use `wiki/knowledge-graph.md` instead. |
| **Forecast requires Python** | `npm run forecast:refresh` calls `scripts/forecast_model.py` via Python. Needs scikit-learn installed. |
| **Razorpay Config ID** | `RAZORPAY_CONFIG_ID` is required for the card payment overlay — easy to miss |
| **Stage 2 test stale assertion** | `GRADIO-MVP-2/test_edge_cases.py` has one wrong expected value. App is correct, not the test. |

---

## 🧭 Quick Orientation

```
SliceMatic = Single-outlet pizza ordering SaaS (FDE Academy graded project)
Stage 1 = PRD + Business Economics (docs/)
Stage 2 = Gradio MVPs (gradio-MVP/, GRADIO-MVP-2/)
Stage 3 = Next.js FullStack + Supabase (FullStack/) ← ACTIVE DEVELOPMENT
```

**The main working directory is:** `f:\Preparation\FDE_Slicemate\Slicematic\FullStack\`

---

## ⚡ Critical Rules (Read Before Touching Code)

1. **Dual-file rule**: `SliceMaticStage3.tsx` and `admin-dashboard/page.tsx` share ~90% of UI logic. **Changes to shared sections MUST be applied to BOTH files.**
2. **CSS**: Vanilla CSS ONLY — NO Tailwind. All tokens in `app/globals.css` `:root` block.
3. **State**: Zustand via `lib/store.ts` persisted to `sessionStorage`.
4. **Supabase is optional**: All features must gracefully degrade without Supabase env vars.
5. **No hardcoded prices or menu items**: Menu is dynamic from Supabase or seed data.
6. **Changelog**: Every session must add an entry to `FullStack/CHANGELOG.md`.

---

## 🔄 How to Use This Wiki

**Starting a new session:**
```
1. Read wiki/index.md (this file)
2. Read wiki/handoff.md (what was done last session)
3. Read the specific page relevant to your task
4. Do your work
5. Update wiki/handoff.md before ending
```

**If making architectural changes:**
```
Update wiki/architecture.md and wiki/decisions.md
```

**If changing API routes:**
```
Update wiki/api-contracts.md
```

**If changing CSS:**
```
Update wiki/css-system.md
```

---

*Last updated: 2026-07-06 | Maintained by: All AI agents + Human*
