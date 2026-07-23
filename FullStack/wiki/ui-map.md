---
title: SliceMatic UI Map
type: ui-baseline
status: maintained
scope: FullStack/
last_verified: 2026-07-23
---

# SliceMatic UI Map

This page is the durable visual/context map for the current SliceMatic FullStack UI. Update it whenever a screen layout, route, tab, or major workflow changes.

The active implementation plan that consumes this baseline is `FullStack/plans/ui-revamp-implementation-plan.md`.

## Screenshot Assets

Screenshots are stored in `FullStack/wiki/assets/ui-map/`. Canonical table below still points at the 2026-07-16 Chrome baseline filenames (keep stable when replacing).

**2026-07-23 smoke note:** FE polish landed (checkout pill spacing, admin Forecast/Menu/Settings/AI consistency, app-wide `data-theme` dark mode, root `loading`/`error`). Admin Overview craft rebuild landed (revenue hero / tomato-only / briefing workbench) — re-capture `admin-overview.png` when a live browser session is available. Also recommended: payment checkout, admin forecast, admin AI, admin menu. Prefer the table names as SOT.

**2026-07-23 customer polish pass:** MenuCatalog house-pick featured sort + loading skeletons during `/api/menu`; CustomerFlowTabs numbered stepper with Guest/Your details; AppHeader guest **Sign in** chip + focus rings. Re-capture `walkthrough_04_customer_menu.png` when convenient.

**2026-07-23 screenshot cleanup:** Removed stale Landing R1 pre-rebuild walkthrough PNGs, misnamed `walkthrough_07_*` payment duplicates, and orphaned historical duplicates (zero doc references). Landing rows below are pending re-capture (no dangling image paths).

### 2026-07-23 walkthrough

Full live pass (guest + `demo@slicematic.in` OTP `1111`). New files use `walkthrough_*` names; canonical table below stays historical.

| Surface | Screenshot | Status |
|---|---|---|
| `/` MarketingLanding hero (Landing R1: Delhi night scene + rider) | _(pending re-capture)_ | old PNGs removed — hero is cinematic SVG Delhi scene + scooter rider, no photos |
| `/` landing below-fold (Order/Kitchen/Ride/Doorstep + Signature slices) | _(pending re-capture)_ | old PNGs removed — narrative slides + illustrated pizza discs |
| `/signin` EntryPortal email | ![Sign in](assets/ui-map/walkthrough_02_signin.png) | ok |
| `/signin` OTP | ![OTP](assets/ui-map/walkthrough_02b_signin_otp.png) | ok |
| `/signin` finish profile (demo first-time) | ![Profile](assets/ui-map/walkthrough_02c_signin_profile.png) | ok |
| Customer hero + Customer Details + sidebars | ![Hero details](assets/ui-map/walkthrough_03_customer_hero_details.png) | ok |
| Customer Menu / Signature pizzas | ![Menu](assets/ui-map/walkthrough_04_customer_menu.png) | ok |
| Customer Recommendations | ![Recs](assets/ui-map/walkthrough_05_customer_recommendations.png) | ok |
| Customer Details filled | ![Details](assets/ui-map/walkthrough_06_customer_details_filled.png) | ok |
| `/payment` checkout | ![Payment](assets/ui-map/walkthrough_08_payment_checkout.png) | ok |
| Admin Overview | ![Overview](assets/ui-map/walkthrough_09_admin_overview.png) | ok — ops briefing degraded without LLM key |
| Admin Orders + OrderContextPanel | ![Orders](assets/ui-map/walkthrough_10_admin_orders.png) | ok |
| Admin Forecast | ![Forecast](assets/ui-map/walkthrough_11_admin_forecast.png) | ok |
| Admin Menu → Create item | ![Create](assets/ui-map/walkthrough_12_admin_menu_create.png) | ok |
| Admin Menu → Create toppings segment | ![Create toppings](assets/ui-map/walkthrough_12b_admin_menu_create_toppings.png) | ok |
| Admin Menu → Pizza / Base / Toppings lists | ![Pizzas](assets/ui-map/walkthrough_13_admin_menu_pizzas.png) ![Bases](assets/ui-map/walkthrough_14_admin_menu_bases.png) ![Toppings](assets/ui-map/walkthrough_15_admin_menu_toppings.png) | ok (13/14 may duplicate bases from race) |
| Admin AI | ![AI](assets/ui-map/walkthrough_16_admin_ai.png) | ok — ops briefing degraded |
| Admin Settings Brand / Financials / Delivery | ![Brand](assets/ui-map/walkthrough_17_admin_settings_brand.png) ![Financials](assets/ui-map/walkthrough_18_admin_settings_financials.png) ![Delivery](assets/ui-map/walkthrough_19_admin_settings_delivery.png) | ok |
| Account workspace (quick actions) | ![Account](assets/ui-map/walkthrough_20_account_panel.png) | ok — order history empty / no customer_id |
| Admin View as Customer | ![View customer](assets/ui-map/walkthrough_21_admin_view_as_customer.png) | ok |

| Surface | Screenshot |
|---|---|
| Confirmation tracking after cash test | ![Confirmation tracking after cash test](assets/ui-map/07_confirmation_tracking_1784320972813.png) |
| Customer entry portal | ![Customer entry portal](assets/ui-map/01_entry_portal_1784320812395.png) |
| Customer menu | ![Customer menu](assets/ui-map/02_customer_menu_1784320855737.png) |
| Customer account | ![Customer account](assets/ui-map/03_customer_account_1784320903679.png) |
| Customer cart with item | ![Customer cart with item](assets/ui-map/04_customer_cart_with_item_1784320922924.png) |
| Customer customize modal | ![Customer customize modal](assets/ui-map/05_pizza_builder_modal_1784320933804.png) |
| Payment checkout | ![Payment checkout](assets/ui-map/06_payment_checkout_1784320947399.png) |
| Admin overview | ![Admin overview](assets/ui-map/08_admin_overview_1784320985267.png) |
| Admin orders | ![Admin orders](assets/ui-map/admin-orders.png) |
| Admin menu | ![Admin menu](assets/ui-map/admin-menu.png) |
| Admin forecast | ![Admin forecast](assets/ui-map/admin-forecast.png) |
| Admin settings | ![Admin settings](assets/ui-map/admin-settings.png) |
| Admin AI | ![Admin AI](assets/ui-map/admin-ai.png) |

## Route and Workspace Map

| Route or workspace | Current role | Existing UI | Next build direction |
|---|---|---|---|
| `/` landing | Marketing when logged out; CustomerShell when logged in | **Landing R1 (creative):** brand-first full-bleed hero over a cinematic SVG Delhi night scene with a GSAP MotionPath scooter rider; Lenis smooth scroll synced to ScrollTrigger; Order/Kitchen/Ride/Doorstep narrative panels with committed Lottie (pizza spin, oven steam); illustrated Signature slices; Sign in / guest CTAs → `/signin`. No photos/screenshots. Reduced-motion disables Lenis/GSAP/Lottie. | Optional R2: Rive/Spline hero object after LCP budget; trust section. |
| `/signin` | Sole auth UI | EntryPortal email → OTP | Keep EntryPortal as only login form. |
| Customer app / Menu | Primary browsing and cart-building surface | Signature pizzas with house-pick featured cards first, search + filters, customize/add, menu skeletons while `/api/menu` loads | Add voice menu assistant here so menu questions use live menu data and can build a cart action. |
| Customer app / Customize modal | Pizza builder overlay | Pizza image, crust choices, size choices, toppings, quantity, computed line total, add-to-cart action | Keep as the target for voice-assisted customization and recommendation build-combo flows. |
| Customer app / Recommendation | Customer-facing recommendations | Intro + ranked pick cards with honest why-text/`reason`, confidence tags, refresh, Build combo CTAs; empty/unavailable honesty | Keep as the recommendation service consumer. Move logic behind a recommendation microservice contract later. Screenshot refresh deferred. |
| Customer app / Customer Details | Delivery profile capture | Name, phone, delivery radius, address, delivery note | Add geocoding, distance validation, serviceability, and delivery fee preview here. |
| Customer cart rail | Always-visible commercial summary | Lines, subtotal, discount, GST, delivery, total, AI cart strategist | Feed dynamic distance/rider fees here before payment. |
| `/payment` | Final pre-order review and payment | Basket review, payment mode cards, payment policy, place/pay button | Show final delivery ETA, distance, fee, and rider-fee logic before order creation. |
| `/confirmation` | Post-order tracking | Static stylized map, hardcoded rider, hardcoded ETA, five-step timeline, final bill | Replace with real provider map, rider assignment, live status events, ETA, and proof/contact actions. |
| `/admin-dashboard` / Overview | Operator command center | KPI strip, revenue/order/AOV, charts, AI shift briefing | Add delivery health strip: active riders, delayed orders, unassigned orders, average ETA, route pressure. |
| Admin / Orders | Live ledger | Filters, pagination, payment/status/final-total rows | Add delivery columns/actions: rider, ETA, delivery status, assign/reassign, open map, update status. |
| Admin / Forecast | Demand intelligence | RandomForestRegressor chart and model metadata | Add Refresh Forecast button wired to `/api/admin/forecast/refresh` with loading/success/error states. |
| Admin / Menu | Menu operations | Create item, edit pizzas/bases/toppings, upload image, AI copy polish | Keep as menu source for voice/recommendation. Later add prep-time quality fields if ETA needs them. |
| Admin / AI | AI documentation | Recommendation prompt and API contract documentation | Convert into AI services console: recommendation, voice, forecast service status and test harnesses. |
| Admin / Settings / Brand | Customer-visible brand copy | Brand, outlet, open status, delivery promise, hero copy | Keep delivery promise copy here, but not operational delivery rules. |
| Admin / Settings / Financials | Pricing policy | GST, discount, max qty, delivery fee, free delivery threshold | Keep base delivery fee/free-delivery thresholds here. |
| Admin / Settings / Delivery & risk | Delivery policy | Active delivery radius and guest-cash toggle | Expand into provider choice, rider-fee formula, service radius, batching rules, ETA buffers, and GPS privacy settings. |

## Verified UI Facts

- Demo login with `demo@slicematic.in` and OTP `1111` reaches `/admin-dashboard`.
- A cash test order successfully reaches `/confirmation` without external payment redirects.
- Admin Orders showed the new cash test order and increased from 207 to 208 fetched orders during this UI pass.
- Forecast UI exposes RandomForestRegressor metadata, peaks, Refresh button (`/api/admin/forecast/refresh`), and honest S5 deferral copy for run-history states.
- AI tab is a grounded service cockpit (`AiServiceCard` for recommend / menu copy / ops briefing) with collapsible system prompt — not a live voice console (S4).
- Customer Recommendation is interactive and already has a refresh action for three grounded picks.
- AI Cart Strategist is interactive from the cart rail and needs to remain visible when the cart has line items.
- Customize opens a modal/overlay for crust, size, toppings, quantity, and add-to-cart.
- Confirmation tracking is honesty-gated (2026-07-23 ui-ux-pro-max audit): no fabricated “searching rider / live ETA”; hero discloses recorded-status-only; journey rail + `DeliveryMapFallback` show unassigned/unavailable until verified delivery data exists. Live map/rider still not implemented (S0+).
- Customer checkout moved to `/payment`; the in-shell Checkout tab is an honest empty-cart bridge (`CheckoutEmptyPanel`: “Add a pizza first”) when the cart has no items, and routes to `/payment` when it does.

## Product Placement Rules

- Delivery fee calculation starts at customer details and cart, must be confirmed on `/payment`, and must be persisted on the order.
- Live delivery tracking starts on `/confirmation`, not on the menu or payment page.
- Dispatch operations belong to Admin Orders first, then Admin Overview as aggregate health.
- Provider/API configuration belongs in Admin Settings / Delivery & risk.
- Voice menu assistant belongs in the customer Menu/Recommendation area; admin AI tab should be the test/monitoring console.
- Forecast refresh belongs in Admin Forecast, while service deployment health belongs in Admin AI.

## Update Rule

When UI changes materially:

1. Re-capture the affected screenshot in `FullStack/wiki/assets/ui-map/` using the same filename when replacing a baseline.
2. Update the relevant row in this page.
3. Append an entry to [[log]].
4. Refresh [[handoff]] if the change affects next actions.
