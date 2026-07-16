---
title: SliceMatic Wiki Operation Log
type: log
status: append-only
scope: wiki/
---

# SliceMatic Wiki Operation Log

Entries use `## [YYYY-MM-DD] operation | title` so agents and shell tools can parse the timeline.

## [2026-07-06] ingest | Initial FullStack wiki

- Created the first architecture, component, API, CSS, state, business-rule, auth, payment, database, environment, testing, tooling, decision, graph, and handoff pages.
- Source scope: `FullStack/` and project documentation available at that time.

## [2026-07-16] lint | FullStack verification

- Inspected 99 supported FullStack files: 77 code, 6 documents, and 16 static images.
- Structural extraction found 405 entities and 1,109 relationships.
- Verified production build passes.
- Verified tests currently report 92 passed and one failed.
- Identified drift in database, auth, API, and testing pages; recorded in [[contradictions]].

## [2026-07-16] ingest | Karpathy-style knowledge layer

- Added [[AGENTS]] as the wiki schema.
- Rebuilt [[index]] as the content-oriented navigation entry.
- Added [[source-map]], [[current-state]], [[contradictions]], and this append-only operation log.
- Connected existing feature pages into the main navigation.
- Adopted ingest, query, lint, and mandatory writeback operations.

## [2026-07-16] query | Delivery intelligence and tracking sprint

- Audited unused `customer_activity` and `customer_preference` tables and the current static tracking flow.
- Researched current delivery lifecycle, live location, ETA, privacy, Supabase Realtime, and mapping providers through official sources.
- Selected Google Maps plus private Supabase Broadcast as the India MVP direction, behind provider abstractions.
- Added [[delivery-operations]] and a five-sprint implementation backlog covering security, preferences, activity, fees, dispatch, rider PWA, maps, ETA, proof, and rollout.

## [2026-07-16] query | Forecast, voice, segregation, and AI services

- Verified the existing Random Forest training, cache, refresh route, metadata, and dashboard chart against source.
- Added a deployment-safe forecast-service sprint with run/point persistence and a dashboard Refresh Forecast workflow.
- Added a grounded menu voice-assistant design with typed fallback, push-to-talk, speech synthesis, and menu-ID validation.
- Added modular-monolith extraction tasks before recommendation/voice and forecasting microservice extraction.
- Added [[ai-microservices]] as the durable architecture summary.

## [2026-07-16] query | Map API free-tier options

- Compared Google India, TomTom, Geoapify, LocationIQ, Mapbox, MapTiler/MapLibre, open self-hosted stacks, and HERE using current official pricing/terms.
- Added a separate provider-options section to the sprint with quotas, card/billing requirements, commercial limitations, caching/attribution cautions, and selection ladder.
- Identified TomTom as the strongest no-credit-card developer option, Geoapify as the simplest small free prototype, and Google as the provisional India production option.
- Excluded HERE's Limited/Base plans from rider tracking because their published excluded-use terms cover asset tracking.

## [2026-07-16] query | Low-cost map architecture decision

- Selected Google Maps Platform India as the provisional MVP provider, protected by hard quotas, billing alerts, request budgets, and server-side key restrictions.
- Added Mappls as the India-specific production challenger and retained Mapbox as the managed customization/cost challenger.
- Assigned live GPS transport to private SliceMatic realtime channels and stop sequencing to OR-Tools so normal tracking does not generate paid provider calls.
- Added a future MapLibre plus OSRM migration path for high-volume routing, without depending on public OpenStreetMap or Nominatim services in production.

## [2026-07-16] query | Live UI map and screenshot baseline

- Logged into the live Chrome-controlled app with `demo@slicematic.in` and OTP `1111`.
- Captured screenshots for admin overview, orders, forecast, menu, AI, settings, nested menu pages, nested settings pages, customer menu, recommendations, customer details, payment checkout, and confirmation tracking.
- Created [[ui-map]] as the durable screen inventory and UI placement guide for delivery tracking, rider fees, forecast refresh, voice assistant, and AI service work.
- Placed a cash test order to verify `/payment` to `/confirmation`; Admin Orders now shows the new cash order and the current confirmation tracking page is static/simulated.

## [2026-07-16] query | UI map interaction coverage

- Added live screenshots for customer Recommendation, AI Cart Strategist with a cart line, and the Customize modal.
- Linked [[ui-map]] from [[source-map]] so future UI work can trace screenshots back to route and tab source.
- Confirmed the Customize modal is a first-class customer workflow for crust, size, toppings, quantity, and add-to-cart behavior.

## [2026-07-16] query | UI revamp implementation plan

- Treated `FullStack/` as the active project root after root-level planning/wiki content was moved under `FullStack/`.
- Created `FullStack/plans/ui-revamp-implementation-plan.md` from the live [[ui-map]] baseline, delivery sprint plan, local FullStack skills, and current UI research.
- Mapped customer, admin, dispatch, rider PWA, voice assistant, forecast refresh, and delivery tracking surfaces to implementation order and sprint dependencies.
- Updated [[index]], [[source-map]], [[ui-map]], and [[handoff]] so future sessions start from the FullStack-local plan.

## [2026-07-16] query | Modern UI revamp direction

- Updated root agent guidance so `FullStack/` UI work may deliberately introduce Tailwind CSS v4 or an equivalent token/component design-system layer.
- Expanded the UI revamp roadmap with skeleton loaders, customer-facing illustrations, motion tokens, reduced-motion requirements, accessible primitives, and a staged migration away from legacy global CSS.
- Kept the Dual-File Rule active until shared customer/admin UI is extracted from the current large files.

## [2026-07-16] query | UI inspiration research

- Created `FullStack/plans/ui-inspiration-research.md` as the pre-implementation visual research board.
- Focused the research on Apple-like minimal admin UI, checkout/payment trust, confirmation/tracking, skeleton loaders, tasteful motion, illustrations, and SliceMatic-specific design tokens.
- Added decision points for admin visual mode, checkout style, motion library, illustration strategy, and first implementation slice.
- Extended the board with Shopify Order Status, Polaris patterns, Mapbox, Onfleet, DoorDash dispatch, and Uber ETA references.

## [2026-07-16] query | Frontend architecture restructure

- Created `FullStack/plans/frontend-architecture-restructure.md` as the solution/frontend architecture plan.
- Documented the target feature-folder architecture, route composition rules, state categories, persistence decisions, URL-state rules, API client boundaries, and performance strategy.
- Recommended the first architecture slice: centralize storage keys/session helpers, extract checkout summary, and add route-transition recovery tests before broad UI redesign.

## [2026-07-16] query | Database schema and RLS evolution

- Created `FullStack/plans/database-schema-evolution-plan.md` after reviewing `FullStack/supabase/schema.sql`, data-service usage, auth/API wiki pages, and Supabase RLS documentation.
- Identified production RLS risks in broad `using (true)` policies for authenticated/admin and customer/order reads.
- Proposed additive schema changes for `customer.auth_user_id`, role-checked admin policies, customer-owned RLS, preference/activity enrichment, delivery quotes, delivery fee rules, riders, assignments, status events, sparse location pings, forecast runs/points, and AI interaction logs.
- Added the recommended "Apple-like delivery operations cockpit" structure and lifecycle-first confirmation structure.
- Updated [[css-system]] to mark the old no-Tailwind rule as historical and document the current Tailwind/component-system bridge.

## [2026-07-16] ingest | Revamp Sprint R1 checkout/session foundation

- Implemented the first revamp branch build slice from `FullStack/plans/frontend-architecture-restructure.md`.
- Added centralized storage keys in `lib/session/storageKeys.ts` and checkout recovery helpers in `lib/session/checkoutSession.ts`.
- Updated `/payment` to read member/guest checkout identity and Cashfree pending-payment recovery through helpers instead of raw storage strings.
- Updated `lib/store.ts`, `lib/session-customer.ts`, and tests to use shared key constants.
- Removed remaining stale "vanilla CSS only" wiki/tooling guidance; the current styling direction is a deliberate token/component bridge using the best-fit stack.
- Validation: focused Vitest checkout/store tests passed 12/12; full `npm run test` passed 98/98; `npx tsc --noEmit` passed.

## [2026-07-16] ingest | Revamp Sprint R2 checkout component extraction

- Extracted `features/checkout/components/CheckoutSummary.tsx` from `/payment`.
- Kept `/payment` responsible for data, payment side effects, pricing calculation, and navigation.
- Kept `CheckoutSummary` responsible for basket rendering, payment policy, totals, payment mode cards, action button, and payment status rendering.
- Preserved existing CSS classes and business-rule totals so R2 is an architecture slice, not a visual redesign.
- Validation: full `npm run test` passed 98/98; `npx tsc --noEmit` passed.

## [2026-07-16] ingest | Revamp Sprint R3-R6 batch foundation

- Used sprint-specific subagents for R3 UI primitives, R4 forecast pilot, R5 payment/confirmation pilot, and R6 admin shell review; consolidated the safe landed work in the root agent.
- Added `components/ui` primitives (`Button`, `Card`, `Skeleton`, `StatusPill`) and `sui-*` CSS bridge classes/tokens with reduced-motion support.
- Enhanced `ForecastPanel` with refresh action/state, status pill, skeleton fallback, and previous-forecast preservation using the existing `/api/admin/forecast/refresh` route.
- Migrated `CheckoutSummary` payment/basket actions and surface wrappers to the new primitives without changing pricing/payment behavior.
- Added URL-backed admin tab state via `parseAdminTab()` and `selectAdminTab()` for `/admin-dashboard?tab=...`.
- Added `lib/delivery-state.ts` plus tests as a future dispatch/tracking state contract scaffold.
- Validation: full `npm run test` passed 104/104; `npx tsc --noEmit` passed.

## [2026-07-16] ingest | Revamp R5 confirmation and R6 admin order context

- Added a reusable order-journey contract/component to `/confirmation` and removed simulated map/rider/ETA claims.
- Added an accessible admin selected-order context panel with URL-backed selection on `/admin-dashboard` and matching Dual-File integration.
- Preserved the delivery security gate: no SQL, RLS, realtime, map provider, or dispatch API changes were made.
- Cleaned the stale checkout comment and obsolete handoff instructions.
- Validation: full `npm run test` passed 107/107; `npx tsc --noEmit` and `git diff --check` passed.

## [2026-07-16] ingest | Revamp R7A menu and pizza-builder extraction

- Extracted the duplicated customer catalogue and pizza builder into controlled feature components.
- Applied both integrations to `components/SliceMaticStage3.tsx` and `app/admin-dashboard/page.tsx` under the Dual-File Rule.
- Added four menu filtering/starting-price tests and normalized builder capacity to the configured outlet maximum.
- Preserved route, store, pricing, customer validation, cart mutation, and API ownership in the parent workspaces.
- Validation: full `npm run test` passed 111/111; `npx tsc --noEmit` and `git diff --check` passed.

## [2026-07-16] ingest | Sprint control consolidation and R8-R11 planning

- Designated `plans/fullstack-delivery-intelligence-sprints.md` as the single operational sprint source of truth.
- Kept architecture, UI revamp, inspiration, UI/UX, and database schema plans as reference inputs rather than separate active queues.
- Added frontend-first R8-R11 planning: cart/recommendation extraction, customer ordering shell cleanup, admin command/table workspace, and shared loading/empty/error/mobile polish.
- Added R8 edge cases for missing/invalid recommendation IDs, AI cart strategist failure/no-op states, max quantity enforcement, mobile cart reachability, and keyboard flow.
- Reconfirmed that SQL, RLS, maps, rider tracking, and live dispatch remain gated until frontend decomposition and fallback contracts are complete.

## [2026-07-16] ingest | Revamp R8 cart and recommendation extraction

- Added shared customer-ordering components for cart rail, cart line items, AI cart strategist, recommendation lane, and ordering flow tabs.
- Added `lib/cart-rail.ts` with focused tests for resolved line summaries, missing menu references, and delivery charge labels.
- Replaced duplicated cart, recommendation, AI cart strategist, flow tab, and admin tab navigation JSX in both giant workspaces.
- Preserved pricing, cart mutation, recommendation/AI fetches, routing, toasts, validation, and Zustand ownership in parent orchestrators.
- Started R9/R10/R11 without completing them: `CustomerFlowTabs`, `AdminTabNav`, and recommendation skeleton loading are now shared.
- Preserved the delivery security gate: no SQL, RLS, maps, rider tracking, realtime, or delivery API changes.
- Validation: full `npm run test` passed 114/114; `npx tsc --noEmit` and `git diff --check` passed.

## [2026-07-16] ingest | Revamp R9-R10 intake and orders workspace extraction

- Added shared `CustomerIntakeForm` and replaced duplicated customer intake form JSX in both giant workspaces.
- Added shared `AdminOrdersWorkspace` and `OrderTable` for admin orders presentation and selected-order detail composition.
- Preserved parent ownership for validation, step navigation, filters, pagination, URL state, admin refresh state, and data fetching.
- Preserved the delivery security gate: no SQL, RLS, maps, rider tracking, realtime, or delivery API changes.
- Validation: full `npm run test` passed 114/114; `npx tsc --noEmit` passed.
