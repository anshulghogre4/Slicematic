---
title: FullStack Contradictions and Staleness Ledger
type: lint
status: active
scope: FullStack/ and wiki/
last_linted: 2026-07-21
---

# FullStack Contradictions and Staleness Ledger

Do not erase a conflict by silently rewriting history. Resolve it against source evidence, update affected pages, then mark the item resolved.

## Open

| ID | Claim or conflict | Evidence | Required resolution |
|---|---|---|---|
| C-002 | [[database-schema]] describes `order_lines` and `recommendations`. | SQL source defines `order_item`, `order_item_topping`, and `recommendation_event`. | Recompile the schema page from `supabase/schema.sql`. |
| C-003 | [[architecture]] uses simplified/nonexistent schema names such as `customers`, `order_lines`, and `menu_items`. | SQL uses singular `customer` and separate menu tables. | Replace the simplified table block with the real model or label it conceptual. |
| C-004 | [[auth-flows]] says demo credentials are never hardcoded. | Source contains default demo credentials and static `demo-bypass` handling. | Document exact behavior without publishing secret values; separate demo defaults from production policy. |
| C-005 | [[api-contracts]] route inventory predates newer customer, outlet, brand, upload, AI, and payment routes. | Production build lists 21+ dynamic API routes. | Recompile route inventory from `app/api/**/route.ts`. |
| C-007 | Current RLS policies are demo-broad for production review: several admin/customer/order policies use `using (true)`. | `FullStack/supabase/schema.sql` has authenticated admin read policies and server read policies with `using (true)`. | Implement DB-1 in `plans/database-schema-evolution-plan.md` during S0 (gated). |
| C-008 | Some README / AI_RECOMMENDATION_ENGINE paths still cite `SliceMaticStage3.tsx`. | File deleted 2026-07-18; customer shell is `CustomerShell.tsx`. | Recompile remaining root docs when touched. |

## Resolved

| ID | Resolution | Date |
|---|---|---|
| C-001 | Test suite is green: **118 tests / 21 files** after R13 (`npm run test` 2026-07-21). Prior “93 tests / failing resetSession” claim retired. | 2026-07-21 |
| C-006 | Root `AGENTS.md` / `CLAUDE.md` and `wiki/AGENTS.md` define full wiki writeback; Cursor/`.agents` rules realigned 2026-07-21 to `FullStack/wiki/` + Tailwind bridge. | 2026-07-21 |
| C-009 | Dual-file / Stage3 rule retired in wiki decisions ADR-001/004, source-map, Cursor rules, and `.agents/AGENTS.md`. | 2026-07-21 |
| C-010 | ui-map admin screenshots 09–13 missing filenames retargeted to existing `admin-*.png` assets. | 2026-07-21 |
