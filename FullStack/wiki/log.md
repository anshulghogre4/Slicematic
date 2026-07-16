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
