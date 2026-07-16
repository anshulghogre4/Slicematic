---
title: FullStack Contradictions and Staleness Ledger
type: lint
status: active
scope: FullStack/ and wiki/
last_linted: 2026-07-16
---

# FullStack Contradictions and Staleness Ledger

Do not erase a conflict by silently rewriting history. Resolve it against source evidence, update affected pages, then mark the item resolved.

## Open

| ID | Claim or conflict | Evidence | Required resolution |
|---|---|---|---|
| C-001 | [[testing]] previously described only seven test files and implied a clean store reset contract. | Current run: 15 suites, 93 tests, one failing `resetSession` assertion. | Update test inventory and decide whether implementation or assertion owns the intended empty address. |
| C-002 | [[database-schema]] describes `order_lines` and `recommendations`. | SQL source defines `order_item`, `order_item_topping`, and `recommendation_event`. | Recompile the schema page from `supabase/schema.sql`. |
| C-003 | [[architecture]] uses simplified/nonexistent schema names such as `customers`, `order_lines`, and `menu_items`. | SQL uses singular `customer` and separate menu tables. | Replace the simplified table block with the real model or label it conceptual. |
| C-004 | [[auth-flows]] says demo credentials are never hardcoded. | Source contains default demo credentials and static `demo-bypass` handling. | Document exact behavior without publishing secret values; separate demo defaults from production policy. |
| C-005 | [[api-contracts]] route inventory predates newer customer, outlet, brand, upload, AI, and payment routes. | Production build lists 24 dynamic API routes. | Recompile route inventory from `app/api/**/route.ts`. |
| C-006 | Root `CLAUDE.md` says every session must update only [[handoff]] and does not describe ingest/query/lint or [[log]]. | [[AGENTS]] now defines the full LLM Wiki protocol. | Optionally align root agent instructions in a dedicated maintenance change. |
| C-007 | Current RLS policies are demo-broad for production review: several admin/customer/order policies use `using (true)`. | `FullStack/supabase/schema.sql` has authenticated admin read policies and server read policies with `using (true)`; Supabase RLS policies act as query filters for exposed API roles. | Implement DB-1 in `FullStack/plans/database-schema-evolution-plan.md`: `customer.auth_user_id`, `is_admin()` helper, ownership policies, and removal/narrowing of broad public read policies. |

## Resolved

No entries resolved in the 2026-07-16 lint pass.
