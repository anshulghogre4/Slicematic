---
title: SliceMatic Session Handoff
type: handoff
status: active
last_updated: 2026-07-16
---

# SliceMatic Session Handoff

Read [[index]] first. Durable delivery design now lives in [[delivery-operations]] and `plans/fullstack-delivery-intelligence-sprints.md`.

## Latest work

- Audited the unused `customer_activity` and `customer_preference` schema and existing post-order flow.
- Compared live-delivery patterns, Google Maps, Mapbox, HERE, MapLibre/OSM, and Supabase Realtime through specialist research.
- Created a five-sprint implementation backlog for preference/activity utilization, dispatch, rider fees, ETA, live tracking, proof, privacy, and rollout.
- Chose Google Maps + private Supabase Broadcast as the provisional India MVP stack, subject to a Delhi address/route bake-off.
- Extended the sprint with the existing Random Forest refresh workflow, a grounded dashboard menu voice assistant, UI/server segregation, and separate AI and Forecast services.
- Added a dedicated map/geocoding/routing API comparison: Google, TomTom, Geoapify, LocationIQ, Mapbox, MapTiler/MapLibre, open/self-hosted, and HERE restrictions.

## Files changed

- `plans/fullstack-delivery-intelligence-sprints.md`
- `wiki/delivery-operations.md`
- `wiki/index.md`
- `wiki/source-map.md`
- `wiki/log.md`
- `wiki/handoff.md`
- `wiki/ai-microservices.md`

No FullStack application code or SQL schema was changed in this planning sprint.

## Next action

Start Sprint 0. Do not implement precise rider tracking before:

1. Admin/customer/rider authorization and RLS are hardened.
2. Delivery and kitchen state transitions are approved.
3. The versioned fee/payout examples are approved.
4. An ordered migration strategy exists.
5. Google, TomTom, Geoapify, and Mapbox are tested on representative Delhi addresses using the sprint scorecard.

Then execute modular extraction and contract tests before deploying recommendation/voice or forecasting as remote services. The existing forecast logic must remain behaviorally compatible during extraction.

## Existing verification baseline

- `npm run build`: passed on 2026-07-16.
- `npm test`: 92 passed, one `resetSession()` address assertion failed.

At the end of every material task, update affected pages and append to [[log]].
