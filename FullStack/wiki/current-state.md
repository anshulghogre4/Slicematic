---
title: FullStack Current Verified State
type: status
status: maintained
scope: FullStack/
last_verified: 2026-07-16
---

# FullStack Current Verified State

## Architecture snapshot

SliceMatic Stage 3 is a Next.js 14 App Router monolith. React workspaces call Next.js route handlers, which use shared TypeScript services to reach Supabase/PostgreSQL, OpenRouter, Razorpay, and Cashfree. Forecast training is an offline Python/scikit-learn job whose JSON cache is read by the web application.

Related pages: [[architecture]], [[database-schema]], [[payments]], [[feature-recommendation]], [[feature-forecasting]].

## Verification

| Check | Result | Date |
|---|---|---|
| `npm run build` | Passed: compilation, type checking, page generation | 2026-07-16 |
| `npm run test` | Passed: 114 tests across 20 suites after shared admin menu/settings extraction | 2026-07-16 |
| `npx tsc --noEmit` | Passed after shared admin menu/settings extraction | 2026-07-16 |
| Structural extraction | 405 entities, 1,109 relationships across 77 code files | 2026-07-16 |

The earlier `resetSession()` expectation mismatch was corrected in Revamp R1; the current full suite is green.

## Runtime modes

- Configured mode: Supabase persistence/auth, real gateways, and OpenRouter.
- Demo mode: seed data, demo identities, deterministic AI fallbacks, and unavailable-gateway responses.

Fallback behavior is part of the product demo strategy. It must not be treated as evidence that configured production authorization is secure.

## Verified risks

1. `requireAdminSession()` verifies a Supabase user token but does not consult `slicematic.user_roles` or another admin claim.
2. The static `demo-bypass` admin token is accepted when admin environment keys are configured; it needs an explicit production disablement boundary.
3. `supabase/schema.sql` grants broad privileges and contains permissive customer/order read policies. Review RLS and grants before production use.
4. Payment verification and order persistence are separate client-orchestrated flows. An idempotent server-side finalization or webhook would provide a stronger consistency boundary.
5. Forecast refresh spawns local Python and writes a cache, so refresh is not reliable in ordinary Vercel serverless execution. Serving a pre-generated cache is compatible.
6. The large customer and admin workspace files create duplication and regression risk; confirm both before shared UI changes.

See [[contradictions]] for documentation drift and [[handoff]] for the active next actions.
