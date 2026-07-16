---
title: Delivery Operations and Live Tracking
type: architecture
status: proposed
scope: FullStack/
last_updated: 2026-07-16
implementation_plan: plans/fullstack-delivery-intelligence-sprints.md
---

# Delivery Operations and Live Tracking

The current application has delivery address, zone, charge, and a static tracking step, but it does not yet have a delivery operations domain. The approved planning direction is described in `plans/fullstack-delivery-intelligence-sprints.md`.

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

## Proposed technology

- Provisional production choice: Google Maps JavaScript + Routes API for India, behind provider interfaces.
- Zero-card developer/demo choice: TomTom; lightweight proof-of-concept alternative: Geoapify + MapLibre.
- Compare Google, TomTom, Geoapify, and Mapbox on representative Delhi addresses before lock-in.
- Supabase private Broadcast for status/location; authenticated snapshot and polling fallback.
- Foreground rider PWA for the demo; native/provider integration required for dependable background GPS.

See the dedicated “Map, geocoding, and routing API options” section in `plans/fullstack-delivery-intelligence-sprints.md` for current free caps, billing requirements, commercial restrictions, and references.

## Related knowledge

- [[business-rules]] for checkout pricing order
- [[database-schema]] for the current source model
- [[auth-flows]] and [[current-state]] for security prerequisites
- [[state-management]] for current customer checkout state
- [[feature-recommendation]] for preference/activity consumption
- [[payments]] for the order-finalization boundary
