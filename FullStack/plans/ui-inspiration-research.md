---
title: SliceMatic UI Inspiration Research
status: ready-for-review
owner: SliceMatic FullStack team
created: 2026-07-16
scope: FullStack admin dashboard, checkout, payment confirmation, and post-order tracking UI
---

# SliceMatic UI Inspiration Research

This file is the visual-direction research layer before implementation. It should be read with:

- `FullStack/wiki/ui-map.md` — current screenshot baseline
- `FullStack/plans/ui-revamp-implementation-plan.md` — implementation roadmap
- `FullStack/plans/fullstack-delivery-intelligence-sprints.md` — delivery, AI, forecast, and map-provider sprint backlog

The goal is not to clone Apple, Stripe, Shopify, DoorDash, or Linear. The goal is to extract patterns that fit SliceMatic: a single-outlet pizza ordering product with customer checkout, delivery trust, admin dispatch, forecasting, and AI tools.

## Research Pass Status

For this pass, Codex launched dedicated research threads for:

1. Customer checkout, payment, confirmation, and post-order tracking inspiration.
2. Apple-like admin dashboard, dispatch, forecasting, and AI operations console inspiration.

The durable direction below is the current synthesis for design review. If later research threads return sharper examples, append them to this file instead of creating a second inspiration document.

## Direction Summary

Recommended direction:

> SliceMatic should feel like a warm Apple-like operations product: quiet surfaces, premium spacing, subtle glass/layering, strong typography, animated state changes, food-first illustrations, and an admin cockpit that makes exceptions obvious without looking noisy.

For customers, the UI should feel appetizing and reassuring. For admins, it should feel calm, minimal, and operationally sharp.

## Research Sources

Primary source links used for this draft:

- Apple Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/
- Apple HIG Motion: https://developer.apple.com/design/human-interface-guidelines/motion
- Apple HIG Materials: https://developer.apple.com/design/human-interface-guidelines/materials
- Stripe Checkout overview: https://docs.stripe.com/payments/checkout
- Stripe custom success page: https://docs.stripe.com/payments/checkout/custom-success-page
- Shopify Checkout UI extensions: https://shopify.dev/docs/api/checkout-ui-extensions/latest
- Shopify Thank You and Order Status customization: https://shopify.dev/docs/apps/build/checkout/thank-you-order-status
- Shopify Polaris components: https://polaris-react.shopify.com/components
- Shopify Polaris patterns: https://polaris-react.shopify.com/patterns
- Vercel Geist design system: https://vercel.com/geist/introduction
- Linear Method: https://linear.app/method
- DoorDash Drive webhook lifecycle: https://developer.doordash.com/en-US/docs/drive/reference/webhooks/
- Mapbox store locator tutorial: https://docs.mapbox.com/help/tutorials/building-a-store-locator/
- Onfleet delivery management review: https://www.techradar.com/reviews/onfleet
- DoorDash dispatch research: https://arxiv.org/abs/2606.13604
- Uber DeeprETA research: https://arxiv.org/abs/2206.02127
- Dashboard design patterns research: https://arxiv.org/abs/2205.00757
- Cooperative dashboard heuristics: https://arxiv.org/abs/2308.04514

## Product Domain Exploration

Domain vocabulary:

- Oven queue
- Rider assignment
- ETA confidence
- Fee trust
- Cash risk
- Forecast pressure
- AI recommendation grounding
- Menu freshness
- Delivery lifecycle
- Customer reassurance

Color world:

- Dough white / warm cream
- Tomato red
- Basil green
- Charcoal ink
- Stainless steel grey
- Delivery-map blue
- Oven amber
- Soft mozzarella yellow

Signature:

- `OrderJourneyRail`: a reusable lifecycle strip across checkout confirmation, admin orders, dispatch, and rider workflow.
- It should show: placed → preparing → ready → assigned → picked up → near → delivered.
- It should support unknown, stale, offline, delayed, and provider-unavailable states.
- It should never fake live rider movement.

Rejecting defaults:

- Generic SaaS KPI card grid → calm command center with exception-first hierarchy.
- Marketplace food app clone → single-outlet pizza experience with stronger trust and personality.
- Decorative AI panel → grounded AI cards with source menu IDs, forecast run IDs, or cart changes.
- Fake animated map → lifecycle-first tracking with map only when real route/location data exists.
- Spinner-only loading → skeletons and useful progress states.

## Admin Dashboard Inspiration

### Apple-like principles to borrow

Apply these as product design principles, not literal Apple chrome:

- Minimal chrome: navigation and panels should get out of the way of the operator's task.
- Layering: use subtle surface depth for sidebars, drawers, cards, and floating controls.
- Calm motion: animate state changes, modals, drawers, and important transitions; avoid constant motion in dense tables.
- Hierarchy through typography and space: make the next operational action obvious before adding more charts.
- Materials: allow tasteful glass/blur for fixed navigation, command bars, and map overlays, but keep data tables highly legible.

SliceMatic admin should feel more like a Mac operations app than a generic web admin template.

### Admin layout pattern

Recommended shell:

```text
┌────────────────────────────────────────────────────────────┐
│ Top command bar: Outlet status · Search · Refresh · Admin   │
├───────────────┬────────────────────────────────────────────┤
│ Minimal rail  │ Shift cockpit                              │
│ Overview      │ ┌ Delivery health strip ┐                  │
│ Orders        │ ├ Exception queue       ┤                  │
│ Dispatch      │ ├ Forecast pressure     ┤                  │
│ Forecast      │ ├ Active orders table   ┤                  │
│ AI Console    │ └ Right drawer/map      ┘                  │
│ Settings      │                                            │
└───────────────┴────────────────────────────────────────────┘
```

Dashboard hierarchy:

1. Exception queue: delayed, unassigned, failed payment, stale rider GPS.
2. Delivery health: active riders, average ETA, ready/unassigned orders.
3. Forecast pressure: peak hour, forecast age, refresh status.
4. Revenue/order KPIs: still present, but demoted during active service.

This follows dashboard research direction: dashboards should support monitoring, interaction, and analytical conversation, not just display static metrics.

### Admin surfaces

Overview:

- Use one wide `Shift Status` panel instead of many equal KPI cards.
- Add compact metric chips: `8 active`, `3 delayed`, `2 unassigned`, `forecast 14m old`.
- Add a tiny timeline or sparkline only when it changes decisions.

Orders:

- Table-first for density.
- Add right-side drawer for timeline, customer note, fee quote, rider assignment, and payment.
- Use status dots and short labels, not large colored pills everywhere.
- Animate row changes with a soft background flash, then settle.

Dispatch:

- Board or lane mode only after delivery state schema exists.
- Keep lane names operational: Ready, Offered, Active, Late, Exception, Delivered.
- Cards should show age, ETA, rider, payment mode, and customer note.

Forecast:

- Keep RandomForestRegressor visible as credibility metadata.
- Add `Refresh forecast` as a primary action.
- Add skeleton chart while refreshing.
- Failed refresh should keep the last successful forecast active.

AI Console:

- Convert the current docs-style AI tab into service cards:
  - Recommendation service
  - Cart strategist
  - Menu assistant
  - Forecast service
- Each card should show status, last success, fallback mode, and test action.

### Admin animation ideas

Use animation sparingly:

- Soft page section entrance: 120–180ms.
- Drawer open/close: 180–240ms, transform + opacity only.
- Row update flash: 600–900ms background fade, no movement.
- Forecast refresh: chart skeleton → chart settle; run status ticks forward.
- Exception count changes: small numeric crossfade with tabular numbers.
- Map/drawer overlay: glass panel with stable table behind it.

Avoid:

- Animated numbers that roll constantly.
- Floating charts with unnecessary parallax.
- Anything that slows the operator's repeated actions.

### Admin illustration ideas

Illustrations should be rare in admin. Use them for:

- No orders yet
- No active riders
- Forecast unavailable
- AI service offline
- Map provider not configured

Style:

- Thin-line, monochrome or two-tone pizza/kitchen/rider drawings.
- Small and quiet.
- Never compete with operational data.

## Checkout And Confirmation Inspiration

### Stripe-inspired checkout lessons

Stripe Checkout emphasizes:

- Clear order summary.
- Payment details in a focused surface.
- Built-in support for subtotal, tax, shipping, discounts, and dynamic payment methods.
- A custom success page that displays customer order information after payment.

SliceMatic implication:

- Payment should keep a stable two-column shape on desktop: checkout actions left, order/fee summary right.
- Final delivery fee, GST, discount, and total must be visible before placing order.
- Cash test path should look equally first-class, not like a debug mode.
- Confirmation page should fetch/display real order data rather than depend on browser-only state.

### Shopify checkout lessons

Shopify Checkout UI extensions use defined target zones and web components so custom UI appears in specific checkout/thank-you locations and uses checkout data like cost breakdown.

SliceMatic implication:

- Treat checkout as a set of stable zones:
  - Contact/address
  - Delivery promise
  - Payment method
  - Fee breakdown
  - Review/place order
  - Thank-you/tracking
- Do not sprinkle AI or delivery messages randomly.
- Voice/recommendation nudges should appear only where they help the current decision.

### Customer checkout layout

Recommended desktop:

```text
┌────────────────────────────────────────────────────────────┐
│ SliceMatic Checkout · stepper: Details → Payment → Track   │
├────────────────────────────┬───────────────────────────────┤
│ Delivery details           │ Sticky order summary          │
│ Address/serviceability     │ Items                         │
│ Contact/cash controls      │ Discount/GST/delivery         │
│ Payment method cards       │ ETA/fee confidence            │
│ Place order                │ Trust notes                   │
└────────────────────────────┴───────────────────────────────┘
```

Recommended mobile:

- Single column.
- Sticky bottom total/action bar.
- Collapsible order summary.
- Address/serviceability state before payment method.

### Confirmation and after-order layout

Recommended confirmation:

```text
┌────────────────────────────────────────────────────────────┐
│ Order confirmed · #8150... · paid/cash status              │
├────────────────────────────────────────────────────────────┤
│ OrderJourneyRail: placed → preparing → ready → assigned... │
├────────────────────────────┬───────────────────────────────┤
│ Tracking / map panel       │ Rider + ETA + support         │
│ Shows fallback if no map   │ Receipt + reorder             │
└────────────────────────────┴───────────────────────────────┘
```

Confirmation states:

- Confirmed, kitchen not started
- Preparing
- Ready but unassigned
- Rider assigned
- Picked up
- Nearby
- Delivered
- Delayed
- Cancelled/refunded
- Tracking unavailable
- Provider/map unavailable
- Stale location

### Confirmation animation ideas

- Success checkmark: quick 400–600ms once, then stop.
- OrderJourneyRail: current step pulses gently only when status changes.
- Map skeleton: blurred grid/surface while provider loads.
- Rider card: slide/fade in only after assignment.
- ETA updates: crossfade number, do not roll continuously.
- Receipt: no animation except expand/collapse.

### Customer illustration ideas

Use illustrations more freely than admin:

- Empty cart: pizza box sketch.
- Menu loading: pizza-card skeletons.
- Address outside radius: map pin with soft boundary ring.
- Tracking unavailable: rider holding phone / kitchen counter.
- Forecast/AI unavailable: little chef notebook or oven timer.
- Confirmation: small celebratory pizza/receipt icon, not confetti everywhere.

## Skeleton Loader System

Create reusable skeletons instead of per-screen ad hoc loading:

- `MenuCardSkeleton`
- `RecommendationSkeleton`
- `CustomizeModalSkeleton`
- `CartInsightSkeleton`
- `CheckoutSummarySkeleton`
- `PaymentMethodSkeleton`
- `ConfirmationHeroSkeleton`
- `TrackingTimelineSkeleton`
- `MapPanelSkeleton`
- `AdminMetricSkeleton`
- `OrderTableSkeleton`
- `ForecastChartSkeleton`
- `AiServiceCardSkeleton`

Rules:

- Skeletons should match final layout dimensions to avoid layout shift.
- Use warm neutral shimmer for customer surfaces.
- Use quieter grayscale pulse for admin surfaces.
- Honor reduced motion by removing shimmer movement and using static placeholder tones.

## Token Direction

Proposed token vocabulary:

```css
--dough:        #fff7ed;
--mozzarella:  #fff2c7;
--tomato:      #d63d32;
--tomato-ink:  #8f1f18;
--basil:       #2f8f5b;
--oven-amber:  #d9822b;
--map-blue:    #276ef1;
--charcoal:    #171717;
--steel:       #737373;
--paper:       #fffdf8;
--glass:       rgba(255, 255, 255, 0.72);
```

Component primitives to design first:

- `Button`
- `Card`
- `MetricCard`
- `StatusDot`
- `StatusPill`
- `Skeleton`
- `OrderJourneyRail`
- `DeliveryFeeBreakdown`
- `ForecastRunStatus`
- `AdminDrawer`
- `CheckoutSummary`
- `EmptyState`
- `IllustrationFrame`

## Design Decisions To Make Before Coding

1. Admin visual mode:
   - A. Apple-like light glass cockpit
   - B. Linear-like dark dense cockpit
   - C. Hybrid: light admin with dark dispatch/map overlays

   Recommendation: A for admin overview/settings, C for dispatch/map drawer.

2. Checkout style:
   - A. Stripe-like focused payment sheet
   - B. Shopify-like sectioned checkout
   - C. Food-ordering style with strong cart rail

   Recommendation: B + C. Use Shopify-style zones with a food-ordering cart rail.

3. Motion library:
   - A. CSS-only first
   - B. Add a small motion library for drawer/timeline/cart

   Recommendation: CSS-only first; reassess after component extraction.

4. Illustration strategy:
   - A. SVG/code illustrations
   - B. Generated raster illustrations
   - C. Mixed system

   Recommendation: C. Use SVG/code for simple empty states and generated raster only for warm customer hero/confirmation art.

5. Admin dashboard first screen:
   - A. KPI analytics
   - B. Exception cockpit
   - C. Dispatch map

   Recommendation: B. The admin should first answer: what needs attention now?

## Suggested First Implementation Slice

Before a full redesign, build one small slice that proves the design language:

1. Create UI tokens and skeleton primitive.
2. Add `ForecastChartSkeleton` and `Refresh forecast` visual states.
3. Redesign Admin Forecast as the Apple-like pilot panel.
4. Redesign Payment summary as the checkout pilot panel.
5. Capture screenshots and compare against `FullStack/wiki/ui-map.md`.

Why this slice:

- Forecast has existing Random Forest metadata and a clear missing refresh action.
- Payment has clear business rules and visible trust impact.
- Both surfaces test skeletons, status, typography, cards, and motion without touching live tracking schema first.

## Current Recommendation

Choose this visual direction for the next design review:

- Customer: warm food-first interface with premium checkout clarity.
- Admin: Apple-like light glass cockpit with quiet surfaces, precise typography, and exception-first hierarchy.
- Checkout: Shopify-style section zones plus a food-ordering sticky summary.
- Confirmation: living receipt with real lifecycle state first and map second.
- Motion: CSS-only for the first slice, with reduced-motion support from the beginning.
- Illustrations: SVG/code empty states first; generated raster art only for customer hero/confirmation moments if needed.

## Research Addendum: Admin And Post-Order Patterns

The dedicated admin research pass sharpened the direction into:

> Apple-like delivery operations cockpit.

This means the admin dashboard should not feel like a colorful POS. It should feel like a calm command center where exceptions, rider assignment, stale ETAs, forecast freshness, and AI health are immediately visible.

Recommended admin structure:

```text
AdminShell
├─ Left rail
├─ Top command bar
│  ├─ outlet status
│  ├─ service pressure
│  ├─ forecast freshness
│  └─ AI health
├─ Main grid
│  ├─ delivery health strip
│  ├─ exception queue
│  ├─ live orders / dispatch table
│  ├─ forecast card
│  └─ AI insight card
└─ Right context drawer
   ├─ selected order
   ├─ customer note
   ├─ rider assignment
   ├─ delivery quote
   └─ timeline
```

The important interaction pattern is the right context drawer. Orders should stay in place while the selected order opens into a detailed assignment/timeline panel. This borrows the usefulness of Stripe-style focused workflows and Shopify resource-detail patterns without cloning either.

The checkout and confirmation research sharpened the customer post-order direction:

- Treat checkout as the final trust checkpoint, not only a payment screen.
- Repeat delivery quote clarity across Customer Details, Cart, and Payment.
- Treat `/confirmation` as both the immediate thank-you page and the revisitable order-status page.
- Show lifecycle state first and map second.
- Never fake rider motion. If GPS/provider data is missing, show a truthful timeline and `last updated` state.

Recommended confirmation structure:

```text
ConfirmationPage
├─ Hero receipt: order confirmed, order ID, payment mode, ETA
├─ OrderJourneyRail: received, preparing, ready, rider assigned, delivered
├─ Tracking panel: map when real data exists, timeline fallback otherwise
├─ Rider card: assignment, masked contact, support action
└─ Receipt, reorder, help
```

Additional first-slice recommendation:

1. Build token bridge plus `Skeleton`, `Card`, `Button`, `StatusPill`, and `AdminDrawer`.
2. Prototype Admin Orders context drawer.
3. Prototype checkout fee/ETA transparency.
4. Prototype confirmation `OrderJourneyRail` with honest no-map fallback.
5. Add Forecast refresh visual states after the skeleton primitive exists.

## Open Questions

- Should the admin dashboard default to light mode only, or support dark mode from the start?
- Should the dispatch board be a separate admin tab or a mode inside Orders?
- Should confirmation use a large map region immediately, or keep map secondary until real provider data exists?
- Should generated illustrations be committed as assets, or should the first pass use SVG/code-only illustrations?
- Which two reference products do we want as north stars: Apple + Stripe, or Apple + Linear, or Apple + Shopify?
