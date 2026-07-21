---
title: FullStack Delivery Intelligence Sprint Plan
status: ready-for-refinement
owner: SliceMatic FullStack team
created: 2026-07-16
cadence: 2-week sprints
scope: preferences, activity, dispatch, rider fees, ETA, live tracking, forecasting, voice, AI microservices
---

# FullStack Delivery Intelligence Sprint Plan

## Revamp Branch Execution Overlay

The `new-revamp-1` branch starts with a harmless frontend foundation overlay before delivery schema or tracking implementation:

1. **R1 — Checkout/session foundation:** centralize storage keys and checkout payment-recovery helpers, wire `/payment`, add focused tests.
2. **R2 — Checkout component extraction:** extract checkout summary/payment trust panel without changing pricing/business rules.
3. **R3 — UI primitive bridge:** introduce semantic tokens, skeletons, status pills, and reusable primitives before broad page rewrites.

Delivery Sprint 0 and Delivery Sprint 1 below remain valid, but live delivery tracking, rider state, and DB/RLS changes should wait until this frontend foundation is stable and reviewed.

### Sprint control file decision

As of 2026-07-16, this file is the operational sprint source of truth for the `new-revamp-1` frontend revamp branch and the later delivery-intelligence roadmap.

The UI revamp, architecture, inspiration, UI/UX, and database schema plans remain supporting references. Pull durable facts from those files into this sprint file only when priorities change or a sprint gate is satisfied.

Use the other plan files as supporting references:

- `plans/frontend-architecture-restructure.md` supplies architecture rules and target folder boundaries.
- `plans/ui-revamp-implementation-plan.md` supplies screen-by-screen UI direction.
- `plans/ui-inspiration-research.md` supplies visual references and product feel.
- `plans/ui-ux-improvement-plan.md` supplies tactical polish ideas.
- `plans/database-schema-evolution-plan.md` supplies gated DB/RLS design, not immediate implementation.

Do not split the active sprint queue across those files. When priorities change, update this section first and then only update reference docs if a durable fact changes.

### Revamp R8-R12 frontend-first execution plan

These sprints continue the current harmless frontend decomposition before any SQL, RLS, rider tracking, map provider, or live dispatch implementation.

| Revamp sprint | Status | Owner boundary | Main deliverable | Acceptance |
|---|---|---|---|---|
| R8 - Cart rail and recommendation lane extraction | Done | Customer ordering frontend | Extract cart presentation, cart line item rendering, recommendation cards/lane, and AI cart strategist presentation from both giant workspaces | Completed 2026-07-16. Both giant workspaces now compose shared cart/recommendation components; pricing, cart mutation, API calls, router navigation, toasts, and Zustand ownership remain in the parents; cart-line missing-item helpers are tested |
| R9 - Customer ordering shell cleanup | Closed for extracted scope | Customer ordering frontend | Extract the customer ordering step layout, intake/recommend/menu shell, step navigation, and mobile cart placement into feature components | `CustomerFlowTabs` and `CustomerIntakeForm` are extracted and shared. Larger shell/mobile-cart composition remains a future optional slice, but duplicated intake/tab JSX is cleaned |
| R10 - Admin command shell and table workspace | Closed for extracted scope | Admin dashboard frontend | Extract admin top command bar, side/tab navigation, order table workspace, and selected-order drawer wrapper | `AdminTabNav`, `AdminOrdersWorkspace`, shared `OrderTable`, `AdminMenuWorkspace`, and `AdminSettingsWorkspace` now drive both admin workspaces. Future optional slice is command-bar extraction |
| R11 - Loading, empty, error, and mobile polish pass | Done | Shared UI quality | Add consistent skeletons and empty/error states for menu, recommendations, cart insight, order table, forecast, AI panel, and confirmation; tighten responsive behavior | Recommendation lane, AI cart strategist, admin order rows, and empty states now use the skeleton/state pattern. Route boundaries (loading.tsx/error.tsx) still pending. |
| R12 - Frontend Visual Polish & Micro-interactions | Planned | Shared UI quality | Apply final Apple-like glassmorphic polish and micro-interactions across key components | Fix Margherita badge alignment, improve checkout layout spacing around "Online verification required", enhance customizer stepper styling (minus button), add order status icons/subtle progress bars to confirmation tracking, and confirm Admin interactive charts. |

### R8 implementation notes

R8 should be the next build sprint because R7A already extracted `MenuCatalog` and `PizzaBuilderDialog`, while cart, recommendation, and AI strategist presentation remain embedded beside them in both large files.

Safe component boundaries:

- `CartRail`: receives cart lines, totals, customer/order mode labels, and callbacks; renders empty cart, line items, bill summary, AI card slot, and checkout button state.
- `CartLineItem`: receives one cart line and callback props; no direct store mutation.
- `RecommendationLane`: receives current recommendation(s), loading/error state, refresh/build/browse callbacks, and menu-safe item labels.
- `AiCartStrategistCard`: receives insight, loading/error state, and ask/apply/dismiss callbacks; no direct AI fetch.

Keep in parent/orchestrator for now:

- `calculateBill`, pricing config, and max-order validation.
- `setCart`, `setRecommendation`, `setRecommendations`, and Zustand calls.
- `/api/recommend` and `/api/ai/cart-insight` fetches.
- `router.push("/payment")`.
- Toasts and customer/session validation.

R8 edge cases to include:

- Empty cart with disabled checkout and a clear return-to-menu path.
- Max quantity reached before accepting direct add, builder add, recommendation add, or AI strategist add.
- Recommended pizza/topping unavailable or missing from the current menu.
- Recommendation API unavailable, returning invalid IDs, returning one item, or returning multiple items.
- AI strategist loading, failure, no actionable suggestion, duplicate suggestion already in cart, or suggestion exceeding max quantity.
- Guest versus logged-in copy differences remain intact.
- Mobile cart remains reachable after menu extraction; checkout CTA must not be hidden below long recommendation content.
- Keyboard focus order remains menu/recommendation -> cart -> checkout, with no modal focus leak from the builder.

### Gates before DB/RLS and delivery implementation

The database/RLS work in `plans/database-schema-evolution-plan.md` is still required before production delivery tracking, but it should not start as live feature work until these frontend gates are done:

1. Customer ordering presentation is extracted into `CustomerShell.tsx` and feature components. (Completed)
2. Admin orders presentation is extracted enough that delivery placeholders can be replaced by real state without rewriting the whole dashboard.
3. Checkout/confirmation display contracts are explicit: client totals are display-only, server order/quote data will become authoritative.
4. UI fallbacks exist for no map, no rider, no ETA, stale location, provider failure, and unassigned-ready orders.
5. The app has route/loading/error boundaries or component-level equivalents for every async surface being touched.

After those gates, begin DB/RLS work in this order: auth ownership and role hardening, activity/preference capture, delivery quote and immutable fee rules, lifecycle events, then rider assignment/tracking.

## Outcome

Turn SliceMatic's current “order saved → static confirmation” experience into a secure post-order delivery system that:

- Learns from explicit customer preferences and privacy-safe activity signals.
- Quotes and persists a deterministic customer delivery fee and rider payout.
- Separates kitchen progress from delivery progress.
- Supports rider assignment and a minimal rider web/PWA workflow.
- Gives customers an honest timeline, ETA window, and live map when GPS is available.
- Falls back gracefully when maps, realtime, GPS, or provider credentials are unavailable.
- Refreshes the existing Random Forest demand forecast from current order history.
- Provides a grounded dashboard voice assistant that answers questions about the live menu.
- Decomposes the current large UI and AI code into bounded modules before extracting independently deployable AI services.

## Existing forecasting baseline — preserve, then productionize

The forecast is not greenfield. The repository already implements:

- `scripts/forecast_model.py`: scikit-learn `RandomForestRegressor`, 100 estimators, fixed random seed.
- Features: IST `weekday` and `hour`; target: orders per hourly bucket.
- Store-hour forecast: 11:00–22:00 for the next seven days.
- Evaluation: 22% hold-out RMSE when at least 20 hourly buckets exist.
- `lib/forecast-service.ts`: reads/writes `lib/generated/forecast-cache.json` and spawns Python locally.
- `POST /api/admin/forecast/refresh`: loads every `orders.order_datetime` value from `slicematic.orders` and retrains.
- `ForecastPanel`: renders forecast, top three peaks, model metadata, RMSE, training time, order count, and bucket count.

The dashboard still needs a Refresh Forecast button. More importantly, the final deployment must not depend on a Next.js serverless function spawning Python and writing its local filesystem.

Schema note: `daily_sales_fact` already has `forecast_orders` and `forecast_confidence`, but it is not a sufficient model-run store. Preserve it for daily aggregates; add run-level forecast tables so model metadata, hourly predictions, versions, and failures are auditable.

## Target service architecture

Use a strangler migration, not a big-bang rewrite:

```text
Browser
  ↓
Next.js web + BFF route handlers
  ├── core domain modules → Supabase/PostgreSQL
  ├── recommendation/voice client → AI Service (TypeScript)
  └── forecast client → Forecast Service (Python/FastAPI)

Shared contracts
  ├── OpenAPI/JSON Schema
  ├── generated TypeScript types
  └── request IDs, auth context, timeouts, errors, health/version endpoints
```

Boundaries:

- Web/BFF: authentication, authorization, browser-safe payloads, UI orchestration, graceful fallback.
- Core order/menu/customer domain: Next.js-compatible TypeScript modules initially; not an AI service.
- AI Service: recommendations, menu question answering/voice-agent text reasoning, cart insight, menu copy, operations briefing.
- Forecast Service: Python model training/inference only; it never receives browser credentials or service-role keys.
- Data ownership: PostgreSQL remains authoritative. Prefer internal service calls with a narrow payload over giving every microservice unrestricted database access.

Repository target after modular extraction:

```text
FullStack/
  app/                         # pages and thin BFF route handlers
  features/
    customer-ordering/
    admin-dashboard/
    delivery-tracking/
    menu-assistant/
  server/
    auth/
    menu/
    orders/
    customers/
    delivery/
    clients/ai-service.ts
    clients/forecast-service.ts
  components/
    customer/
    admin/
    shared/
  contracts/                   # schemas/types until extracted to workspace package
services/
  ai-service/                  # TypeScript HTTP service
  forecast-service/            # Python FastAPI + scikit-learn
packages/
  contracts/                   # versioned API schemas/generated types
```

Route handlers remain public BFF endpoints. They must authenticate and validate requests before calling internal services; Next.js documents route handlers as publicly reachable endpoints, not a complete backend replacement.

## Dashboard menu voice agent

Primary use case: an admin/dashboard user asks “What pizzas are available?”, “Which vegetarian pizzas are under ₹350?”, “What toppings do we have?”, or “Which item is unavailable?” and receives a grounded answer from the current menu.

Pipeline:

```text
Push-to-talk or typed question
  → speech-to-text adapter (when supported)
  → POST /api/ai/menu-assistant (BFF)
  → load current menu server-side
  → deterministic intent/filter first
  → AI Service for natural-language synthesis only when useful
  → validated response with matching menu IDs and source timestamp
  → text response + optional browser speech synthesis
```

Rules:

- Never let the LLM invent names, prices, availability, ingredients, or IDs.
- Ground every response in a compact server-generated menu snapshot.
- Deterministic code answers inventory/filter/count questions; the LLM explains and compares.
- Return `answer`, `matchedItems`, `source`, `menuVersion/readAt`, and `suggestedQuestions`.
- Typed input is mandatory. Browser `SpeechRecognition` is progressive enhancement because support is limited and some browsers use a server-based recognition engine.
- Use push-to-talk, visible listening state, cancel, transcript confirmation, permission/error states, and no background listening.
- Browser `SpeechSynthesis` can read answers aloud, with mute/stop controls.
- Do not store raw audio by default. Store sanitized intent/outcome telemetry only after consent.
- Initial languages: Indian English (`en-IN`); add Hindi only after testing menu-name transcription and response quality.

## Product benchmark and architecture decision

Leading delivery products expose a lifecycle rather than only a map: preparation, rider assignment, pickup, arrival, completion, support, and stale/offline handling. DoorDash's published delivery webhooks include lifecycle events, ETA, dasher location, fees, proof of delivery, and an externally shareable tracking URL. Swiggy describes tracking as a core stage of the order journey, and Zomato has publicly discussed real-time GPS status across logistics fleets.

Decision for this project:

- India MVP maps/routing: Google Maps JavaScript API + server-side Routes API, operated inside the eligible India free caps.
- Cost controls: configure hard quotas and billing alerts before any production key is enabled.
- Realtime: private Supabase Broadcast channel per active delivery.
- Initial reliability fallback: authenticated snapshot endpoint and 20–30 second polling.
- Optimization: use Google OR-Tools in our service layer; do not pay a map provider merely to sequence a small delivery batch.
- Provider abstraction: `MapProvider`/`GeocodingProvider`/`RoutingProvider` interfaces so Mapbox and Mappls can be accuracy-tested before production lock-in.
- Scale path: if managed route/matrix calls become a material cost, move high-volume routing to OSRM while retaining Google or Mappls for address validation and traffic-sensitive fallback.
- Rider client: foreground web/PWA tracking for the demo; do not promise dependable background tracking until a native rider app or delivery-as-a-service provider exists.
- State authority: PostgreSQL transaction/RPC first, broadcast second. Realtime messages never become the system of record.

### Chosen low-cost implementation path

1. Render the admin/customer map with Google Maps during the MVP and keep its browser key referrer-restricted.
2. Send rider GPS pings through SliceMatic's private realtime channel; moving a marker must not call Routes, Geocoding, or Places.
3. Recompute a route only on assignment, explicit refresh, material off-route deviation, or a bounded ETA refresh interval.
4. Cache outlet coordinates, customer-selected coordinates, route polylines, and quote results only where provider terms permit it; never geocode the same saved address on every page load.
5. Use OR-Tools for batch ordering and persist the stop sequence and versioned fee quote.
6. Set per-key quotas, server-side rate limits, usage telemetry, and billing alerts. A free tier is a ceiling to protect, not an availability guarantee.
7. Keep Mappls as the India-specific accuracy/cost challenger and Mapbox as the managed customization/cost challenger in the Sprint 0 bake-off.
8. Re-evaluate OSRM/MapLibre once observed volume, ETA error, and operations cost are available; do not self-host the entire India stack prematurely.

## Map, geocoding, and routing API options

Pricing and quotas below were verified from provider pages on 2026-07-16. Providers can change them; re-check before enabling production billing.

### What the application actually needs

Do not choose a provider based only on a free map widget. Delivery requires separate capabilities:

1. Map display: tiles/basemap and moving rider marker.
2. Address autocomplete/geocoding: customer address → latitude/longitude.
3. Routing: outlet/rider → customer route, distance, polyline, duration.
4. Traffic-aware ETA: optional for MVP but valuable in production.
5. Realtime transport: supplied by Supabase, not the map provider.
6. GPS capture: supplied by the rider browser/app, not the map provider.

### Option A — Google Maps Platform India

Best fit: strongest provisional production choice for Delhi/India address quality and traffic-aware ETA.

Current eligible India free monthly caps:

- Compute Routes Essentials: 70,000 requests/month; then listed at $1.50 per 1,000 up to 5M.
- Compute Route Matrix Essentials: 70,000/month; then $1.50 per 1,000.
- Geocoding: 70,000/month; then $1.50 per 1,000.
- Autocomplete Requests: 70,000/month; then $0.85 per 1,000.
- Pro/Enterprise features have lower free caps.

Conditions/cautions:

- Requires a Google Cloud billing account even when usage remains inside free caps.
- India pricing requires eligible billing and primary usage in India.
- Set API restrictions, quotas, and budget alerts; free caps are per SKU, not one combined pool.
- Use server-only Routes/Geocoding keys where possible and a browser key restricted by referrer for map display.
- TWO_WHEELER routing exists but is beta/higher tier and requires a user warning; validate against real Delhi routes.
- Google content has storage/display restrictions; store stable place IDs and review geocoding terms before persisting provider results.

Official references:

- https://developers.google.com/maps/billing-and-pricing/pricing-india
- https://developers.google.com/maps/billing-and-pricing/india
- https://developers.google.com/maps/documentation/routes/route_two_wheel

Verdict: recommended production candidate and potentially free for this project's early India usage, but not “no billing account.”

### Option B — TomTom Developer APIs

Best fit: best no-credit-card developer trial with traffic and a cohesive map/search/routing stack.

Current free monthly requests per API:

- Vector tiles: 200,000/month.
- Raster tiles: 200,000/month.
- Routing: 20,000/month.
- Geocoding: 20,000/month.
- Reverse geocoding: 20,000/month.
- Search Suggest: 10,000/month.
- Traffic incident details: 2,500/month; traffic tile products list 200,000/month.

Conditions/cautions:

- No credit card is required to start.
- Quotas are per API and should be protected with usage alerts/rate limiting.
- Prefer APIs marked TomTom Orbis Maps for new integrations; TomTom identifies older map-format products as legacy/deprecating.
- Delhi address/last-mile and two-wheeler route accuracy still needs the Sprint 0 bake-off.

Official reference: https://docs.tomtom.com/pricing

Verdict: recommended free developer/demo alternative and the first option to try if avoiding billing-card setup matters most.

### Option C — Geoapify

Best fit: simplest no-card all-in-one free prototype using MapLibre or Leaflet.

Free plan:

- 3,000 credits/day.
- No credit card required.
- Up to 5 requests/second.
- Includes maps, geocoding/autocomplete, routing, places, isolines and related APIs.
- A simple geocoding or two-waypoint routing call generally costs one credit; map tiles cost 0.25 credit each.
- Limited commercial use is allowed with required Geoapify attribution.

Conditions/cautions:

- Interactive maps consume multiple tile credits; Geoapify estimates approximately 14 tiles per map view and about 50 per user session, so 3,000 credits is not equivalent to 3,000 customer tracking sessions.
- No managed traffic-aware ETA comparable to Google/TomTom should be assumed without verifying the selected routing profile.
- Free tier has best-effort support.

Official references:

- https://www.geoapify.com/pricing/
- https://www.geoapify.com/pricing-details/
- https://apidocs.geoapify.com/docs/routing/pricing/

Verdict: recommended zero-cost proof-of-concept option when traffic precision is not yet required.

### Option D — LocationIQ

Best fit: low-cost maps/geocoding/routing prototype with a simple daily quota.

Free plan:

- 5,000 requests/day.
- 2 requests/second and 60 requests/minute.
- One access token.
- Geocoding, routing, street maps and static maps included.
- Limited commercial use is allowed with a prominent required LocationIQ attribution/link.

Conditions/cautions:

- A map view counts as a request credit; rate limits are low for many simultaneous tracking clients.
- Free accounts may cache API request/response pairs for up to 48 hours; map-tile server caching is not allowed.
- Paid India-listed entry points currently begin around ₹3,500/month for Maps Lite and ₹7,000/month for Developer, subject to current provider pricing.

Official reference: https://locationiq.com/pricing

Verdict: usable free demo option, but lower rate limits make it less comfortable for live multi-user tracking.

### Option E — Mapbox

Best fit: polished custom map/tracking UI and strong developer experience; good Google comparison candidate.

Published free tiers include:

- Temporary Geocoding: 100,000 requests/month, then $0.75 per 1,000 at the first paid tier.
- Address Autofill: 1,000 sessions/month free.
- Web map and Directions products have separate usage meters/free tiers; verify the calculator immediately before selection.
- Traffic-aware `driving-traffic` routing is available.

Conditions/cautions:

- Temporary geocoding results are not for permanent storage; permanent geocoding uses separate pricing/terms.
- Map loads, geocoding, autofill, directions, and navigation are separate meters.
- Billing/account terms must be reviewed even when initial use falls inside free tiers.

Official references:

- https://www.mapbox.com/pricing
- https://docs.mapbox.com/api/navigation/directions/
- https://docs.mapbox.com/help/dive-deeper/understand-temporary-vs-permanent-geocoding/

Verdict: strongest UI/customization alternative to Google; include in the Delhi accuracy and cost bake-off.

### Option F — MapTiler Cloud + MapLibre

Best fit: map rendering/search experiments and open renderer portability.

Free plan currently lists:

- 5,000 map sessions/month.
- 1,000 search sessions/month.
- 100,000 API requests/month.
- Free plan is suitable for testing, personal, or non-commercial use; its terms limit free commercial use to research/development.
- Paid Flex currently starts at $30/month, with 25,000 sessions, 3,000 search sessions, and 500,000 API requests included.

Conditions/cautions:

- MapTiler is strongest for maps/search; routing may require a separate provider depending on the chosen product/API availability.
- Do not interpret MapLibre itself as a routing/geocoding/traffic service—it is the renderer.

Official references:

- https://www.maptiler.com/cloud/pricing/
- https://www.maptiler.com/terms/cloud/

Verdict: useful renderer/provider-neutral route, but not the simplest complete delivery stack.

### Option G — Fully open/self-hosted stack

Possible composition:

- MapLibre GL JS for rendering.
- OpenStreetMap-derived tiles through a commercial tile host or self-hosted tile server.
- Nominatim/Pelias/Photon for geocoding.
- OSRM/Valhalla/GraphHopper/openrouteservice for routing.

Advantages: maximum control, no per-request vendor bill after infrastructure, provider portability.

Costs/risks: server hosting, map-data updates, India address quality, monitoring, tile bandwidth, routing profiles, no managed live traffic, and operational ownership. Public OpenStreetMap/Nominatim community endpoints must not be used as the production backend for a commercial live-tracking application.

Verdict: not actually free after operations. Consider only when scale, data control, or vendor independence justifies running geospatial infrastructure.

### Option H — Mappls/MapmyIndia

Best fit: India-specific address, POI, routing, navigation, tracking, and last-mile comparison against Google.

Current public position:

- Developer access starts free and the signup page advertises no credit card for initial access.
- Maps, search/geocoding, routes/navigation, tracking, geofencing, and route-optimization products are available.
- Developer build/test access starts free; commercial applications can move to higher transaction and support plans.
- Zepto publicly uses MapmyIndia SDKs and APIs for customer and delivery experience, making it a relevant India quick-commerce benchmark.

Conditions/cautions:

- Exact production quotas and overage prices are less transparent than Google or Mapbox and may require a sales quote.
- Treat free access as development/trial capacity until commercial limits are confirmed in writing.
- Test apartment/locality lookup, pin placement, two-wheeler routes, live traffic, SDK ergonomics, and storage/attribution terms on the same Delhi corpus.

Official references:

- https://about.mappls.com/api/
- https://www.mapmyindia.com/api/landing-page/
- https://www.mapmyindia.com/api/global-api/

Verdict: include in the production bake-off; it may provide better India-specific economics or address coverage, but do not select it solely on an unspecified free tier.

### HERE caution

HERE's no-payment Limited plan lists 1,000 daily requests and supports map/search/routing APIs. However, HERE's current Limited/Base exclusions define asset management to include locating, tracking/displaying, routing, or deriving analytics for an actively managed person/vehicle/cargo. That conflicts directly with rider tracking unless a suitable commercial agreement is obtained.

Official reference: https://www.here.com/get-started/pricing/rps-limits-excluded-use-cases

Verdict: do not use the free/Limited plan for SliceMatic rider tracking without written commercial terms.

### Recommended selection ladder

1. Zero-card demo: TomTom first; Geoapify second.
2. Fastest ultra-small proof of concept: Geoapify + MapLibre.
3. Recommended SliceMatic MVP: Google Maps Platform India, protected by quotas and billing alerts.
4. India-specific production comparison: Mappls/MapmyIndia.
5. Managed UI/customization and free-tier comparison: Mapbox.
6. Lowest long-term per-request cost at proven scale: MapLibre + self-hosted OSRM/OR-Tools, with managed geocoding retained where accuracy requires it.

Do not mix provider data casually. Each provider has rules about caching, permanent storage, attribution, and displaying its results on another provider's map.

### Provider bake-off scorecard

For each provider, test the same 100–300 representative Delhi addresses and trips:

| Dimension | Weight |
|---|---:|
| Address/geocode success and pin accuracy | 25% |
| Last-mile route plausibility | 20% |
| ETA error against observed trips | 20% |
| Two-wheeler/local-road quality | 10% |
| Free-tier/billing predictability | 10% |
| SDK accessibility and marker animation | 5% |
| Data-storage/attribution compatibility | 5% |
| Reliability, quotas, support | 5% |

Sprint deliverable: `plans/map-provider-bakeoff.md` with raw results, estimated cost at 100/1,000/10,000 monthly orders, free-cap exhaustion scenarios, self-hosting operations cost, and final ADR.

## Current gaps

- `customer_activity` and `customer_preference` exist in SQL but have no runtime read/write paths.
- Recommendations derive profiles repeatedly from order history instead of consuming a maintained profile.
- `orders.delivery_charge` is based on one outlet-wide static configuration; no distance quote or rule version exists.
- No rider, assignment, status-history, location, ETA, proof-of-delivery, or dispatch model exists.
- The current tracking UI is a static step, not an authenticated delivery resource.
- Current admin auth and RLS are not safe enough for rider/customer location data.
- Order persistence is multi-step and non-transactional; payment verification and order finalization are separate.

## Target domain model

### Customer intelligence

`customer_activity` additions:

- `session_id`, `order_id`, `source`, `event_version`, `occurred_at`, `idempotency_key`
- Indexed event types: `menu_viewed`, `pizza_viewed`, `recommendation_shown`, `recommendation_clicked`, `cart_added`, `cart_removed`, `checkout_started`, `order_placed`, `reordered`, `delivery_rated`
- Metadata must remain small and must not contain raw PII.

`customer_preference` additions:

- Explicit: dietary preference, excluded toppings, preferred pizzas/toppings/sizes, max spend, contactless delivery, personalization opt-in
- Derived: favourite pizza/topping, vegetarian affinity, average spend, last calculated time
- Explicit exclusions always override inferred affinity.

### Delivery operations

- `delivery_rider`: identity, auth mapping, vehicle, availability, active status
- `delivery_assignment`: one active assignment per order, rider, ETA, route distance, immutable fee quote, payout, fee-rule version, timestamps, optimistic version
- `delivery_status_history`: append-only, idempotent transition audit
- `delivery_location`: assignment/rider point samples, accuracy, heading, speed, capture time; short retention
- `delivery_fee_config`: versioned base, distance-band/zone, minimum/maximum, free-delivery, payout, wait/surge rules
- `orders`: fulfilment type, delivery snapshot, ETA, delivered time, cancellation reason

Do not overload `orders.order_status` with courier state.

Kitchen state:

```text
Placed → Confirmed → Preparing → ReadyForPickup → Completed
                                      └──────────→ Cancelled (privileged rules)
```

Delivery state:

```text
unassigned → offered → accepted → picked_up → arriving → delivered
                └──→ rejected/expired → offered to another rider
```

Transitions must execute through a transactional database function using row locking, optimistic `version`, transition validation, history append, and snapshot update atomically.

## Fee policy v1

Persist the quote used for an order; never recalculate history using today's configuration.

```text
customerDeliveryFee = clamp(
  baseFee + distanceBandFee + optionalSurge - deliveryPromotion,
  minimumFee,
  maximumFee
)

riderPayout = pickupBase + perKm × routeKm + waitBonus + optionalSurgeBonus
platformDeliveryMargin = customerDeliveryFee - riderPayout
```

Rules:

- The server geocodes once and computes the route; the browser never supplies trusted distance or fee.
- Store `fee_rule_version`, route distance, quote inputs, final customer fee, and rider payout.
- Keep GST/product pricing order unchanged unless finance explicitly decides delivery tax treatment.
- Free delivery is a customer promotion, not automatically a zero rider payout.
- Round money through the existing `money()`/billing conventions and cover every boundary with tests.

## Sprint 0 — Security and delivery contract foundation

Duration: 2–3 engineering days plus product review. This is a release gate, not optional cleanup.

### S0-01 Delivery ADR and state contract

- Define kitchen/delivery transition matrices, actor permissions, cancellation/reassignment rules, fee v1, privacy retention, and demo behavior.
- Acceptance: product and engineering approve state names, fee examples, terminal states, and tracking disclosure.

### S0-02 Identity and RLS hardening

- Add `customer.auth_user_id`; enforce admin role via `user_roles`; design rider auth mapping.
- Remove broad customer/order `using (true)` access before location data exists.
- Disable `demo-bypass` unless an explicit non-production feature flag is enabled.
- Acceptance: SQL persona tests prove Customer A cannot read Customer B, Rider A cannot read Rider B, anon cannot read delivery data, and admin access requires the admin role.

### S0-03 Migration and transaction strategy

- Introduce ordered SQL migrations instead of growing only the monolithic schema.
- Design transactional order finalization and delivery transition RPCs.
- Acceptance: migrations apply to empty and seeded databases and can be rolled back in a disposable environment.

### S0-04 Provider spike

- Test Google, Mappls, Mapbox, TomTom, and Geoapify on 100–300 representative New Ashok Nagar/Delhi delivery addresses. Keep LocationIQ as a fallback comparison if time permits.
- Measure address match, apartment/locality usefulness, route plausibility, ETA error, two-wheeler suitability, map load cost, and route cost.
- Calculate map, autocomplete/geocode, route, and ETA-refresh usage separately at 100/1,000/10,000 monthly orders.
- Prove that normal GPS marker updates generate zero provider route/geocode calls and that deviation/refresh triggers are rate-limited.
- Model self-hosted OSRM infrastructure and maintenance separately rather than calling the open-source path “free.”
- Acceptance: documented scorecard and provider ADR; free-tier and commercial-use terms verified; no key is exposed to source control.

Sprint 0 exit gate: authorization and migration design approved. No live tracking implementation starts before this gate.

### S0-05 Modular-monolith extraction map

- Inventory responsibilities and migrate the remaining backend modules. (Frontend monolith extraction is already completed).
- Freeze behavior with characterization tests before moving code.
- Define feature modules, shared components, server domain modules, service clients, and API contracts.
- Acceptance: dependency map approved; no circular feature imports; extraction sequence keeps routes and user flows unchanged.

## Sprint 1 — Customer preferences and activity loop

Goal: make the existing tables useful before adding delivery personalization.

### S1-01 Preference/activity migration and types

- Evolve both tables, indexes, constraints, TypeScript types, seed/demo adapter, and retention policy.
- Acceptance: migrations and data-service tests pass; existing customer data remains valid.

### S1-02 Customer preference API and UI

- `GET/PATCH /api/customer/preferences` with ownership, field whitelist, optimistic version/ETag.
- Add dietary, exclusions, preferred size, spend ceiling, contactless delivery, and personalization consent controls to account settings.
- Acceptance: explicit preferences persist, reject cross-customer access, and remain usable without OpenRouter.

### S1-03 Activity ingestion

- `POST /api/customer/activity`, batches ≤25, idempotency keys, allowed event schema, rate limits.
- Browser events are advisory; server emits authoritative order and recommendation-conversion events.
- Acceptance: duplicates do not inflate counts; malformed/PII-heavy metadata is rejected.

### S1-04 Preference compiler and recommendation integration

- Compute decayed affinity: purchase > cart add > click/view.
- Send a compact derived summary—not raw event history or PII—to OpenRouter.
- Acceptance: explicit exclusions always win; opt-out prevents activity-based personalization; recommendation response exposes its source/reason.

Sprint 1 metrics: preference completion rate, event ingestion failures, recommendation CTR/conversion, fallback rate.

### S1-05 UI segregation wave 1

- Extract customer ordering stages, account workspace, admin shell/tabs, and shared presentation components.
- Move network calls from large components into typed feature hooks/clients.
- Keep route pages as composition roots; do not duplicate shared customer UI into the admin page.
- Acceptance: reduced large-file responsibilities, visual regression/E2E parity, and no dual-file manual-sync requirement for extracted sections.

## Sprint 2 — Dispatch core and immutable fees

Goal: operate delivery without requiring a map.

### S2-01 Delivery schema and transactional state machine

- Add rider, assignment, history, and fee configuration tables plus transition RPC.
- Acceptance: complete valid/invalid transition matrix, idempotency, optimistic concurrency, append-only audit.

### S2-02 Fee quotation service

- Add server-only geocoding/routing adapter and versioned fee calculator.
- Integrate quote into checkout and persist exact quote on order/assignment.
- Acceptance: browser distance/fee tampering changes nothing; free delivery still preserves rider payout; historical fee is immutable.

### S2-03 Admin dispatch board

- Queue: ready/unassigned, offered, active, late, delivered, exception.
- Assign/reassign rider, view fee/payout, transition history, ETA and stale indicators.
- Acceptance: role-protected actions, conflict response on stale version, no duplicated active assignment.

### S2-04 Minimal rider PWA

- Current assignment, accept/reject, picked-up, arriving, delivered actions; foreground location permission disclosure.
- Acceptance: rider sees only assigned delivery and sees customer contact/address only after acceptance; every action is idempotent and audited.

Sprint 2 metrics: assignment latency, acceptance rate, fee/payout margin, invalid transitions, reassignment rate.

### S2-05 Service-contract foundation

- Create versioned request/response schemas for recommendation, menu assistant, forecast refresh/status/result, and health/version.
- Add request IDs, internal authentication, timeout budgets, retries only for safe/idempotent calls, circuit breaking, and structured errors.
- Acceptance: contract tests run against in-process adapters and service stubs; Next.js fallback works when a service is unavailable.

## Sprint 3 — Customer tracking map and ETA

Goal: honest live tracking with graceful degradation.

### S3-01 Location ingestion

- Rider sends location only for active accepted/picked-up/arriving assignment.
- Validate assignment, timestamp, bounds, accuracy, plausible movement, and rate limit.
- Adaptive target: 10–15 seconds moving/foreground, about 30 seconds slow; sample persistence separately from latest location.
- Acceptance: old/out-of-order points rejected; tracking stops at terminal state; raw location retention job works.

### S3-02 Private realtime and recovery

- Private topic `delivery:{assignmentId}` with owner/rider/admin authorization.
- Broadcast status/location after authoritative database commit.
- On reconnect, fetch snapshot; fallback poll every 20–30 seconds.
- Acceptance: unauthorized subscription fails; dropped WebSocket recovers without status regression; sequence/version is monotonic.

### S3-03 Customer tracking experience

- Replace static tracking with timeline, ETA window, rider first name/initial, support action, delivery instructions, last updated time, map/polyline, stale/offline state.
- Reveal rider/map only after assignment/pickup; never fake marker motion.
- Acceptance: usable without maps, without GPS, on slow networks, and after page refresh.

### S3-04 ETA and geofence behavior

- Recompute server-side at pickup, significant route deviation, and every 2–3 minutes; not on each GPS update.
- Arrival hint around 300–500m or ETA ≤3 minutes; use consecutive samples/hysteresis.
- Acceptance: ETA does not jitter on every location; route provider errors preserve last ETA and timeline.

Sprint 3 metrics: realtime connection success, location age, ETA MAE, map provider errors, tracking-page engagement.

### S3-05 Recommendation and voice AI service extraction

- Move OpenRouter orchestration, prompt versions, validation, fallbacks, recommendation reasoning, menu assistant, cart insight, menu copy, and ops briefing into `services/ai-service`.
- Keep customer ownership/menu loading in the BFF/core domain; send only the minimum grounded context to the service.
- Acceptance: existing recommendation contract remains compatible; invalid menu IDs are rejected; service outage uses deterministic fallback; no customer PII appears in prompts/logs.

## Sprint 4 — Proof, notifications, observability, rollout

### S4-01 Proof of delivery and exceptions

- Delivery OTP for normal risk; optional photo only where policy/consent permits.
- Failed delivery, customer unavailable, reassignment, cancellation/refund handoffs.
- Acceptance: delivery cannot complete without configured proof; proof is access-controlled and retained minimally.

### S4-02 Notifications and support

- Assigned, picked up, near arrival, delivered, and delay events through provider-neutral notification adapter.
- Acceptance: idempotent notification log and retry policy; no duplicate customer messages.

### S4-03 Privacy and observability

- Precise location collection only from active assignment to terminal state.
- Suggested raw trace retention: 7–30 days; durable delivery events retained per business/audit policy.
- Dashboards for stale riders, ETA error, transition failures, location ingestion, provider spend, and support exceptions.
- Acceptance: retention deletion verified; customer loses live-location access after completion; audit events remain.

### S4-04 Load/security/E2E and staged rollout

- E2E: order → quote → assign → accept → pickup → location → track → deliver.
- Test cancellation, reassignment, no GPS, provider outage, stale update, duplicate event, and unauthorized personas.
- Feature flags: `DELIVERY_V1_ENABLED`, `LIVE_TRACKING_ENABLED`, `MAP_PROVIDER`, `RIDER_PWA_ENABLED`.
- Rollout: internal riders → 10% member orders → 50% → all eligible delivery orders.
- Acceptance: rollback disables maps/realtime without breaking order placement or status timeline.

### S4-05 Voice assistant dashboard release

- Add `MenuVoiceAssistant` to the admin dashboard using the extracted AI service.
- Implement typed input, push-to-talk capability detection, transcript confirmation, grounded item cards, read-aloud, and unsupported-browser fallback.
- Add queries for available pizzas, bases, toppings, price ranges, tags/dietary filters, preparation time, and unavailable items.
- Acceptance: every named item/price/availability value maps to the returned `matchedItems`; microphone denial and unsupported recognition preserve full typed functionality; no raw audio retained.

Sprint 4 voice metrics: successful intent rate, grounded-answer validation failures, speech-recognition fallback rate, latency p50/p95, user cancellation rate.

## Sprint 5 — Random Forest forecast microservice

Goal: preserve the implemented model while making refresh reliable and deployable.

### S5-01 Forecast persistence migration

- Add `forecast_model_run`: run ID, model name/version, feature version, parameters, status, requested/requested-by/started/completed times, training order/bucket counts, RMSE, error code, source order watermark.
- Add `forecast_point`: run ID, forecast timestamp, predicted orders, lower/upper interval nullable, created time; unique run/timestamp.
- Optionally update `daily_sales_fact` from the latest successful run, but do not use it as the only forecast store.
- Acceptance: one latest-successful-run query powers the dashboard; failed runs do not replace the active forecast.

### S5-02 Python Forecast Service

- Package existing `forecast_model.py` logic behind a Python FastAPI service.
- Endpoints: `POST /v1/forecast-runs`, `GET /v1/forecast-runs/{id}`, `GET /v1/forecasts/latest`, `GET /health`, `GET /version`.
- Start with supplied order timestamps; later allow a worker to read a bounded training dataset through a dedicated internal endpoint.
- Acceptance: the same fixed fixture produces parity with the current model; deterministic seed retained; payload/schema validation and timeouts covered.

### S5-03 Refresh Forecast dashboard flow

- Add Refresh Forecast to `ForecastPanel` with admin authorization.
- UI states: idle, requesting, queued/training, succeeded, failed, stale; disable duplicate requests.
- After success, refresh chart, top peaks, RMSE, training time, order/bucket counts, and active run ID without a full page reload.
- Show “insufficient history” when fewer than 20 buckets prevent RMSE; never present seed/demo output as freshly trained production data.
- Acceptance: clicking refresh trains from the current order watermark and visibly changes metadata; failure keeps the previous successful forecast.

### S5-04 Job execution and deployment

- Production refresh is asynchronous: BFF creates a run, worker trains, stores results, dashboard polls run status or receives an authorized update.
- Add single-flight/advisory lock so two refreshes do not train the same watermark concurrently.
- Add maximum training window, resource/time limit, retry policy, and model artifact policy.
- Acceptance: works without writable Next.js filesystem or locally installed Python in the web deployment; repeated clicks remain idempotent.

### S5-05 Forecast quality and operations

- Baseline Random Forest against naive same-hour/weekday averages before adding features.
- Add training data completeness, RMSE history, drift/forecast error after actuals arrive, last-success age, run duration, and failure rate.
- Future feature candidates require evidence: holidays, promotions, weather, menu availability, and delivery capacity.
- Acceptance: model is promoted only when it beats the agreed baseline; rollback selects a prior successful model/run.

Sprint 5 metrics: refresh success rate, run duration, forecast staleness, RMSE/backtest error, orders/buckets used, baseline lift.

## Microservice rollout rules

- Extract services only after local module boundaries and contracts are stable.
- Each service has one reason to change, independent deployment, health/version, ownership, and observability.
- Do not split the database by service during the first extraction; establish API ownership first and remove unrestricted shared-table access progressively.
- No distributed transaction across order, payment, delivery, and AI services. Use idempotency, persisted state, and an outbox/event pattern for cross-boundary side effects.
- Recommendation/voice failure must never block menu browsing or order placement.
- Forecast failure must never erase the last successful forecast or block the admin dashboard.
- Preserve deterministic fallbacks and feature flags during migration.
- Avoid a “distributed monolith”: no chatty per-item calls, shared internal source imports across deployables, or synchronous chains without timeouts.

## API backlog

```text
GET/PATCH /api/customer/preferences
POST      /api/customer/activity
GET       /api/customer/deliveries/[orderId]

GET       /api/admin/deliveries
POST      /api/admin/deliveries/[orderId]/assign
POST      /api/admin/deliveries/[assignmentId]/transition

GET       /api/rider/assignments/current
POST      /api/rider/assignments/[id]/accept
POST      /api/rider/assignments/[id]/pickup
POST      /api/rider/assignments/[id]/location
POST      /api/rider/assignments/[id]/arriving
POST      /api/rider/assignments/[id]/deliver

POST      /api/ai/menu-assistant
POST      /api/admin/forecast/refresh
GET       /api/admin/forecast/runs/[runId]
GET       /api/admin/forecast/latest
```

## Definition of done for every ticket

- Authorization and ownership tests included.
- Demo/no-provider behavior defined.
- Idempotency and retry behavior defined for mutations.
- Metrics/logging added without PII.
- Wiki/API/schema documentation updated.
- `npm test` and `npm run build` pass; DB/RLS tests pass when schema changes.
- No maps service key, service-role key, rider phone, or precise customer location leaks to logs or public payloads.

## Source references

- Supabase recommends Broadcast for scalable, secure database-change subscriptions: https://supabase.com/docs/guides/realtime/subscribing-to-database-changes
- Supabase Postgres Changes, filtering, private schemas, and scaling: https://supabase.com/docs/guides/realtime/postgres-changes
- Google traffic-aware Routes API: https://developers.google.com/maps/documentation/routes/reference/rest/v2/TopLevel/computeRoutes
- Google India pricing: https://developers.google.com/maps/billing-and-pricing/pricing-india
- Google two-wheeler route caveats: https://developers.google.com/maps/documentation/routes/route_two_wheel
- Mapbox Directions alternative: https://docs.mapbox.com/api/navigation/directions/
- DoorDash delivery lifecycle webhooks: https://developer.doordash.com/en-US/docs/drive/how_to/webhooks/
- DoorDash webhook reference and idempotent retry expectations: https://developer.doordash.com/en-US/docs/drive/reference/webhooks/
- Uber privacy-limited customer location sharing: https://www.uber.com/us/en/newsroom/live-location-sharing/
- Swiggy product journey: https://www.swiggy.com/corporate/our-business/
- Next.js Backend-for-Frontend and public Route Handler guidance: https://nextjs.org/docs/app/guides/backend-for-frontend
- Browser speech-recognition limitations: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
- Browser speech synthesis: https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis
- TomTom free developer API pricing: https://docs.tomtom.com/pricing
- Geoapify free plan and credit model: https://www.geoapify.com/pricing/
- LocationIQ developer/free pricing: https://locationiq.com/pricing
- MapTiler Cloud pricing and terms: https://www.maptiler.com/cloud/pricing/ and https://www.maptiler.com/terms/cloud/
- HERE excluded tracking use cases: https://www.here.com/get-started/pricing/rps-limits-excluded-use-cases
