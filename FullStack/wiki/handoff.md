---
title: SliceMatic Session Handoff
type: handoff
status: active
last_updated: 2026-07-23
---

# SliceMatic Session Handoff

Read [[index]] first. Durable delivery design now lives in [[delivery-operations]] and `FullStack/plans/fullstack-delivery-intelligence-sprints.md`. **Active next queue:** `FullStack/plans/2026-07-21-next-horizon-sprint-plan.md` (R13 done → R12 mostly done → **S0 next**; confirmation UX honesty pass done).

## Latest work

- **Unnecessary screenshot cleanup (2026-07-23):** Deleted 13 PNGs under `wiki/assets/ui-map/` — stale pre–Landing R1 walkthrough shots (`walkthrough_01*`), misnamed `walkthrough_07_*` payment duplicates, and orphaned historical duplicates with zero doc refs. Kept walkthrough 02–06 / 08–21 + canonical baselines still linked from [[ui-map]] / plans. Landing rows in ui-map now say pending re-capture (no dangling paths). 48 PNGs remain.
- **Landing R1 creative rebuild (2026-07-23):** `MarketingLanding` fully rebuilt as a cinematic Delhi night-delivery story. Brand-first full-bleed hero (budget preserved), then Order → Kitchen → Rider through Delhi → Doorstep narrative + illustrated Signature slices. `lenis` smooth scroll synced to GSAP `ScrollTrigger`; `MotionPathPlugin` rides a scooter along a road ribbon; committed Lottie (`public/lottie/pizza-spin.json`, `steam.json`) via `lottie-react` in `LottieMount` with SVG fallback + reduced-motion. All screenshot/photo art removed — 100% SVG/CSS/Lottie illustration (Delhi skyline, Yamuna, rider). Fonts: Unbounded + Hanken Grotesk. Motion/Lenis stay landing-only (nothing on `/signin`, checkout, admin, shell). New dep `lottie-react`; `tsc` clean; browser-verified. **Next:** optional ui-map PNG re-capture of the new landing; S0 ADR.
- **Customer FE polish pass (2026-07-23):** MenuCatalog house picks + menu loading skeletons; CustomerFlowTabs numbered Guest/Your details stepper; AppHeader Guest · Sign in + focus rings / reduced-motion; ThemeToggle focus-safe. Avoided landing / recs / admin AI. **Next:** Landing R1 / S0 ADR; optional menu walkthrough PNG re-capture.
- **RecommendationLane richer presentation (2026-07-23):** Walkthrough deferred FE polish — intro hierarchy, honest why-text, clearer Build CTAs, skeleton/motion polish; empty/unavailable honesty unchanged. Screenshot refresh deferred.
- **Ops briefing honesty (2026-07-23):** Overview + AI tab no longer show invented shift advice when LLM is missing/failed; clear degraded/empty/error states; KPIs/charts/orders remain usable.
- **Landing signature pizzas strip (2026-07-23):** Marketing `/` now has a below-fold Signature pizzas band (seed P2/P8/P7/P1 + menu photography + `/signin` CTA). Hero budget untouched. Trust section still deferred; GSAP/Lenis still Landing R1.
- **Walkthrough-fix reconcile (2026-07-23):** Parallel-agent FE fixes verified intact (guest Account→`/signin`, intake empty defaults, Account honesty, Smoked Paprika + Orders loading skeleton, Rec/Cart/CheckoutEmptyPanel). Only collision remnant: `store.test.ts` still seeded `deliveryZone: "2-4"` — aligned to empty `initialCustomer`. Tests **124/124**, `tsc --noEmit` clean. **Next:** Landing R1 / S0 ADR.
- **Paprika typo + Orders seed flash (2026-07-23):** FE seed T11 is `Smoked Paprika`. Admin Orders uses summary status + skeleton / “Loading orders…” (no seed-until-refresh flash). **Next:** Landing R1 / S0 ADR (or live DB rename if remote topping still misspelled).
- **FE clarity fixes from walkthrough (2026-07-23):** RecommendationLane empty/unavailable honesty (disabled Build + labels); CartRail guest vs member cash copy (`guestCashAllowed`); Checkout tab empty cart shows `CheckoutEmptyPanel` instead of toast-only (CustomerShell + admin view-as-customer). Tests: `cart-rail.test.ts` cash policy helpers.
- **Account panel honesty (2026-07-23):** No harsh “No customer ID” error before `customer_id` exists (friendly empty state). Quick actions: Continue ordering = workspace switch; Use saved profile = sessionStorage only (toast if missing, no Aarav); Rebuild = last cart line or last-order menu name-match (disabled + helper otherwise).

- **Customer intake empty vs placeholder (2026-07-23):** Guest address/zone no longer pre-seeded as filled values; muted placeholders + field-level validation; manual details save soft-defaults to Menu.
- **Guest Account soft-gate fix (2026-07-23):** Guest Account no longer calls `onUnauthorize` → MarketingLanding (sticky half-auth). Guests soft-gate to `/signin`; `/signin` allows `logged_in=false` through to EntryPortal; members still open Account workspace.
- **Full UI walkthrough + screenshots (2026-07-23):** Live pass of marketing `/`, `/signin`, guest CustomerShell (menu/signature pizzas/recs/details/cart→`/payment`), admin tabs (Overview→Settings incl. Menu Create pizza/bases/toppings + Settings Brand/Financials/Delivery), Account quick actions, View as Customer. Assets: `wiki/assets/ui-map/walkthrough_*.png`; section in [[ui-map]].
- **Customer anti-slop follow-through (2026-07-23):** Extended taste-skill past EntryPortal. Customer hero/rail no longer says “Elite delivery OS” / “Operating signals” / “AI pairings” / demand-forecast ops speak; outlet-honest copy in both `CustomerShell` and `admin-dashboard` customer workspace. RecommendationLane / MenuCatalog Customize / account pick lost Sparkles+indigo AI tells; layout meta de-AI’d. EntryPortal: autocomplete, `role="alert"`, focus-visible. `tsc` clean.
- **Admin Overview craft rebuild via interface-design (2026-07-23):** `/design-review` blockers fixed on `AdminOverviewPanel` — revenue hero + demoted stats, tomato-only accent (no indigo/rainbow), briefing as inset workbench above charts, `--sui-*` CSS (no inline hex soup), `StatusPill`/`Button`, ≤280ms motion + `useReducedMotion`, tabular-nums, removed fake ArrowUpRight + trophy emoji. **Next:** optional live PNG re-capture of admin overview; S0 ADR / RLS / map scorecard.
- **Landing vision final + Tailwind/daisyUI (2026-07-23):** Reversed Tailwind deferral. Installed Tailwind v4 + daisyUI 5 with themes `slicematic` / `slicematic-dark`. Thin marketing shell on `/` (Sign in → `/signin` EntryPortal OTP). Final docs: `plans/landing-page-vision.md` (Lenis+GSAP R1; Anime optional) + `plans/2026-07-23-frontend-design-decisions.md`. Cinematic GSAP/Lenis not installed yet (Landing R1). **Next:** Landing R1 motion or S0 ADR.
- **Frontend-only polish wave (2026-07-23):** Closed R12 P0; P1 fetchJson/partialize/lazy panels/admin glass; ThemeToggle. Backend-coupled FE skipped.
- **EntryPortal taste-skill redesign pass (2026-07-23):** Ran `redesign-existing-projects` / `design-taste-frontend` audit-first on `/` auth gate. Fixed AI-copy tells ("elite AI pairings", "premium members", "SliceMatic Portal"), brand-first `h1`, `100dvh` viewport, `prefers-reduced-motion` on logo pulse, quieter OTP/rate-limit copy. Preserve-mode: no stack rewrite, tokens kept.
- **Confirmation UX audit via ui-ux-pro-max (2026-07-23):** Ran Food Delivery / Next.js design-intelligence review on `/confirmation`. Fixed P0 honesty gaps: `DeliveryMapFallback` no longer invents “searching for rider / live tracking shortly”; journey maps status `delivery`; hero discloses recorded-status-only; receipt a11y/focus/touch; loading skeleton aligned to live layout. Ranked findings + map bake-off UX criteria written under S0-04 addendum in next-horizon sprint plan. No schema / no live GPS.
- **R13+R12 close-out (2026-07-21 evening):** Continued stabilize + polish without schema changes.
  - Docs/rules: Stage3 dual-file retired in architecture, knowledge-graph, source-map, decisions ADR-001/004, contradictions, `.agents/AGENTS.md`, `.cursor/rules/slicematic.mdc`; ui-map admin shots retargeted to `admin-*.png`.
  - R12: menu badge overlay, stepper hit area, journey current-step highlight, `useReducedMotion` on OCP + admin tabs, Skeleton-based route loaders, OCP `<dl>` facts.
  - Verification: three test passes at **118/118**; review agent no findings.
  - **Next:** S0-01 Delivery ADR, S0-02 RLS design (draft only), S0-04 map scorecard. No live GPS. No `schema.sql` apply without ADR.

- **R13 Stabilize (2026-07-21):** Security/honesty gate without schema changes.
  - `GET /api/admin/orders` now calls `requireAdminSession` before `loadAdminSummary` / CSV; tests added.
  - `/admin-dashboard` gates ops UI on `adminLoggedIn` (EntryPortal remains sole login form).
  - `OrderTable` no longer fabricates Delivery/Rider/ETA (`Pending`/`Unassigned`).
  - Admin line hydration capped to 50 recent IDs against existing `slicematic.order_item` columns only.
  - Next-horizon sprint plan written; parent sprint file points to it for “what’s next.”
  - **Did not** modify `supabase/schema.sql`. Delivery S0+ still gated.

- **Security & UX Fixes (2026-07-18 01:12 IST):** Three production bugs fixed + two UI revamps shipped.
  - **FIX — Holistic admin logout:** `adminLogout()` in `useAdminAuth.ts` now clears all 8 `sessionStorage` keys (was only clearing 2 admin keys). The 6 customer keys (`slicematic_customer_logged_in`, `slicematic_customer_email`, `slicematic_customer`, `slicematic_customer_id`, `slicematic_workspace`, `slicematic_admin_view_customer`) were being left behind, causing the page to render the customer UI instead of `EntryPortal` after admin logout. Logout button now passes `() => router.replace("/")` as the `onUnauthorize` callback so the redirect happens after all keys clear.
  - **FIX — Admin console tab hidden from customers:** Added `isAdminUser?: boolean` prop to `AppHeader`. `CustomerShell` passes `false`; admin dashboard passes `adminAuth.adminLoggedIn`. Regular customers never see the Admin console tab.
  - **REVAMP — Premium navbar (AppHeader):** Full Framer Motion redesign — frosted-glass sticky header, SliceMatic logo mark (animated entry), sliding pill nav with `layoutId="nav-active-pill"` spring animation, `whileTap` press feedback on all tabs, `AnimatePresence` session chip (color-coded: red=admin, green=customer, neutral=guest), `aria-current` for a11y.
  - **REVAMP — Customer account dashboard (CustomerAccountPanel):** Premium glassmorphic layout — animated avatar circle (spring bounce on mount), stats strip (total orders, total spent, last order date), 2-column row with quick-action card + AI recommendation card (`AnimatePresence` between found/empty states), full-width order history card with count badge and spinner. Stagger entry via Framer Motion `variants`. All auth screens (login/OTP/forgot/reset) preserved exactly.
  - TypeScript: 0 errors after all changes.

- **UI Revamp Execution (2026-07-17):** Implemented the full premium design system and transformed customer-facing screens.
  - Extended `globals.css` with 100+ semantic tokens (glassmorphism, warm food palette, motion timing, typography scale).
  - Created 9 named skeleton components, EmptyState/SuccessCheckmark/QuantityStepper/TagChip/ReasonTag/FilterChip/ExceptionChip/PaymentTile/AiServiceCard primitives.
  - Built framer-motion animation wrappers (FadeInUp, ScaleIn, SlideUp, StaggerContainer, ModalOverlay, NumberCrossfade).
  - Rewrote EntryPortal CSS with glassmorphism backdrop-filter, warm dough gradients, pizza watermark SVG.
  - Transformed MenuCatalog: search bar, FilterChip categories, staggered card entrance, add-to-cart bounce animation, skeleton loading, empty state.
  - Transformed PizzaBuilderDialog: mobile bottom-sheet with drag handle, hero image, selection tiles, QuantityStepper, sticky footer with live price.
  - Enhanced CartRail: EmptyState illustration, item count badge, discount highlight, design system buttons.
  - Enhanced RecommendationLane: ReasonTag chips, numbered rank badges, RecommendationSkeleton loading.
  - Upgraded CheckoutSummary: 2-column layout, PaymentTile selection, sticky order summary, spinner in place-order button.
  - Rewrote confirmation page: animated SuccessCheckmark SVG, centered hero, kitchen illustration, collapsible receipt accordion.
  - Added CSS: confirmation hero, bottom sheet (mobile→centered desktop dialog), SUI button system, filter bar search, stagger animation, section headings, cart badge, checkout sticky, cart-bounce keyframe.
  - Extracted `lib/auth-actions.ts` (admin/customer login, OTP, password reset, sign out).
  - Extracted `lib/admin-actions.ts` (summary, menu CRUD, order status, AI copy, ops briefing, CSV, image upload).
  - Extracted `features/checkout/hooks/useCheckoutActions.ts` (all 3 payment flows).
  - Extracted `features/customer-ordering/hooks/useCustomerFlow.ts` (cart insight, recommendation refresh).
  - Extracted `features/admin-dashboard/hooks/useMenuAdmin.ts` (inline edit, draft, baseline, image upload).
  - TypeScript compiles clean (0 errors).- Audited the unused `customer_activity` and `customer_preference` schema and existing post-order flow.
- Compared live-delivery patterns, Google Maps, Mapbox, HERE, MapLibre/OSM, and Supabase Realtime through specialist research.
- Created a five-sprint implementation backlog for preference/activity utilization, dispatch, rider fees, ETA, live tracking, proof, privacy, and rollout.
- Chose Google Maps + private Supabase Broadcast as the provisional India MVP stack, subject to a Delhi address/route bake-off.
- Extended the sprint with the existing Random Forest refresh workflow, a grounded dashboard menu voice assistant, UI/server segregation, and separate AI and Forecast services.
- Added a dedicated map/geocoding/routing API comparison: Google, TomTom, Geoapify, LocationIQ, Mapbox, MapTiler/MapLibre, open/self-hosted, and HERE restrictions.
- Finalized the low-cost map direction: Google India for the MVP within free caps, Mappls and Mapbox as bake-off challengers, OR-Tools for batching, private realtime for GPS, and an OSRM/MapLibre scale path.
- Captured a live UI baseline in [[ui-map]] with screenshots for admin tabs, nested menu/settings screens, customer menu/recommendations/details, AI Cart Strategist, customize modal, payment checkout, and confirmation tracking.
- Verified the cash test path reaches `/confirmation`; the new test order appears in Admin Orders and the current tracking page is simulated/static.
- Consolidated active planning/wiki work under `FullStack/` after root noise was removed.
- Created a screenshot-backed UI revamp implementation plan for customer ordering, admin operations, delivery tracking, AI surfaces, dispatch, rider PWA, and forecast refresh.
- Updated the project rules to allow a deliberate modern UI stack: Tailwind CSS v4 or equivalent design-system primitives, skeleton loaders, customer-facing illustrations, polished motion, and reduced-motion/accessibility guardrails.
- Expanded the UI revamp plan and wiki summary with modern styling migration rules, required skeleton components, motion guidance, image/illustration direction, and customer/admin polish expectations.
- Added `FullStack/plans/ui-inspiration-research.md` as the pre-implementation inspiration board for Apple-like admin UI, checkout/payment, confirmation/tracking, skeletons, motion, illustrations, and design decisions.
- Extended the inspiration board with delivery/confirmation sources and an admin cockpit addendum: right-side order context drawer, lifecycle-first confirmation, fee/ETA transparency, and honest no-map fallback.
- Updated [[css-system]] so the old "NO Tailwind" rule is clearly marked historical and the current token/component bridge is documented.
- Added `FullStack/plans/frontend-architecture-restructure.md` as the solution/frontend architecture plan for splitting giant files, route composition, feature folders, store persistence, URL state, and performance.
- Added `FullStack/plans/database-schema-evolution-plan.md` as the Supabase schema and RLS evolution plan for customer auth ownership, preferences/activity, delivery quotes, riders, tracking, forecast runs, AI logs, and production-safe policies.
- Completed Revamp Sprint R1 checkout/session foundation:
  - Added `lib/session/storageKeys.ts`.
  - Added `lib/session/checkoutSession.ts`.
  - Added focused checkout session tests.
  - Updated `/payment` to use checkout helpers for member/guest identity and Cashfree return recovery.
  - Updated store/session-customer helpers to use centralized storage keys.
  - Removed stale "vanilla CSS only" constraints from wiki guidance.
  - Updated sprint docs with the revamp branch execution overlay.
- Completed Revamp Sprint R2 checkout component extraction:
  - Added `features/checkout/components/CheckoutSummary.tsx`.
  - Updated `/payment` so the route owns data/payment side effects and the feature component owns the checkout review/payment UI.
  - Preserved existing CSS classes, business-rule totals, and payment behavior.
  - Full tests and TypeScript pass after extraction.
- Completed Revamp Sprint R3-R6 batch foundation:
  - Added `components/ui` primitives: `Button`, `Card`, `Skeleton`, and `StatusPill`.
  - Added `sui-*` CSS bridge tokens/classes and reduced-motion support in `app/globals.css`.
  - Added forecast refresh/status/skeleton pilot to `components/admin/ForecastPanel.tsx`.
  - Passed admin auth headers into `ForecastPanel` from both `app/admin-dashboard/page.tsx` and `components/SliceMaticStage3.tsx`.
  - Started payment pilot by moving `CheckoutSummary` actions/surfaces to the new primitives without changing payment behavior.
  - Added URL-backed admin tab state for `/admin-dashboard?tab=...`.
  - Added `lib/delivery-state.ts` and tests as the future delivery tracking state contract scaffold.
- Finished Revamp R5 confirmation and the R6 admin order-context slice:
  - Added the reusable, tested `OrderJourneyRail` and integrated it into `/confirmation`.
  - Removed the simulated route, named rider, and invented ETA from customer confirmation.
  - Added selectable admin order rows and `OrderContextPanel` in both duplicated admin surfaces.
  - Added URL-backed `/admin-dashboard?tab=orders&order=...` selection while keeping the Stage3 duplicate local.
  - Kept delivery tracking honest and made no SQL, RLS, realtime, provider, or dispatch API changes.
- Completed Revamp R7A customer menu extraction:
  - Added shared `MenuCatalog` and tested menu filtering/starting-price helpers.
  - Added controlled, accessible `PizzaBuilderDialog`.
  - Replaced duplicated menu and builder JSX in both giant workspaces.
  - Normalized both builder copies to `pricingConfig.maxOrderQty` while leaving business mutations in the parents.
- Consolidated the next-plan decision into `FullStack/plans/fullstack-delivery-intelligence-sprints.md`:
  - This file is now the single operational sprint source of truth for the revamp and delivery-intelligence roadmap.
  - `frontend-architecture-restructure.md`, `ui-revamp-implementation-plan.md`, `ui-inspiration-research.md`, `ui-ux-improvement-plan.md`, and `database-schema-evolution-plan.md` remain reference inputs.
  - Added the R8-R11 frontend-first queue, R8 acceptance criteria, backend gates, and missing edge cases.
- Completed Revamp R8 cart and recommendation extraction:
  - Added shared `CartRail`, `CartLineItem`, `AiCartStrategistCard`, and `RecommendationLane`.
  - Added `lib/cart-rail.ts` plus tests for line summaries, missing menu references, and delivery labels.
  - Replaced duplicated cart/recommendation/AI cart strategist JSX in both giant workspaces.
  - Preserved pricing, cart mutation, AI/recommendation fetches, routing, toasts, validation, and Zustand writes in the parents.
  - Started R9/R10/R11 safely with `CustomerFlowTabs`, `AdminTabNav`, and recommendation skeleton loading.
  - No SQL, RLS, map, rider, realtime, or delivery API changes were made.
- Continued Revamp R9-R10 frontend extraction:
  - Added shared `CustomerIntakeForm` and replaced duplicated customer intake JSX in both giant workspaces.
  - Added shared `AdminOrdersWorkspace` and `OrderTable` for admin orders presentation, with selected-order detail composition.
  - Kept filters, pagination, admin refresh state, URL state, validation, and data fetching in parent workspaces.
  - Verified `npx tsc --noEmit` and full `npm run test` 114/114.
  - No SQL, RLS, map, rider, realtime, or delivery API changes were made.
- Closed the R9/R10 cleanup and R11 state-polish pass:
  - Removed the stale route-local admin order table tail from `app/admin-dashboard/page.tsx`; admin order rows now have a single shared implementation.
  - Added admin order loading skeleton rows and a neutral empty-order state.
  - Added AI cart strategist skeleton loading and `aria-busy` while insight generation is pending.
  - Verified `npx tsc --noEmit`, full `npm run test` 114/114, and `git diff --check`.
  - No SQL, RLS, map, rider, realtime, or delivery API changes were made.
- Continued the frontend architecture extraction:
  - Added shared `AdminMenuWorkspace` and `AdminSettingsWorkspace`.
  - Replaced duplicated admin `menu` and `settings` JSX in both giant workspaces.
  - Preserved route-specific apply behavior: live Supabase apply on `/admin-dashboard`, preview toast in the embedded Stage3 admin view.
  - Verified `npx tsc --noEmit` and full `npm run test` 114/114.
  - No SQL, RLS, map, rider, realtime, or delivery API changes were made.
- **Monolith Extraction (2026-07-18):** Reduced both giant files by 70-75% using dedicated hooks and components.
  - Created `useAdminAuth`, `useAdminSession`, `useCustomerAuth`, `useOrderHistory` hooks — all auth/session/data logic now fully outside render components.
  - Created `AdminAuthPanel`, `CustomerAccountPanel`, `AppHeader` as pure presentational components.
  - `SliceMaticStage3.tsx`: 2437 → 733 lines (−70%). Now a thin shell: imports hooks + components + wires JSX.
  - `app/admin-dashboard/page.tsx`: 2461 → 626 lines (−75%). Same hook pattern; preserves URL tab sync, live data refresh (visibilitychange/focus), brand fetch on mount, order URL tracking.
  - Dead code removed: `{false && <section>}` block and orphaned `AdminOverview` function.
  - Dual-File Rule: both files updated in the same session.
  - TypeScript: `npx tsc --noEmit` clean — 0 errors.

## Files changed

- `FullStack/plans/fullstack-delivery-intelligence-sprints.md`
- `FullStack/plans/ui-revamp-implementation-plan.md`
- `FullStack/plans/ui-inspiration-research.md`
- `FullStack/plans/frontend-architecture-restructure.md`
- `FullStack/plans/database-schema-evolution-plan.md`
- `FullStack/wiki/delivery-operations.md`
- `FullStack/wiki/index.md`
- `FullStack/wiki/source-map.md`
- `FullStack/wiki/log.md`
- `FullStack/wiki/handoff.md`
- `FullStack/wiki/ui-revamp-roadmap.md`
- `FullStack/wiki/css-system.md`
- `FullStack/wiki/ai-microservices.md`
- `FullStack/wiki/ui-map.md`
- `FullStack/wiki/assets/ui-map/*.png`
- `FullStack/lib/session/storageKeys.ts`
- `FullStack/lib/session/checkoutSession.ts`
- `FullStack/lib/session/checkoutSession.test.ts`
- `FullStack/app/payment/page.tsx`
- `FullStack/lib/store.ts`
- `FullStack/lib/store.test.ts`
- `FullStack/lib/session-customer.ts`
- `FullStack/features/checkout/components/CheckoutSummary.tsx`
- `FullStack/components/ui/Button.tsx`
- `FullStack/components/ui/Card.tsx`
- `FullStack/components/ui/Skeleton.tsx`
- `FullStack/components/ui/StatusPill.tsx`
- `FullStack/components/ui/index.ts`
- `FullStack/components/admin/ForecastPanel.tsx`
- `FullStack/components/SliceMaticStage3.tsx`
- `FullStack/app/admin-dashboard/page.tsx`
- `FullStack/app/globals.css`
- `FullStack/lib/admin-tabs.ts`
- `FullStack/lib/delivery-state.ts`
- `FullStack/lib/delivery-state.test.ts`
- `FullStack/features/order-tracking/orderJourney.ts`
- `FullStack/features/order-tracking/components/OrderJourneyRail.tsx`
- `FullStack/lib/order-journey.test.ts`
- `FullStack/components/admin/OrderContextPanel.tsx`
- `FullStack/app/confirmation/page.tsx`
- `FullStack/features/menu/components/MenuCatalog.tsx`
- `FullStack/features/menu/components/PizzaBuilderDialog.tsx`
- `FullStack/features/menu/components/index.ts`
- `FullStack/features/customer-ordering/components/CustomerIntakeForm.tsx`
- `FullStack/features/admin-dashboard/components/AdminOrdersWorkspace.tsx`
- `FullStack/features/admin-dashboard/components/OrderTable.tsx`
- `FullStack/features/admin-dashboard/components/AdminMenuWorkspace.tsx`
- `FullStack/features/admin-dashboard/components/AdminSettingsWorkspace.tsx`
- `FullStack/features/admin-dashboard/components/index.ts`
- `FullStack/features/customer-ordering/components/AiCartStrategistCard.tsx`
- `FullStack/features/customer-ordering/components/CartLineItem.tsx`
- `FullStack/features/customer-ordering/components/CartRail.tsx`
- `FullStack/features/customer-ordering/components/CustomerFlowTabs.tsx`
- `FullStack/features/customer-ordering/components/RecommendationLane.tsx`
- `FullStack/features/customer-ordering/components/index.ts`
- `FullStack/features/admin-dashboard/components/AdminTabNav.tsx`
- `FullStack/lib/menu-catalog.ts`
- `FullStack/lib/menu-catalog.test.ts`
- `FullStack/lib/cart-rail.ts`
- `FullStack/lib/cart-rail.test.ts`
- `FullStack/wiki/state-management.md`
- `FullStack/wiki/components.md`
- `FullStack/wiki/decisions.md`
- `FullStack/wiki/scripts-tooling.md`
- `AGENTS.md`
- `CLAUDE.md`
- `FullStack/features/admin-dashboard/hooks/useAdminAuth.ts` (NEW)
- `FullStack/features/admin-dashboard/hooks/useAdminSession.ts` (NEW)
- `FullStack/features/customer-ordering/hooks/useCustomerAuth.ts` (NEW)
- `FullStack/features/customer-ordering/hooks/useOrderHistory.ts` (NEW)
- `FullStack/features/admin-dashboard/components/AdminAuthPanel.tsx` (NEW)
- `FullStack/features/customer-ordering/components/CustomerAccountPanel.tsx` (NEW)
- `FullStack/components/AppHeader.tsx` (NEW)

FullStack application code was changed in Revamp Sprints R1-R8, with small R9/R10/R11 starter slices. No SQL schema was changed.

## Next action

**Active plan:** `FullStack/plans/2026-07-21-next-horizon-sprint-plan.md`

1. Start **S0-01** Delivery ADR (kitchen vs courier, fee v1, disclosure) — docs only.
2. Draft **S0-02** RLS/identity design (do not apply SQL until approved).
3. Prepare **S0-04** Delhi map bake-off scorecard.
4. Optionally close R12 leftovers (fresh screenshots, AdminOverview motion).
5. Keep `npm run test` green; never invent Delivery/Rider/ETA UI.

Do not implement precise rider tracking before:

1. Admin/customer/rider authorization and RLS are hardened.
2. Delivery and kitchen state transitions are approved.
3. The versioned fee/payout examples are approved.
4. An ordered migration strategy exists.
5. Google, Mappls, Mapbox, TomTom, and Geoapify are tested on representative Delhi addresses using the sprint scorecard.

Then execute modular extraction and contract tests before deploying recommendation/voice or forecasting as remote services. The existing forecast logic must remain behaviorally compatible during extraction.

## Existing verification baseline

- `npm run build`: passed on 2026-07-16.
- `npm run test -- lib/session/checkoutSession.test.ts lib/store.test.ts`: passed 12/12 on 2026-07-16 after R1.
- `npm run test`: passed 98/98 on 2026-07-16 after R1.
- `npm run test`: passed 98/98 on 2026-07-16 after R2.
- `npm run test`: passed 104/104 on 2026-07-16 after R3-R6 batch.
- `npm run test`: passed 107/107 on 2026-07-16 after R5 confirmation and R6 order context.
- `npm run test`: passed 111/111 on 2026-07-16 after R7A menu and builder extraction.
- `npm run test`: passed 114/114 on 2026-07-16 after shared admin menu/settings extraction.
- `npx tsc --noEmit`: passed on 2026-07-16 after R1.
- `npx tsc --noEmit`: passed on 2026-07-16 after R2.
- `npx tsc --noEmit`: passed on 2026-07-16 after R3-R6 batch.
- `npx tsc --noEmit`: passed on 2026-07-16 after R5 confirmation and R6 order context.
- `npx tsc --noEmit`: passed on 2026-07-16 after R7A menu and builder extraction.
- `npx tsc --noEmit`: passed on 2026-07-16 after shared admin menu/settings extraction.
- `npx tsc --noEmit`: passed on 2026-07-18 after monolith extraction (useAdminAuth/useAdminSession/useCustomerAuth/useOrderHistory + AdminAuthPanel/CustomerAccountPanel/AppHeader).
- Earlier full `npm test`: 92 passed, one `resetSession()` address assertion failed; R1 corrected that focused store assertion.

At the end of every material task, update affected pages and append to [[log]].
