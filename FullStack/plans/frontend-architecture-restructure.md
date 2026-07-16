---
title: SliceMatic Frontend Architecture Restructure
status: draft-for-architecture-review
owner: SliceMatic FullStack team
created: 2026-07-16
scope: FullStack frontend, routes, state, feature modules, performance, migration
---

# SliceMatic Frontend Architecture Restructure

This plan defines how to turn the current FullStack frontend from giant mixed-responsibility files into a clear, route-safe, feature-oriented Next.js App Router architecture.

Read with:

- `FullStack/wiki/components.md` — current component inventory
- `FullStack/wiki/state-management.md` — current Zustand/sessionStorage behavior
- `FullStack/wiki/ui-map.md` — current visual baseline
- `FullStack/plans/ui-revamp-implementation-plan.md` — UI revamp plan
- `FullStack/plans/ui-inspiration-research.md` — visual direction research

## Current Problem

The current frontend has two massive files:

- `FullStack/components/SliceMaticStage3.tsx` — customer workspace, also carries some admin/account behavior.
- `FullStack/app/admin-dashboard/page.tsx` — admin dashboard, duplicated shared customer/account behavior.

Both files mix:

- route composition
- feature rendering
- local view state
- Zustand global state
- sessionStorage auth/session reads
- API calls
- form validation
- admin/customer branching
- menu editing
- AI calls
- forecast display
- cart/checkout behavior
- visual layout

This makes UI revamp risky because every change touches too much surface area. Bugs can appear when moving between `/`, `/payment`, `/confirmation`, and `/admin-dashboard` because route state, persisted state, and browser-only session state are not separated by ownership.

## Architecture Goals

1. Pages compose features; they do not contain feature logic.
2. Feature modules own their UI, hooks, API client, types, and tests.
3. Server data, client UI state, and persisted session state are separated.
4. Checkout state survives route transitions but not indefinite browser history.
5. Admin state is deep-linkable where useful: tab, filters, selected order, date.
6. Expensive or rarely used features are lazy-loaded.
7. Shared UI primitives are accessible and reusable.
8. The migration is incremental; behavior remains stable during extraction.

## External Best-Practice References

Primary references:

- Next.js project structure and route groups: https://nextjs.org/docs/app/getting-started/project-structure
- Next.js server/client component guidance: https://nextjs.org/docs/app/getting-started/server-and-client-components
- Next.js data fetching: https://nextjs.org/docs/app/getting-started/fetching-data
- Next.js lazy loading: https://nextjs.org/docs/app/guides/lazy-loading
- Zustand persist middleware: https://zustand.docs.pmnd.rs/integrations/persisting-store-data

Relevant principles from those references:

- Keep `app/` route files as routing, layout, loading, error, and composition boundaries.
- Use route groups and private folders to organize without changing URLs.
- Prefer Server Components for non-interactive shell/data composition and Client Components only where interactivity is needed.
- Add `loading.tsx` and `error.tsx` at route/segment boundaries.
- Lazy-load client-only or heavy components such as charts, AI panels, maps, payment SDK wrappers, and dispatch boards.
- Persist only the subset of client state that must survive refresh/route transitions.

## Target Folder Structure

Recommended structure:

```text
FullStack/
  app/
    (customer)/
      page.tsx
      payment/page.tsx
      confirmation/page.tsx
      loading.tsx
      error.tsx
    (admin)/
      admin-dashboard/page.tsx
      admin-dashboard/loading.tsx
      admin-dashboard/error.tsx
    api/
      ...
    layout.tsx
    globals.css

  features/
    customer-ordering/
      components/
        CustomerShell.tsx
        MenuCatalog.tsx
        MenuFilterBar.tsx
        MenuItemCard.tsx
        CustomizePizzaDialog.tsx
        CartRail.tsx
        CartLineItem.tsx
        RecommendationLane.tsx
        AiCartStrategistCard.tsx
      hooks/
        useMenuCatalog.ts
        usePizzaBuilder.ts
        useCartInsight.ts
      api/
        customerOrderingClient.ts
      state/
        customerOrderingSelectors.ts
      types.ts
      index.ts

    checkout/
      components/
        CheckoutPageShell.tsx
        CheckoutSummary.tsx
        PaymentModeCards.tsx
        DeliveryFeeBreakdown.tsx
        PlaceOrderButton.tsx
      hooks/
        useCheckoutSession.ts
        usePlaceOrder.ts
        usePaymentVerification.ts
      api/
        checkoutClient.ts
      types.ts
      index.ts

    order-tracking/
      components/
        ConfirmationShell.tsx
        OrderJourneyRail.tsx
        TrackingMapPanel.tsx
        RiderCard.tsx
        ReceiptPanel.tsx
      hooks/
        useOrderStatus.ts
      types.ts
      index.ts

    admin-dashboard/
      components/
        AdminShell.tsx
        AdminCommandBar.tsx
        AdminNavRail.tsx
        AdminOverview.tsx
        AdminOrdersTable.tsx
        OrderDetailsDrawer.tsx
        ForecastWorkspace.tsx
        AdminMenuWorkspace.tsx
        AdminSettingsWorkspace.tsx
      hooks/
        useAdminSession.ts
        useAdminOrders.ts
        useAdminFilters.ts
      api/
        adminClient.ts
      state/
        adminDashboardSelectors.ts
      types.ts
      index.ts

    ai-console/
      components/
        AiServiceHealthCards.tsx
        MenuAssistantTester.tsx
        RecommendationTester.tsx
      api/
        aiConsoleClient.ts
      types.ts

    forecast/
      components/
        ForecastPanel.tsx
        ForecastRefreshButton.tsx
        ForecastChart.tsx
        ForecastRunStatus.tsx
      hooks/
        useForecastRefresh.ts
      api/
        forecastClient.ts
      types.ts

    delivery/
      components/
        DeliveryHealthStrip.tsx
        DispatchBoard.tsx
        RiderAssignmentControl.tsx
      hooks/
        useDeliveryQuote.ts
        useDispatchQueue.ts
      types.ts

  components/
    ui/
      Button.tsx
      Card.tsx
      Dialog.tsx
      Drawer.tsx
      Input.tsx
      Select.tsx
      Skeleton.tsx
      StatusDot.tsx
      StatusPill.tsx
      Toast.tsx
      EmptyState.tsx
    layout/
      PageShell.tsx
      ResponsiveRail.tsx

  lib/
    api/
      fetchJson.ts
      errors.ts
    session/
      authSession.ts
      checkoutSession.ts
      storageKeys.ts
    store/
      app-store.ts
      checkout-slice.ts
      customer-slice.ts
      admin-ui-slice.ts
      selectors.ts
    domain/
      pricing.ts
      order-state.ts
      delivery-state.ts
    ...
```

Notes:

- `app/` should expose routes and compose feature entry components.
- `features/` should own product-specific behavior.
- `components/ui/` should be product-agnostic primitives.
- `lib/domain/` should be pure business logic.
- `lib/api/` should be typed fetch wrappers and error normalization.
- `lib/session/` should be the only place allowed to read/write storage keys directly.

## Route Architecture

Current public URLs can remain stable:

| URL | Route owner | Feature composition |
|---|---|---|
| `/` | `app/(customer)/page.tsx` | `CustomerShell`, `MenuCatalog`, `CartRail`, `RecommendationLane` |
| `/payment` | `app/(customer)/payment/page.tsx` | `CheckoutPageShell`, `CheckoutSummary`, `PaymentModeCards` |
| `/confirmation` | `app/(customer)/confirmation/page.tsx` | `ConfirmationShell`, `OrderJourneyRail`, `ReceiptPanel`, tracking later |
| `/admin-dashboard` | `app/(admin)/admin-dashboard/page.tsx` | `AdminShell`, tab workspaces |

Future route options:

| Future URL | Purpose |
|---|---|
| `/admin-dashboard?tab=orders&status=late` | Deep-link admin tab/filter state |
| `/admin-dashboard?tab=orders&order=abc` | Open order drawer from URL state |
| `/order/[orderId]` | Public/private order tracking link, once auth and privacy are designed |
| `/rider` | Rider PWA shell after delivery schema exists |

## Page Composition Rule

Each page file should stay tiny:

```tsx
// app/(customer)/payment/page.tsx
import { CheckoutPageShell } from "@/features/checkout";

export default function PaymentPage() {
  return <CheckoutPageShell />;
}
```

Pages may:

- declare metadata
- read route params/search params
- choose server/client shell
- render loading/error boundaries
- compose feature entry components

Pages must not:

- contain long JSX sections
- directly read/write sessionStorage
- embed business rules
- define feature-specific API calls
- own cross-route state

## State Architecture

### Three state categories

| Category | Examples | Owner | Persistence |
|---|---|---|---|
| Server state | menu, orders, outlet pricing, forecast, AI service health | fetch hooks/API clients; later query cache | Re-fetch/cache, not Zustand |
| Client workflow state | cart, checkout draft, selected pizza, payment mode, last order handoff | Zustand slices + hooks | sessionStorage for checkout-critical state only |
| View/UI state | modal open, selected tab, filters, drawer order, toast | URL search params or local component state | URL for shareable/admin filters; local otherwise |

### What should persist?

Persist in `sessionStorage`:

- cart lines
- checkout customer draft
- payment mode
- last placed order handoff needed by `/confirmation`
- recommendation result only if tied to current cart/customer and has a freshness timestamp
- customer/admin session flags until real auth session becomes the single source

Do not persist:

- modal open/closed state
- toasts
- loading flags
- admin fetched summaries
- order table data
- forecast chart data
- AI service health results
- menu edit drafts after leaving admin menu unless explicitly saved as draft
- payment SDK transient objects

Use `localStorage` only for external payment return handoff that must survive provider redirect, such as current `cf_pending`. Keep it small, versioned, and cleared after verification.

### Proposed Zustand slices

```text
checkoutSlice
  cart
  customerDraft
  paymentMode
  lastOrderHandoff
  recommendationSnapshot
  actions: addLine, removeLine, updateCustomerDraft, clearCheckout, setLastOrderHandoff

sessionSlice
  customerSession
  adminSession
  actions: hydrateSession, logoutCustomer, logoutAdmin

adminUiSlice
  lastTab? only if not URL-backed
  drawerPrefs
  dismissedHints

uiSlice
  toast queue
  global command palette state
```

Persist only selected checkout/session fields using `partialize`, with a version number and migration function.

### URL state rules

Use URL search params for:

- admin tab
- admin filters
- selected order drawer
- forecast run id
- menu admin section
- settings subpage

Use local component state for:

- customize dialog open/close
- temporary form input before submit
- hover/expanded UI
- skeleton/loading flags

Why:

- Admin views should be reload-safe and shareable.
- Customer ordering should not expose sensitive cart/customer details in the URL.
- Checkout route transitions should read from the persisted checkout slice, not from hidden component state.

## Data Fetching And API Clients

Create feature-level API clients:

```text
features/customer-ordering/api/customerOrderingClient.ts
features/checkout/api/checkoutClient.ts
features/admin-dashboard/api/adminClient.ts
features/forecast/api/forecastClient.ts
features/ai-console/api/aiConsoleClient.ts
```

All clients should use a shared wrapper:

```text
lib/api/fetchJson.ts
```

Wrapper responsibilities:

- JSON parse safety
- typed success/error shape
- auth header injection from session helpers
- AbortController support
- consistent retry policy only where safe
- no secrets in logs
- normalize `errors` payloads into UI-friendly messages

Do not call `fetch` directly from arbitrary components once extraction begins.

## Rendering And Performance Strategy

### Split Client Components

Current giant client components force a large hydration surface. After extraction:

- Keep route shells and static page headers as Server Components where possible.
- Put `use client` only on interactive feature entries.
- Keep charts, maps, payment SDK controls, AI panels, and admin menu editors as isolated Client Components.

### Lazy-load heavy areas

Lazy-load:

- admin forecast chart
- AI console panels
- recommendation tester
- dispatch map
- payment SDK wrappers
- menu image upload/editor
- order details drawer content

Use skeletons while loading:

- `loading.tsx` for route-level loading
- component-level `Skeleton` for tab/drawer/chart loads

### Reduce re-render risk

Rules:

- Select Zustand state by slice/selector, never destructure the whole store in large components.
- Memoize derived expensive calculations like bill totals, filtered menu, filtered orders.
- Keep pure domain functions in `lib/domain`.
- Avoid passing giant objects through many layers; pass stable IDs and selectors where possible.
- For tables, split row components and consider virtualization when order count grows.

### Performance checklist

- No single client component should remain above ~500 lines after extraction.
- No feature entry should import all admin/customer features.
- Payment SDK code should not load on `/` or `/admin-dashboard`.
- Forecast/chart libraries should not load on customer routes.
- Map provider SDK should load only when map panel is visible or route needs it.
- Use `next/image` or image dimensions for product imagery to avoid layout shift.
- Add route-level `loading.tsx` and `error.tsx` for customer/admin groups.

## Separation Of Concerns Rules

| Concern | Belongs in | Does not belong in |
|---|---|---|
| Routing/layout | `app/**/page.tsx`, `layout.tsx` | feature internals |
| Product feature UI | `features/*/components` | route pages |
| Business math | `lib/domain`, existing `lib/pricing.ts` | JSX |
| API calls | `features/*/api`, `lib/api` | random components |
| Browser storage | `lib/session`, store persistence config | page/components |
| Design primitives | `components/ui` | feature folders |
| Feature-specific state | `features/*/hooks`, store slices | global ad hoc keys |
| URL/shareable state | search params helpers | sessionStorage |
| Temporary UI state | local component state | Zustand |

## Migration Plan

### Phase 0 — Lock behavior before moving

- Add characterization tests for pricing/cart/session route transitions.
- Capture Playwright screenshots for `/`, `/payment`, `/confirmation`, `/admin-dashboard`.
- Record current sessionStorage keys and store shape.
- Do not redesign yet.

Acceptance:

- Existing flows still pass: guest order, demo member order, cash checkout, UPI/card disabled fallback, admin login.

### Phase 1 — Create architecture skeleton

- Add `features/`, `components/ui/`, `lib/api/`, `lib/session/`, and `lib/store/` directories.
- Move no behavior yet; create README or index files if helpful.
- Add shared storage key constants in `lib/session/storageKeys.ts`.

Acceptance:

- No runtime behavior changes.

### Phase 2 — Extract pure utilities and storage helpers

- Move direct sessionStorage/localStorage access behind helpers.
- Introduce `checkoutSession.ts`, `authSession.ts`, and `paymentReturnSession.ts`.
- Replace call sites gradually.

Acceptance:

- Storage keys become discoverable in one place.
- `resetSession()` and logout behavior still clear the right keys.

### Phase 3 — Extract customer ordering

- Extract menu filter, menu card, customize dialog, cart rail, recommendation lane.
- Keep `SliceMaticStage3.tsx` as orchestrator temporarily.
- Obey Dual-File Rule until shared sections are removed from both giant files.

Acceptance:

- Customer flow screenshots match baseline.
- Cart and recommendation behavior unchanged.

### Phase 4 — Extract checkout and confirmation

- Extract `/payment` into `features/checkout`.
- Extract `/confirmation` into `features/order-tracking`.
- Introduce explicit `lastOrderHandoff` shape and fallback fetch-by-order-id strategy later.

Acceptance:

- Cash order reaches confirmation.
- Browser refresh on `/payment` keeps cart/session draft.
- Browser refresh on `/confirmation` shows last order or a clear recoverable state.

### Phase 5 — Extract admin dashboard

- Replace admin tab internals with `features/admin-dashboard` workspaces.
- Move tab/filter state into URL search params.
- Lazy-load forecast, AI, menu editor, and dispatch sections.

Acceptance:

- `/admin-dashboard?tab=forecast` opens forecast.
- Filters survive refresh.
- Admin chart/AI code does not load in initial customer bundle.

### Phase 6 — Split global store

- Move from one broad `lib/store.ts` to slices.
- Add selectors and `partialize` persistence.
- Add store migration version.

Acceptance:

- Only checkout/session-critical state persists.
- Tests document what clears on checkout, logout, and browser close.

### Phase 7 — UI system migration

- Introduce `components/ui` primitives and design tokens.
- Migrate surfaces one at a time: Forecast pilot, Payment summary pilot, then menu/cart/admin shell.
- Keep old CSS stable until each surface moves.

Acceptance:

- No mixed one-off utility soup.
- Every migrated component has loading, empty, error, focus, disabled states.

## State Persistence Decision

Recommended decision:

- Use `sessionStorage` for checkout workflow continuity inside a tab.
- Do not use persistent `localStorage` for cart/customer drafts, because shared/public devices and stale carts create privacy and order bugs.
- Use URL search params for admin navigation/filter state.
- Use server persistence for orders, forecast runs, delivery states, and customer preferences.
- Use short-lived localStorage only for third-party payment redirect handoff when unavoidable.

This means:

- Refresh during checkout should recover.
- Closing the tab should clear cart/customer draft.
- Confirmation should be able to recover from `lastOrderHandoff` now and order-id fetch later.
- Admin filters should be reload/share-safe.

## Bug Prevention Rules For Route Transitions

1. Before navigating to `/payment`, checkout slice must contain valid cart and customer draft.
2. `/payment` should validate persisted checkout state on mount; if invalid, show a recovery CTA back to menu.
3. Before navigating to `/confirmation`, `lastOrderHandoff` must be set from the server response.
4. `/confirmation` should not trust client-only totals; display server order data where available.
5. Payment provider return handling should be idempotent and clear pending keys after success/failure.
6. Admin tab changes should update URL, not hidden component state.
7. Logout should clear session + checkout state through one helper, not scattered manual key removal.

## Proposed Architecture Decision Records

Create ADRs later if approved:

- ADR-FE-001: Feature-oriented frontend structure for Next.js App Router.
- ADR-FE-002: SessionStorage-only checkout persistence.
- ADR-FE-003: URL-backed admin navigation and filters.
- ADR-FE-004: Client/server rendering boundary and lazy-load policy.
- ADR-FE-005: UI primitive and Tailwind/design-system migration policy.

## Immediate Next Implementation Slice

Recommended first architecture slice:

1. [x] Add `lib/session/storageKeys.ts`.
2. [x] Add `lib/session/checkoutSession.ts`.
3. [x] Replace scattered string storage keys in `/payment` only.
4. [x] Extract `features/checkout/components/CheckoutSummary.tsx`.
5. [x] Add a test around checkout recovery after refresh.

Current sprint note:

- R1 implemented the session/helper foundation. R2 extracted `CheckoutSummary` while preserving existing CSS classes and payment behavior.
- R3 added `components/ui` primitives and `sui-*` CSS bridge tokens/classes.
- R4 added the forecast refresh pilot on the existing `ForecastPanel`.
- R5 partially migrated checkout/payment to primitives; confirmation extraction remains.
- R6 added URL-backed admin tab state and a tested delivery-state contract scaffold. Full admin drawer extraction remains later.
- R7A extracted the duplicated customer catalogue into `features/menu/components/MenuCatalog.tsx` and the duplicated customizer into `PizzaBuilderDialog.tsx`. Both giant workspaces now compose these controlled components; cart mutation, customer validation, routing, and store ownership remain in their orchestrators.

Why this first:

- It attacks the highest-risk route transition: cart → payment → confirmation.
- It is smaller than extracting the admin dashboard first.
- It creates the pattern for state ownership before visual redesign.

## Open Questions

- Should `features/` live at `FullStack/features/` or inside `FullStack/app/_features/`? Recommendation: top-level `features/` for reuse across routes.
- Should we add TanStack Query/SWR for server state? Recommendation: not immediately; first create typed API clients and isolate fetches, then decide if cache complexity is needed.
- Should admin tab state be fully URL-backed from the first extraction? Recommendation: yes for `tab`, filters, selected order; no for transient drawer animation/open internals.
- Should `lastOrder` remain in Zustand? Recommendation: replace with explicit `lastOrderHandoff`, then move to server-fetch by order id when order tracking is implemented.
- Should the app use route groups now? Recommendation: yes during extraction, without changing public URLs.
