---
title: SliceMatic UI Revamp Roadmap
type: plan-summary
status: active
scope: FullStack/
last_updated: 2026-07-16
---

# SliceMatic UI Revamp Roadmap

The detailed roadmap lives at `FullStack/plans/ui-revamp-implementation-plan.md`.

Use this page as the wiki entry point for UI revamp work. Pair it with [[ui-map]] for the current visual baseline, `FullStack/plans/ui-inspiration-research.md` for reference direction, [[delivery-operations]] for the delivery domain, [[feature-forecasting]] for Random Forest refresh work, [[feature-recommendation]] and [[feature-ai-strategist]] for AI surfaces, and [[css-system]] for the legacy CSS inventory plus the planned Tailwind/design-system bridge.

## Direction

- Customer UI should make the order path obvious: menu, cart, delivery setup, payment, preparation, rider, delivered.
- Customer UI should feel polished and alive: appetizing product imagery, useful illustrations, skeleton loaders, tasteful animation, and friendly empty/error states.
- Admin UI should become a dense operations command center: unassigned orders, active riders, delayed orders, stale ETAs, forecast age, and AI service health.
- AI UI must show grounded sources: matched menu items, recommendation reasons, forecast run IDs, or deterministic fallback.
- Delivery tracking should be lifecycle-first and map-second. Never fake rider motion.
- Tailwind CSS v4 or a stronger component/design-system layer is allowed, but only through semantic tokens, shared primitives, accessibility rules, and a staged migration.
- The current reference direction is warm customer ordering plus an Apple-like admin operations cockpit: subtle material layers, quiet motion, contextual drawers, fee clarity, honest confirmation tracking, and useful state illustrations.

## Sprint Track

1. Documentation relocation and modern design-system audit.
2. Customer ordering clarity: cart, customize modal, recommendations, strategist.
3. Delivery setup: address validation, fee preview, quote mirroring.
4. Admin dispatch: orders board/table, assignment drawer, ETA/stale/exception badges.
5. Confirmation tracking: real timeline, live map when available, fallback states.
6. Forecast and AI console: refresh runs, service health, typed/voice menu assistant.
7. Modular extraction: feature folders and shared components so giant UI files stop growing.

## UI Quality Rules

- Add skeletons for menu cards, recommendations, cart strategist, payment summary, tracking timeline, map panels, order tables, forecast charts, and AI service cards.
- Use animation for orientation and feedback: page/section entry, add-to-cart, modal transitions, order timeline progress, rider status, and forecast refresh.
- Keep routine motion under 300ms, use transform/opacity where possible, avoid `transition: all`, and honor `prefers-reduced-motion`.
- Illustrations must clarify a state: empty cart, no delivery provider, offline tracking, no forecast history, AI unavailable, or outside delivery radius.

## Update Rule

When any UI surface changes, update:

- [[ui-map]] and affected screenshots under `FullStack/wiki/assets/ui-map/`
- this page if the roadmap changes
- [[handoff]]
- [[log]]
