# 🧩 SliceMatic — Component Map

> Every component, its file, purpose, and key patterns.

---

# 🧩 SliceMatic — Component Map

> Every component, its file, purpose, and key patterns.

---

## Component Inventory

### 0. Shared UI primitives
- **Files:** `components/ui/Button.tsx`, `components/ui/Card.tsx`, `components/ui/Skeleton.tsx`, `components/ui/StatusPill.tsx`
- **Role:** Small token-backed primitives introduced in Revamp Sprint R3
- **CSS bridge:** `sui-*` classes in `app/globals.css`
- **Rules:** Use these for new/migrated surfaces before adding one-off styling; keep accessibility and reduced-motion behavior in the primitive layer where possible.

### 1. `CustomerShell` ⭐ CUSTOMER COMPONENT
- **File:** `components/CustomerShell.tsx` (~524 lines)
- **Route:** Rendered at `/` (customer workspace) via `app/page.tsx`
- **Role:** The primary application shell for all customer ordering flows.

**Key state variables:**
```typescript
workspace: "customer" | "account"
step: "intake" | "recommendation" | "menu" | "checkout" | "tracking"
```

**Zustand state consumed:**
- `cart`, `setCart`
- `customer`, `setCustomer`
- `pricingConfig`
- `paymentMode`, `setPaymentMode`
- `lastOrder`
- `recommendation`, `setRecommendation`

---

### 2. `admin-dashboard/page.tsx` ⭐ ADMIN COMPONENT
- **File:** `app/admin-dashboard/page.tsx` (~626 lines)
- **Route:** `/admin-dashboard`
- **Role:** Admin dashboard and operations.

**Admin-only tabs:**
```typescript
type AdminTab = "overview" | "orders" | "menu" | "settings" | "forecast" | "ai"
```

**Admin-only panels (sub-components):**
- `AdminOverviewPanel` — `features/admin-dashboard/components/AdminOverviewPanel.tsx` (revenue-first KPI hero, tomato-only charts, ops briefing workbench, `.admin-overview_*` tokens, `StatusPill`/`Button`, reduced-motion)
- `ForecastPanel` — `components/admin/ForecastPanel.tsx`
- `RecommendationAIPanel` — `components/admin/RecommendationAIPanel.tsx`

---

### 3. `EntryPortal`
- **File:** `components/EntryPortal/EntryPortal.tsx` (+ `EntryPortal.css`)
- **Role:** Landing/login gate shown when no session exists
- **Choices presented:** Email OTP login | Guest order | Admin path via same OTP (role check after verify)
- **Copy / a11y (2026-07-23 taste-skill):** Brand-first `h1` ("SliceMatic"), plain Delhi NCR subtext, sentence-case CTAs, `min-height: 100dvh`, `prefers-reduced-motion` disables logo pulse
- **On complete:** Sets sessionStorage, calls `onComplete()` prop → parent routes appropriately

---

### 4. `CustomerOrderHistoryTable`
- **File:** `components/CustomerOrderHistoryTable.tsx`
- **Role:** Renders the order history table in the customer account page
- **Data type:** `CustomerOrderHistoryItem[]` from `lib/data-service.ts`
- **Used in:** `components/CustomerShell.tsx` and `app/admin-dashboard/page.tsx`

---

### 5. `ForecastPanel`
- **File:** `components/admin/ForecastPanel.tsx`
- **Role:** Demand forecast chart (admin-only)
- **Data:** `ForecastPoint[]` + `ForecastMeta` from `AdminSummary`
- **Revamp Sprint R4:** Adds refresh action/state, skeleton fallback, previous-forecast preservation, and auth-header support for `/api/admin/forecast/refresh`

---

### 6. `RecommendationAIPanel`
- **File:** `components/admin/RecommendationAIPanel.tsx`
- **Role:** AI recommendation testing UI for admins

---

### 7. `CheckoutSummary`
- **File:** `features/checkout/components/CheckoutSummary.tsx`
- **Route:** Used by `/payment`
- **Role:** Renders the checkout review and payment decision surface
- **Owns UI for:** basket lines, member/guest payment policy, bill totals, payment mode cards, primary payment/place-order button, and payment status text
- **Does not own:** payment API calls, router navigation, menu loading, pricing calculation, or order placement side effects; those remain in `app/payment/page.tsx`
- **Sprint:** Extracted in Revamp Sprint R2 as the first feature-folder UI component before the broader UI primitive bridge; partially migrated to shared primitives in R3/R5

### 8. `OrderJourneyRail`
- **Files:** `features/order-tracking/components/OrderJourneyRail.tsx`, `features/order-tracking/orderJourney.ts`
- **Route:** Used by `/confirmation`
- **Role:** Converts recorded order status into a five-step customer lifecycle without implying live rider data.
- **Safety:** Rider, ETA, and map details remain explicitly unavailable until delivery schema/RLS/realtime work is approved.

### 9. `OrderContextPanel`
- **File:** `components/admin/OrderContextPanel.tsx`
- **Role:** Responsive selected-order detail surface using existing order, customer, payment, total, and line-item data.
- **State:** `/admin-dashboard` persists selection in `?tab=orders&order=...`; the duplicated Stage3 admin workspace keeps local selection.
- **Safety:** Dispatch, rider location, and ETA are labelled unavailable; no delivery API or schema behavior is fabricated.

### 10. `MenuCatalog`
- **Files:** `features/menu/components/MenuCatalog.tsx`, `lib/menu-catalog.ts`
- **Role:** Shared customer pizza catalogue used by both giant workspaces, including category/query filtering, starting price, metadata, customize, and direct-add actions.
- **Boundary:** Receives menu data and callbacks; it does not own customer validation, cart mutation, navigation, or persisted state.
- **Polish (2026-07-23):** House picks (`Local favorite` / `Best value` / `Fastest bake` / bestseller badges) sort first on default browse, get `menu-card-premium--featured` + “House pick” flag; live count; search icon; `loading` skeletons wired from CustomerShell / admin view-as-customer `/api/menu` fetch; empty state clears filters.

### 11. `PizzaBuilderDialog`
- **File:** `features/menu/components/PizzaBuilderDialog.tsx`
- **Role:** Controlled accessible pizza customizer for crust, size, toppings, quantity, and preview total.
- **Boundary:** Parent workspaces retain builder state, capacity validation, cart merging, toast behavior, and navigation.
- **Consistency:** Both integrations now use `pricingConfig.maxOrderQty`; the previous admin hardcoded limit of 10 was removed.

### 12. `CartRail`, `CartLineItem`, and `AiCartStrategistCard`
- **Files:** `features/customer-ordering/components/CartRail.tsx`, `CartLineItem.tsx`, `AiCartStrategistCard.tsx`, `lib/cart-rail.ts`
- **Role:** Shared customer cart presentation for both giant workspaces, including order mode, line items, totals, delivery label, AI cart strategist copy/action, and checkout CTA.
- **Boundary:** Parent workspaces still own pricing calculation, cart mutation, AI cart-insight fetches, validation, toasts, and navigation.
- **R11 state polish:** `AiCartStrategistCard` uses shared skeleton loading and `aria-busy` while cart insight is being generated.
- **Cash clarity (2026-07-23):** Guest vs member messaging uses `pricingConfig.guestCashAllowed`; sign-in CTA only when Cash requires login; empty-cart copy is outlet-honest (no AI speak).
- **Tests:** `lib/cart-rail.test.ts` covers cart line summaries, missing menu references, delivery-fee labels, and guest/member cash policy helpers.

### 13. `RecommendationLane`
- **File:** `features/customer-ordering/components/RecommendationLane.tsx`
- **Role:** Shared recommendation presentation for loading, empty (no picks), single/multiple recommendations, unavailable recommendation items, refresh action, build action, and browse-menu action.
- **Boundary:** Parent workspaces still own recommendation fetches, store writes, fallback behavior, and builder opening.
- **R11 polish:** Uses the shared `Skeleton` primitive while recommendation data is loading.
- **Honesty (2026-07-23):** Empty EmptyState when no picks; unavailable items show “Unavailable on menu” and disabled Build; all-unavailable banner when every pick is off-menu.
- **Presentation polish (2026-07-23):** Clearer section intro (source eyebrow + pick count title); every pick renders as a card with honest `reason` why-text when present; Build CTAs read “Build combo” / “Build this combo”; lane-local skeleton mirrors card rows; `FadeInUp` + `StaggerContainer`/`StaggerItem` with reduced-motion respect; `aria-live` / `aria-busy` / status text kept for async.

### 13b. `CheckoutEmptyPanel`
- **File:** `features/checkout/components/CheckoutEmptyPanel.tsx`
- **Role:** In-shell Checkout tab bridge when cart is empty — “Add a pizza first” + Browse menu (not toast-only).
- **Boundary:** Parents (`CustomerShell`, admin view-as-customer) set `step=checkout` when cart empty; with items they still route to `/payment`.

### 14. `CustomerFlowTabs`
- **File:** `features/customer-ordering/components/CustomerFlowTabs.tsx`
- **Role:** Shared customer ordering step tabs with tab semantics for intake, recommendation, menu, checkout, and tracking.
- **Boundary:** Parent workspaces own transition validation and route navigation.
- **Polish (2026-07-23):** Numbered stepper (`flow-tabs--stepper`); Details tab label is **Guest details** vs **Your details** from `customerLoggedIn`; `aria-current="step"` on active tab; `:focus-visible` rings.

### 15. `AdminTabNav`
- **File:** `features/admin-dashboard/components/AdminTabNav.tsx`
- **Role:** Shared admin tab navigation for overview, orders, menu, settings, forecast, and AI.
- **State:** `/admin-dashboard` keeps URL-backed tab state through `selectAdminTab`; the Stage3 duplicate keeps local tab state.

### 16. `AdminMenuWorkspace`
- **File:** `features/admin-dashboard/components/AdminMenuWorkspace.tsx`
- **Role:** Shared admin menu operations workspace for create-item flow, image upload, AI copy polish, and row-level pizza/base/topping editing.
- **Boundary:** Parent workspaces still own menu draft state, row-save logic, upload/save API calls, and toast behavior.

### 17. `AdminSettingsWorkspace`
- **File:** `features/admin-dashboard/components/AdminSettingsWorkspace.tsx`
- **Role:** Shared owner configuration workspace for brand, financial, and delivery-policy controls.
- **Boundary:** Parent workspaces still own apply/save behavior, preview toasts, Supabase persistence, and pricing mutation helpers.

### 18. `CustomerIntakeForm`
- **File:** `features/customer-ordering/components/CustomerIntakeForm.tsx`
- **Role:** Shared customer intake form for name, phone, address, delivery zone, validation errors, and continue action.
- **Notes:** Fields use real empty `value`s with muted placeholders (not seeded demo text). Labels are visible; errors sit under each field with `aria-invalid` / `role="alert"`. Manual save soft-defaults the shell step to Menu.
- **Boundary:** Parent workspaces still own validation, customer draft state, step transition, toast behavior, and routing.

### 19. `AdminOrdersWorkspace` and `OrderTable`
- **Files:** `features/admin-dashboard/components/AdminOrdersWorkspace.tsx`, `features/admin-dashboard/components/OrderTable.tsx`
- **Role:** Shared admin orders table/workspace with compact and detailed table variants plus selected-order detail composition.
- **Boundary:** Parent workspaces still own admin auth, filters, pagination, URL-backed selected order state, refresh state, and Supabase/API calls.
- **R11 state polish:** Order table supports skeleton loading rows and a neutral empty state; admin API errors remain separate red error banners.
- **Safety:** No rider, ETA, map, delivery tracking, SQL, or RLS behavior is added by this extraction.

### 20. `AppHeader` + `ThemeToggle`
- **Files:** `components/AppHeader.tsx`, `components/ThemeToggle.tsx`
- **Role:** Sticky frosted header for CustomerShell and admin dashboard; daisyUI theme toggle writes `html[data-theme]` (`slicematic` / `slicematic-dark`).
- **Polish (2026-07-23):** Guest session chip reads **Guest · Sign in** and soft-gates via `onOpenAccount`; member chip opens Account; token-based `.app-header__*` CSS (dark-mode safe); `useReducedMotion` on nav motion; shared `:focus-visible` rings; ThemeToggle drops daisyUI btn classes that fought focus styles, adds `aria-pressed`.

---

## Key UI Sections (Account Page)

## Import Dependency Map

```
app/page.tsx
  → components/SliceMaticStage3.tsx
    → lib/pricing.ts
    → lib/customer-flow.ts
    → lib/seed-data.ts
    → lib/session-customer.ts
    → lib/types.ts
    → lib/store.ts
    → components/CustomerOrderHistoryTable.tsx
    → components/admin/ForecastPanel.tsx
    → components/admin/RecommendationAIPanel.tsx
    → lucide-react (icons)
    → recharts (charts)

app/admin-dashboard/page.tsx
  → (same imports as SliceMaticStage3.tsx — kept in sync)
```

---

*Last updated: 2026-07-06*
