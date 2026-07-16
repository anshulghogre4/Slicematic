---
title: FullStack UI Revamp Implementation Plan
status: ready-for-review
owner: SliceMatic FullStack team
created: 2026-07-16
scope: FullStack UI, admin operations, customer ordering, delivery tracking, AI surfaces
baseline: FullStack/wiki/ui-map.md
---

# FullStack UI Revamp Implementation Plan

This plan turns the current screenshot-backed UI baseline in `FullStack/wiki/ui-map.md` and the delivery sprint in `FullStack/plans/fullstack-delivery-intelligence-sprints.md` into a concrete revamp path.

The goal is not a cosmetic reskin. SliceMatic needs two clear product modes:

1. Customer ordering: fast menu discovery, trustworthy customization, visible cart confidence, transparent delivery fees, and honest post-order tracking.
2. Admin operations: a compact command center for orders, forecast refresh, AI service health, delivery exceptions, rider assignment, and cost control.

The newest product direction raises the visual bar: customer-facing screens should feel polished and alive, with tasteful animation, appetizing imagery/illustrations, strong loading skeletons, and modern component-system ergonomics. Tailwind CSS v4 or a stronger UI layer is allowed if introduced as a planned migration rather than scattered utilities.

## Design Direction

Domain:

- Single-outlet pizza ordering
- Kitchen readiness
- Rider assignment
- ETA confidence
- Menu intelligence
- Cash/payment risk
- Forecast demand

Color world:

- Tomato red for brand/action
- Charcoal ink for operator readability
- Warm dough/off-white for customer surfaces
- Basil/green only for success and availability
- Amber only for delay, risk, or attention
- Blue only for map/location/forecast intelligence

Signature:

- A compact "order journey rail" reused across customer confirmation, admin orders, and dispatch. It shows kitchen state, rider state, ETA confidence, and exception state without pretending that every order has live GPS.
- A "warm kinetic pizzeria" customer layer: animated but calm, food-first, responsive on mobile, with skeleton states and illustrations for every waiting/empty moment.
- A "quiet operations cockpit" admin layer: dense, stable, fast to scan, with restrained motion used for changed state and attention only.

Rejecting:

- Generic marketplace clone -> single-outlet ordering with stronger cart and menu confidence.
- Static tracking card -> lifecycle timeline with map only when real provider/location data exists.
- KPI-card-only admin dashboard -> operator cockpit with exceptions, queue pressure, and next actions.
- AI as decoration -> grounded assistant widgets that expose matched menu IDs, forecast run IDs, or cart mutations.

## Foundation Before Visual Rewrite

Use the existing UI as the baseline, then extract before redesigning deeply.

1. Keep root routes stable: `/`, `/payment`, `/confirmation`, `/admin-dashboard`.
2. Extract feature folders before major UI changes:
   - `features/customer-ordering`
   - `features/admin-dashboard`
   - `features/delivery-tracking`
   - `features/menu-assistant`
3. Create shared primitives only when they remove duplication:
   - `OrderJourneyRail`
   - `DeliveryFeeBreakdown`
   - `EtaConfidenceBadge`
   - `AssistantComposer`
   - `ForecastRunStatus`
   - `DispatchQueue`
4. Keep `FullStack/app/globals.css` stable until a screen is intentionally migrated.
5. Any shared UI still duplicated between `components/SliceMaticStage3.tsx` and `app/admin-dashboard/page.tsx` must obey the Dual-File Rule until extracted.

### Modern Styling And Motion Migration

Decision update: the old "vanilla CSS only" constraint is no longer the target. The project may move toward Tailwind CSS v4 or an equivalent token-driven component system.

Migration guardrails:

- Start with semantic CSS variables for brand, surface, border, shadow, status, spacing, radius, and motion tokens.
- Add Tailwind only through a small design-system bridge: tokens, shared primitives, and reusable variants.
- Do not mix legacy BEM-style classes, inline styles, and one-off utility clusters on the same surface without an extraction step.
- New shared UI should live behind primitives such as `Button`, `Card`, `Badge`, `Input`, `Dialog`, `Popover`, `Skeleton`, `StatusPill`, and `MetricCard`.
- Use CSS transitions/animations for routine state; consider a small motion library only for complex route/cart/timeline choreography after bundle review.
- Respect `prefers-reduced-motion`; no blocking entrance animations and no `transition: all`.

Required skeleton components:

- `MenuCardSkeleton`
- `RecommendationSkeleton`
- `CustomizeModalSkeleton`
- `CartInsightSkeleton`
- `PaymentSummarySkeleton`
- `TrackingTimelineSkeleton`
- `MapPanelSkeleton`
- `OrderTableSkeleton`
- `ForecastChartSkeleton`
- `AiServiceCardSkeleton`

Illustration and image direction:

- Product/menu visuals should be appetizing and real where possible.
- Empty states can use custom pizza/kitchen/rider illustrations, but they must explain the state rather than decorate it.
- Confirmation/tracking art should communicate progress and trust, not fake live movement.
- Every image needs dimensions and appropriate alt/decorative handling.

## Customer UI Revamp

### Portal

Current baseline: `FullStack/wiki/assets/ui-map/02-customer-start.png`

Build direction:

- Keep login/guest entry as the main task.
- Add "Ask what's on the menu" only after the menu assistant has typed fallback and grounding.
- Do not let the portal become a marketing page.

Implementation:

- Add a compact secondary menu-assistant entry after Sprint 4 voice work.
- Preserve guest flow and OTP clarity.
- Keep demo behavior explicit for local testing only.

### Menu And Catalog

Current baseline: `FullStack/wiki/assets/ui-map/03-customer-menu.png`

Build direction:

- Make menu scanning faster: sticky search/category row, dietary tags, quick prep/bestseller signals, and clean add/customize actions.
- Keep cart visible on desktop and easy to open on mobile.

Implementation:

- Add `MenuFilterBar` with text search, dietary filter, spice/price filter, and category chips.
- Add item badges backed by menu data, not AI-generated labels.
- Add skeleton states for menu and recommendation loading.
- Add empty/error states for unavailable menu data.
- Add polished menu-card motion: staggered entry, hover/tap affordance, animated add-to-cart confirmation, and reduced-motion fallback.
- Use real pizza imagery or coherent generated illustrations for unavailable/fallback item art.

### Recommendations

Current baseline: `FullStack/wiki/assets/ui-map/04-customer-recommendations.png`

Build direction:

- Keep recommendations near the menu and make them explainable.
- Show why an item was recommended and what data was used.

Implementation:

- Add reason tags such as `matches preferences`, `popular today`, `good for 2`, `fast prep`.
- Keep `Refresh recommendations`, but route it through the future AI service contract.
- Add validation that every recommended item maps to a current menu ID.

### Customize Modal

Current baseline: `FullStack/wiki/assets/ui-map/09-customer-customize-modal.png`

Build direction:

- Treat customization as the high-trust builder moment.
- No hidden upsell defaults. Every extra topping or upgrade must visibly affect price.

Implementation:

- Split into item summary, grouped options, and sticky footer.
- Footer always shows quantity, final line price, and `Add to cart`.
- Add keyboard/focus support and Escape/close behavior if not already complete.
- Add price-change animation under 200ms and respect `prefers-reduced-motion`.
- Treat the modal as a mobile bottom sheet on small screens, with clear drag/close affordance and no hidden scroll traps.

### AI Cart Strategist

Current baseline: `FullStack/wiki/assets/ui-map/06-ai-cart-strategist.png`

Build direction:

- Make it a cart coach, not an ad block.
- Suggest one or two useful actions with commercial impact.

Implementation:

- Show impact labels: `adds Rs X`, `saves Rs Y`, `better for 2 people`.
- Add accept/dismiss actions.
- Ground all actions against cart and menu IDs.
- Keep order placement possible when AI fails.

### Details, Payment, And Fee Trust

Current baselines:

- `FullStack/wiki/assets/ui-map/customer-customer-details.png`
- `FullStack/wiki/assets/ui-map/payment-checkout.png`

Build direction:

- Customer details becomes the first delivery-intelligence point.
- Payment becomes the final transparent fee checkpoint.

Implementation:

- Add address validation/serviceability after provider spike.
- Show distance/zone/ETA preview before payment.
- Add fee breakdown:
  - base delivery fee
  - distance/rider fee
  - promotion/free-delivery adjustment
  - final customer delivery charge
- Keep cash as the primary test path.

### Confirmation And Tracking

Current baseline: `FullStack/wiki/assets/ui-map/01-confirmation-tracking.png`

Build direction:

- Replace simulated tracking with honest lifecycle tracking.
- Show map only when map/provider and real assignment/location exist.

Implementation:

- Add `OrderJourneyRail` with kitchen and delivery states.
- Add assigned rider card after assignment.
- Add map/polyline behind provider abstraction.
- Add stale/offline state and "last updated" timestamp.
- Add receipt/reorder/support zones below tracking.

## Admin UI Revamp

### Overview

Current baseline: `FullStack/wiki/assets/ui-map/admin-overview.png`

Build direction:

- Move from KPI dashboard to operator command center.
- Prioritize what needs action now.

Implementation:

- Add delivery health strip:
  - active riders
  - unassigned ready orders
  - delayed orders
  - average ETA
  - stale GPS/order updates
- Add "next action" queue for exceptions.
- Keep revenue/order KPIs but demote them below operational pressure during active shifts.

### Orders

Current baseline: `FullStack/wiki/assets/ui-map/admin-orders.png`

Build direction:

- Turn the ledger into a dispatch-capable table.

Implementation:

- Add columns for kitchen state, delivery state, rider, ETA, fee quote, and exception.
- Add row drawer for timeline, assignment history, payment, customer note, and delivery quote.
- Add actions:
  - assign/reassign rider
  - mark kitchen ready
  - open tracking map
  - update delivery state
- Use optimistic version/conflict messaging once delivery state machine exists.

### Forecast

Current baseline: `FullStack/wiki/assets/ui-map/admin-forecast.png`

Build direction:

- Keep the RandomForestRegressor story visible, but make refresh operational.

Implementation:

- Add `Refresh forecast` button wired to the existing refresh route first.
- UI states: idle, requesting, training, succeeded, failed, stale.
- Show latest run ID, order watermark, RMSE, training duration, bucket count, and last-success age.
- Later switch the button to the Forecast Service contract without changing the panel behavior.
- Show forecast chart skeletons and a visible "last successful forecast remains active" banner during failed refresh.

### Menu

Current baselines:

- `FullStack/wiki/assets/ui-map/admin-menu.png`
- `FullStack/wiki/assets/ui-map/admin-menu-pizzas.png`
- `FullStack/wiki/assets/ui-map/admin-menu-bases.png`
- `FullStack/wiki/assets/ui-map/admin-menu-toppings.png`

Build direction:

- Make menu operations the source of truth for recommendation and voice surfaces.

Implementation:

- Add availability, prep-time, dietary, and recommendation metadata fields only after schema approval.
- Show where each menu item is used by recommendation/voice.
- Keep AI copy polish, but validate output before saving.

### AI

Current baseline: `FullStack/wiki/assets/ui-map/admin-ai.png`

Build direction:

- Convert documentation into an AI operations console.

Implementation:

- Add status cards for recommendation, cart strategist, menu assistant, and forecast service.
- Add menu assistant test panel with typed input first; push-to-talk later.
- Show grounded response: answer, matched menu IDs, source timestamp, validation errors.
- Show deterministic fallback status when OpenRouter/service is unavailable.

### Settings / Delivery And Risk

Current baseline: `FullStack/wiki/assets/ui-map/admin-settings-delivery-risk.png`

Build direction:

- This becomes the configuration hub for delivery economics and provider safety.

Implementation:

- Add provider selection/status:
  - Google India MVP
  - TomTom no-card demo challenger
  - Geoapify quick prototype
  - Mappls India challenger
  - Mapbox customization challenger
- Add quota/usage warnings and key-status checks without exposing secrets.
- Add rider fee formula editor after fee v1 is approved.
- Add service radius, ETA buffer, batching rules, GPS retention, and guest cash risk controls.

### Dispatch Board

Current baseline: new surface, derived from Admin Orders and Overview.

Build direction:

- A dense board for operators during live service.

Implementation:

- Columns: ready/unassigned, offered, active, late, exception, delivered.
- Cards show order age, ETA, rider, distance, payout, customer note, and payment mode.
- Map panel can be split-view once provider work exists.
- Do not build this before Sprint 2 schema and state machine are approved.

### Rider PWA

Current baseline: new surface.

Build direction:

- Minimal, foreground-only rider workflow for demo and MVP.

Implementation:

- Current assignment, accept/reject, pickup, arriving, delivered.
- Clear location permission disclosure.
- Customer details revealed only after assignment acceptance.
- No promise of background tracking until native/background-capable implementation exists.

## Sprint Mapping

| Sprint | UI revamp deliverable | Dependency |
|---|---|---|
| Sprint 0 | Feature extraction map, UI baseline references, provider scorecard UI requirements | Current screenshots and delivery ADR |
| Sprint 1 | Customer preferences, activity consent, menu/recommendation UI cleanup, extraction wave 1 | Preference/activity APIs |
| Sprint 2 | Delivery fee quote in details/cart/payment, admin dispatch actions, dispatch board skeleton | Delivery schema, fee calculator, transactional states |
| Sprint 3 | Confirmation tracking with map/timeline/stale states, private realtime recovery | Location ingestion, realtime auth, provider adapter |
| Sprint 4 | Admin AI console, menu assistant typed/push-to-talk, proof/support UI | AI service extraction, notification/proof policy |
| Sprint 5 | Forecast refresh operational UI and run-history metadata | Forecast persistence and service contract |

## Implementation Order

1. Documentation and design system alignment
   - Keep `FullStack/wiki/ui-map.md` as the screenshot baseline.
   - Update `AGENTS.md` and wiki rules to allow deliberate Tailwind/design-system migration.
   - Create or update an interface design system note before the first component migration.

2. Modular extraction
   - Extract customer menu/cart/recommendation components.
   - Extract admin tab shell and panels.
   - Add characterization tests around current behavior before moving logic.

3. Low-risk UI wins
   - Forecast refresh button.
   - Recommendation reason tags.
   - AI cart strategist accept/dismiss.
   - Customize modal sticky footer and clearer price breakdown.
   - Skeleton loaders for menu, recommendations, cart strategist, forecast, AI service cards, and order tables.
   - First pass of customer-facing motion and empty-state illustrations.

4. Delivery fee trust path
   - Details serviceability.
   - Cart fee preview.
   - Payment final fee confirmation.

5. Admin operations path
   - Orders row drawer.
   - Delivery state/rider/ETA columns.
   - Overview delivery health strip.
   - Dispatch board after state machine exists.

6. Tracking path
   - Confirmation lifecycle timeline.
   - Map provider adapter UI.
   - Stale/offline states.

7. AI and service consoles
   - Admin AI service health.
   - Menu assistant typed UI.
   - Voice push-to-talk.
   - Forecast service run history.

## Quality Bar

- Every async panel has loading, empty, error, and stale states.
- Every mutation has success/failure feedback and idempotency behavior.
- Every AI answer exposes grounding data or a deterministic fallback.
- Every delivery value shown to the user is server-authoritative.
- Every map/tracking UI has no-provider and no-location fallbacks.
- Every screenshot changed by implementation is refreshed in `FullStack/wiki/assets/ui-map/`.
- Every customer-facing wait has a skeleton, progress state, or useful illustration.
- Every animation is purposeful, short, transform/opacity-first, and has reduced-motion support.
- Every new component is accessible by keyboard and screen reader before visual polish is considered complete.

## Research Inputs

These sources informed the current revamp direction and should be rechecked before final provider/vendor decisions:

- DoorDash Drive webhook lifecycle and fields: https://developer.doordash.com/en-US/docs/drive/reference/webhooks/
- Onfleet delivery management review: https://www.techradar.com/reviews/onfleet
- Onfleet overview: https://en.wikipedia.org/wiki/Onfleet
- DoorDash Drive webhook lifecycle: https://developer.doordash.com/en-US/docs/drive/how_to/webhooks/
- Uber DeeprETA paper: https://arxiv.org/abs/2206.02127
- Next.js Backend for Frontend guide: https://nextjs.org/docs/app/guides/backend-for-frontend
- MDN SpeechRecognition limitations: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
- Google Maps Fleet Engine / last-mile docs: https://developers.google.com/maps/documentation/mobility
- Google Maps Routes API: https://developers.google.com/maps/documentation/routes
- Mapbox Directions API: https://docs.mapbox.com/api/navigation/directions/
- Supabase Realtime Broadcast: https://supabase.com/docs/guides/realtime/broadcast
- Just Eat voice assistant coverage: https://www.thetimes.com/business/technology/article/just-eat-talking-voice-assistant-to-give-tailored-recommendations-f9jq0jnxn
- Alexa+ food ordering coverage: https://people.com/food-delivery-including-grubhub-and-uber-eats-comes-to-amazon-alexa-11942862
- Food recommendation research: https://arxiv.org/abs/2210.08266
- Food-delivery UI study: https://arxiv.org/abs/2401.14409

## Open Decisions

- Exact Tailwind/component migration stack: Tailwind v4 only, Tailwind plus variant helpers, or a stronger primitive library with Tailwind-compatible tokens.
- Whether dispatch board is a separate admin tab or a mode inside Orders.
- Whether customer voice starts as text-only assistant before microphone support.
- Whether rider PWA lives under `/rider` inside this Next.js app or as a separate app after Sprint 2.
- Which map provider wins Sprint 0 Delhi address/route bake-off.
- Whether custom illustrations are built as SVG/code assets, generated raster assets, or a mixed system.
