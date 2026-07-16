---
title: FullStack Source and Provenance Map
type: provenance
status: maintained
scope: FullStack/
last_verified: 2026-07-16
---

# FullStack Source and Provenance Map

Use this page to verify compiled claims without rediscovering the entire repository.

| Concept | Primary evidence | Supporting evidence | Wiki synthesis |
|---|---|---|---|
| Runtime and dependencies | `FullStack/package.json`, `next.config.mjs` | `FullStack/README.md` | [[architecture]], [[scripts-tooling]] |
| Customer workspace | `app/page.tsx`, `components/EntryPortal/EntryPortal.tsx`, `components/SliceMaticStage3.tsx` | `lib/customer-flow.ts`, `lib/session-customer.ts` | [[components]], [[auth-flows]] |
| Admin workspace | `app/admin-dashboard/page.tsx` | `components/admin/*`, `lib/admin-tabs.ts` | [[components]], [[architecture]] |
| Live UI baseline | `wiki/assets/ui-map/*.png` | `app/page.tsx`, `app/admin-dashboard/page.tsx`, `app/payment/page.tsx`, `app/confirmation/page.tsx` | [[ui-map]] |
| Domain types | `lib/types.ts` | API and component imports | [[architecture]], [[api-contracts]] |
| Pricing and validation | `lib/pricing.ts` | `lib/pricing.test.ts`, outlet pricing routes | [[business-rules]] |
| Client state | `lib/store.ts` | `lib/store.test.ts`, session call sites | [[state-management]] |
| Database model | `supabase/schema.sql` | `lib/data-service.ts`, `lib/supabase.ts` | [[database-schema]] |
| Customer authorization | `lib/customer-auth.ts` | customer API routes and tests | [[auth-flows]], [[current-state]] |
| Admin authorization | `lib/admin-auth.ts` | admin routes and tests, `user_roles` SQL table | [[auth-flows]], [[current-state]] |
| Order persistence | `app/api/orders/route.ts`, `lib/data-service.ts` | pricing and data-service tests | [[api-contracts]], [[payments]] |
| Razorpay | `lib/razorpay.ts`, payment create/verify routes | `lib/razorpay.test.ts` | [[payments]] |
| Cashfree | `lib/cashfree.ts`, Cashfree create/verify routes | `lib/cashfree.test.ts` | [[payments]] |
| Recommendations | `app/api/recommend/route.ts`, `lib/recommendation-prompt.ts` | `AI_RECOMMENDATION_ENGINE.md` | [[feature-recommendation]] |
| Other AI features | `lib/ai.ts`, `app/api/ai/**` | deterministic fallback functions | [[feature-ai-strategist]] |
| Forecasting | `scripts/forecast_model.py`, `lib/forecast-service.ts` | refresh scripts/routes, generated cache | [[feature-forecasting]] |
| Environment behavior | environment reads found through `process.env` | `.env` names only; never values | [[env-vars]] |
| Verification status | fresh `npm test` and `npm run build` output | test files, build report | [[testing]], [[current-state]] |
| Delivery tracking proposal | current order/schema/auth/pricing source plus official provider research | `plans/fullstack-delivery-intelligence-sprints.md` | [[delivery-operations]] |
| AI/forecast service proposal | AI routes, `lib/ai.ts`, recommendation prompt/route, forecast Python/service/route/panel | sprint plan and provider/browser guidance | [[ai-microservices]] |

## Authored source documents

These are useful historical/rationale sources but are subordinate to executable behavior when they drift:

- `FullStack/README.md`
- `FullStack/AI_RECOMMENDATION_ENGINE.md`
- `FullStack/STAGE3_BUILD_REPORT.md`
- `FullStack/CHANGELOG.md`
- `FullStack/backend/backend.md`

## Static assets

`FullStack/public/assets/` and `FullStack/public/uploads/` contain product imagery. They are content dependencies, not architecture sources, unless a task concerns menu-image lifecycle or visual design.
