---
title: Next Horizon Sprint Plan — R13 → R12 → S0
status: active
owner: SliceMatic FullStack team
created: 2026-07-21
updated: 2026-07-23
parent: fullstack-delivery-intelligence-sprints.md
scope: stabilize security/honesty/docs, finish R12 polish, then Delivery Sprint 0 foundation
schema_policy: Do not modify FullStack/supabase/schema.sql in R13/R12. S0 may propose migrations only after ADR approval.
---

# Next Horizon Sprint Plan (R13 → R12 → S0)

> **For agentic workers:** Execute phases in order. Hard gates block the next phase. Prefer TDD for API auth. Do not apply SQL from plans without migrations + tests.

**Goal:** Close production blockers and doc drift, finish frontend polish, then unlock Delivery Sprint 0 without breaking the current Supabase schema or green test suite.

**Architecture:** Customer shell is `components/CustomerShell.tsx` (Stage3 deleted). Shared UI lives under `features/*`. Admin API auth uses `requireAdminSession`. Delivery tracking remains scaffold-only until S0/S2–S3.

**Tech stack:** Next.js 14 App Router, Vitest, Supabase/Postgres (`slicematic` schema), Zustand, Framer Motion, `globals.css` / `sui-*` tokens (Tailwind not installed).

## Global constraints

- **No schema changes** in R13 or R12. Compare against `FullStack/supabase/schema.sql`.
- **EntryPortal** remains the only login form.
- Bill formula unchanged: subtotal → discount → taxable → GST → delivery → finalTotal.
- Preserve demo graceful degradation when Supabase admin env is absent.
- Dual-file / `SliceMaticStage3` rules are **obsolete**.

## Active queue (status) — updated 2026-07-21 late

| Phase | Status | Exit gate |
|---|---|---|
| **R13 Stabilize** | **Done** (code + core docs) | Auth on `/api/admin/orders`; honest OrderTable; admin UI gated; wiki/Cursor Stage3 purge; tests **118/118** |
| **R12 Polish** | **Mostly done** — residual optional | Visual/a11y checklist largely landed; optional screenshot recapture remains |
| **S0 Foundation** | **Next** | ADR + RLS design + map bake-off scorecard; still no live GPS / no schema apply without ADR |

Parent long-term roadmap remains `plans/fullstack-delivery-intelligence-sprints.md` (Delivery S1–S5 unchanged).

---

## Phase R13 — Stabilize — DONE

- [x] `requireAdminSession` on `app/api/admin/orders/route.ts` + tests
- [x] Gate `/admin-dashboard` on `adminLoggedIn`
- [x] Remove fabricated Delivery/Rider/ETA from `OrderTable`
- [x] Cap `order_item` line fetch to 50 IDs (schema columns only)
- [x] Stage3 → CustomerShell in architecture, knowledge-graph, source-map, decisions ADR-001/004
- [x] contradictions C-001 resolved; Stage3/Tailwind/ui-map notes updated
- [x] ui-map 09–13 → existing `admin-*.png`
- [x] Align `.agents/AGENTS.md` + `.cursor/rules/slicematic.mdc`

**Residual R13 (optional):** README / `AI_RECOMMENDATION_ENGINE.md` Stage3 path nits (C-008).

---

## Phase R12 — Frontend visual polish — MOSTLY DONE

- [x] Menu badge overlay alignment (`menu-card-premium__badge`)
- [x] Quantity stepper hit area / Lucide sizing
- [x] Confirmation journey current-step highlight CSS (honest recorded status)
- [x] `useReducedMotion` on `OrderContextPanel` + admin tab motion
- [x] loading.tsx uses `Skeleton` (no broken `pulse` keyframes)
- [x] OCP facts wrapped in `<dl>`
- [ ] Optional: deeper checkout pill spacing polish if still visually off in browser
- [ ] Optional: fresh screenshot smoke for ui-map after polish
- [ ] Optional: AdminOverviewPanel Framer Motion upgrade (handoff wish-list)

**Exit for “R12 closed”:** optional items above or explicit deferral to S0 prep.

---

## Phase S0 — Security & delivery contract foundation — NEXT

Do **not** edit `schema.sql` until ADR approved.

1. **S0-01** Delivery ADR + state contract (kitchen vs courier; fee v1; disclosure)
2. **S0-02** Identity/RLS design (`auth_user_id`, `is_admin()`, narrow `using (true)`, feature-flag `demo-bypass`) — migrations only after review
3. **S0-03** Ordered migrations + transactional transition strategy
4. **S0-04** Delhi map bake-off scorecard (Google / Mappls / Mapbox / TomTom / Geoapify)
5. **S0-05** Backend modular extraction map

**What to do next (concrete):**

1. Write S0-01 ADR into `wiki/decisions.md` + update `wiki/delivery-operations.md`
2. Draft S0-02 policy SQL in a **new migration draft file** (not applied) under `supabase/migrations/` only after review
3. Build empty bake-off scorecard table for S0-04
4. Keep `npm run test` green; never invent Delivery/Rider/ETA UI

**Exit:** product/eng approve ADR; **no live tracking code** until gate passes.

### S0-04 addendum — `/confirmation` UX audit (ui-ux-pro-max, 2026-07-23)

Product context from skill: **Food Delivery / On-Demand** + Next.js stack. Existing SliceMatic warm-food / glass tokens kept (no new brand system). Audit focused on Priority 1–8: accessibility, touch, loading, motion, state honesty.

#### Ranked findings

| Pri | Issue | Skill rule | File(s) | Fix |
|---|---|---|---|---|
| P0 | `DeliveryMapFallback` `no_rider` claimed “Searching for rider / Live tracking will begin shortly” with no delivery stack | state-clarity / empty-states honesty | `features/order-tracking/components/DeliveryMapFallback.tsx` | **Fixed:** unassigned / unavailable copy; no invented ETA |
| P0 | Journey rail ignored status `"delivery"` (fell back to confirmed) while map branch treated it as out-for-delivery | state-clarity / multi-step-progress | `features/order-tracking/orderJourney.ts`, `app/confirmation/page.tsx` | **Fixed:** map `delivery` → step index 3; match `out for delivery` |
| P0 | Confirmation lacked explicit “recorded status only” disclosure (admin Orders already honest) | confirmation / empty-states | `app/confirmation/page.tsx`, `globals.css` | **Fixed:** hero honesty note (`role="note"`) |
| P1 | Receipt accordion missing `aria-controls` / panel labelling; chevrons not `aria-hidden` | ARIA labels / focus | `app/confirmation/page.tsx` | **Fixed** |
| P1 | Receipt trigger had no `:focus-visible` ring; touch height not explicit | focus-states / touch-target-size | `globals.css` | **Fixed:** 44px min-height + focus ring |
| P1 | Kitchen illustration decorative `div` had no accessible name | alt-text / aria | `app/confirmation/page.tsx` | **Fixed:** `role="img"` + label |
| P1 | Loading skeleton layout (2-col / max 800) mismatched live page (single column / 720) | loading-states / CLS | `app/confirmation/loading.tsx` | **Fixed:** hero + journey + map skeleton stack |
| P2 | Success checkmark label was generic “Success” | aria-labels | `components/ui/Primitives.tsx` | **Fixed:** “Order confirmed” |
| P2 | Payment status pill not in a live region | aria-live / feedback | `app/confirmation/page.tsx` | **Fixed:** `aria-live="polite"` wrapper |
| P3 | Hero enter animation 400ms (slightly above 150–300ms micro-interaction band); global reduced-motion already present | duration-timing / reduced-motion | `globals.css` | Defer; keep unless motion polish pass |
| P3 | No order-id deep link (`/confirmation?order=…`); state is session/`lastOrder` only | deep-linking | confirmation route | Defer to S0/S1 after identity contract |
| P3 | Duplicate short order id in hero + journey header | visual-hierarchy | confirmation + `OrderJourneyRail` | Defer; low risk |

#### Map scorecard UX criteria (feed S0-04 bake-off)

When scoring Google / Mappls / Mapbox / TomTom / Geoapify, require the UI contract to support:

1. Honest empty states when rider/ETA/GPS absent (never “searching…” without an assignment job)
2. Skeleton reservation for map pane (CLS)
3. Text alternatives for map status (screen-reader summary)
4. `prefers-reduced-motion` for marker/route motion
5. Touch ≥44px for map chrome controls

Then continue Delivery Sprint 1+ in the parent sprint file.

---

## Verification log

| Pass | Result |
|---|---|
| Iteration 1 | 118/118, tsc clean |
| Iteration 2 | 118/118, review agent no findings |
| Iteration 3 | 118/118, tsc clean; `schema.sql` untouched |

## What NOT to do

- Do not invent rider/ETA columns
- Do not apply FastAPI designs from `backend/backend.md`
- Do not treat `ui-revamp-implementation-plan.md` as sprint status SOT
- Do not start live GPS / Broadcast until S0 exit
