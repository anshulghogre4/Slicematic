---
title: SliceMatic UI Map
type: ui-baseline
status: maintained
scope: FullStack/
last_verified: 2026-07-16
---

# SliceMatic UI Map

This page is the durable visual/context map for the current SliceMatic FullStack UI. Update it whenever a screen layout, route, tab, or major workflow changes.

The active implementation plan that consumes this baseline is `FullStack/plans/ui-revamp-implementation-plan.md`.

## Screenshot Assets

Screenshots are stored in `FullStack/wiki/assets/ui-map/` and were captured from the live Chrome extension session on 2026-07-16 after logging in with the demo identity and placing one cash test order. Keep filenames stable when replacing a baseline.

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
| Admin orders | ![Admin orders](assets/ui-map/09_admin_orders_1784321001313.png) |
| Admin menu | ![Admin menu](assets/ui-map/10_admin_menu_1784321014140.png) |
| Admin forecast | ![Admin forecast](assets/ui-map/11_admin_forecast_1784321026314.png) |
| Admin settings | ![Admin settings](assets/ui-map/12_admin_settings_1784321037644.png) |
| Admin AI | ![Admin AI](assets/ui-map/13_admin_ai_1784321048823.png) |

## Route and Workspace Map

| Route or workspace | Current role | Existing UI | Next build direction |
|---|---|---|---|
| `/` portal | Entry and identity gate | Email OTP, guest entry, demo auth path | Keep lightweight; use for login only unless adding a preview-only menu assistant. |
| Customer app / Menu | Primary browsing and cart-building surface | Pizza catalogue, tag filters, customize/add actions, cart rail | Add voice menu assistant here so menu questions use live menu data and can build a cart action. |
| Customer app / Customize modal | Pizza builder overlay | Pizza image, crust choices, size choices, toppings, quantity, computed line total, add-to-cart action | Keep as the target for voice-assisted customization and recommendation build-combo flows. |
| Customer app / Recommendation | Customer-facing AI recommendations | Three grounded picks, confidence, refresh, build-combo actions | Keep as the recommendation service consumer. Move logic behind a recommendation microservice contract later. |
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
- Forecast UI already exposes RandomForestRegressor metadata, features, RMSE, trained time, and peak-hour predictions.
- Forecast UI does not yet expose a manual refresh button.
- AI tab is currently documentation for the recommendation engine, not an interactive AI operations console.
- Customer Recommendation is interactive and already has a refresh action for three grounded picks.
- AI Cart Strategist is interactive from the cart rail and needs to remain visible when the cart has line items.
- Customize opens a modal/overlay for crust, size, toppings, quantity, and add-to-cart.
- Confirmation tracking is visually present but simulated: rider name, ETA, map, and timeline are static client UI.
- Customer checkout moved to `/payment`; the in-shell Checkout tab is mainly a guard/bridge when cart is empty.

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
