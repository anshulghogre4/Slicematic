---
title: Delivery Operations and Live Tracking
type: architecture
status: proposed
scope: FullStack/
last_updated: 2026-07-16
implementation_plan: FullStack/plans/fullstack-delivery-intelligence-sprints.md
---

# Delivery Operations and Live Tracking

The current application has delivery address, zone, charge, and a static tracking step, but it does not yet have a delivery operations domain. The approved planning direction is described in `FullStack/plans/fullstack-delivery-intelligence-sprints.md`.

## Boundary

Kitchen/order status and courier status are separate state machines. `orders.order_status` remains kitchen/order lifecycle. A delivery assignment owns rider state, ETA, fee/payout quote, history, and location.

```text
Order/payment → kitchen ready → assignment → pickup → live trip → proof/delivered
```

## Core rules

- Persist authoritative transition and history atomically before publishing realtime events.
- Persist the fee/rider payout quote with a rule version; do not recompute history.
- Customers can read only deliveries for their own orders.
- Riders can read/update only their active assignments.
- Admin actions require a verified admin role, not merely an authenticated token.
- Collect rider GPS only during active delivery and delete precise traces according to retention policy.
- Customer tracking must show last-update age and degraded state; never simulate live motion.
- Preferences use explicit choices plus derived affinity; explicit exclusions always win.

## Current implementation scaffold

Revamp Sprint R6 added `lib/delivery-state.ts` and `lib/delivery-state.test.ts` as a pure TypeScript state-contract scaffold. It does not persist delivery data yet and does not enable live rider tracking. It currently defines:

- delivery statuses from `unassigned` through `delivered`/`cancelled`
- allowed actor-based transitions for admin, rider, and system actions
- terminal delivery states
- statuses where live location is allowed to be shown
- customer/admin-readable labels for future UI controls

This scaffold should feed future DB migrations, admin dispatch controls, rider PWA actions, and customer tracking copy. SQL/RLS work is still required before live delivery implementation.

Revamp R5/R6 now consume that safety direction in the UI. `/confirmation` uses a recorded-status `OrderJourneyRail` and no longer renders a fake route, named rider, or invented ETA. Admin Orders can open a real order context panel, but it explicitly withholds dispatch, rider location, and ETA until the delivery schema and policies exist.

## Proposed technology

- Provisional MVP choice: Google Maps JavaScript + Routes API for India, operated inside eligible India free caps with hard quotas and billing alerts.
- Zero-card developer/demo choice: TomTom; lightweight proof-of-concept alternative: Geoapify + MapLibre.
- Compare Google, Mappls, Mapbox, TomTom, and Geoapify on representative Delhi addresses before lock-in.
- Use private SliceMatic realtime transport for GPS marker movement and OR-Tools for stop sequencing; routine GPS updates must not consume paid route/geocode calls.
- Preserve an OSRM/MapLibre scale path for high-volume routing while retaining managed address validation where India accuracy requires it.
- Supabase private Broadcast for status/location; authenticated snapshot and polling fallback.
- Foreground rider PWA for the demo; native/provider integration required for dependable background GPS.

See the dedicated “Map, geocoding, and routing API options” section in `FullStack/plans/fullstack-delivery-intelligence-sprints.md` for current free caps, billing requirements, commercial restrictions, and references.

## Related knowledge

- [[business-rules]] for checkout pricing order
- [[database-schema]] for the current source model
- [[auth-flows]] and [[current-state]] for security prerequisites
- [[state-management]] for current customer checkout state
- [[feature-recommendation]] for preference/activity consumption
- [[payments]] for the order-finalization boundary
