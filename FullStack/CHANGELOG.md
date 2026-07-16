# FullStack Changelog & Troubleshooting Context

This file maintains a timestamp-based record of the modifications, debugging sessions, and environment fixes applied to the Slicematic FullStack project.

---

### [2026-07-16 16:09:52 IST] - Sprint control consolidation and R8-R11 planning
- Consolidated the active sprint decision into `plans/fullstack-delivery-intelligence-sprints.md` as the single operational sprint source of truth.
- Marked the other planning files as reference inputs for architecture, UI direction, visual inspiration, polish, and DB/RLS gates.
- Added the frontend-first R8-R11 sequence: cart/recommendation extraction, customer ordering shell cleanup, admin command/table workspace, and shared loading/empty/error/mobile polish.
- Added R8 component boundaries, parent-owned behavior rules, and edge cases for recommendations, AI cart strategist, max quantity, mobile cart reachability, and keyboard flow.
- Reconfirmed that DB/RLS, maps, rider tracking, and live dispatch remain gated until frontend decomposition and fallback contracts are ready.
- Files: plans/fullstack-delivery-intelligence-sprints.md, wiki/handoff.md, wiki/log.md, CHANGELOG.md

---

### [2026-07-16 15:55:42 IST] - Revamp R7A menu and pizza-builder extraction
- Used separate menu, builder, and architecture-audit agents, then integrated centrally under the Dual-File Rule.
- Added `MenuCatalog` with shared available-item/category/query filtering and focused helper tests.
- Added the controlled, accessible `PizzaBuilderDialog` while keeping cart mutation and validation in the parent workspaces.
- Replaced duplicated catalogue and builder JSX in both giant workspace files.
- Normalized the admin builder's stale hardcoded quantity limit to `pricingConfig.maxOrderQty`.
- Validation: full `npm run test` passed 111/111; `npx tsc --noEmit` and `git diff --check` passed.
- Files: features/menu/components/MenuCatalog.tsx, features/menu/components/PizzaBuilderDialog.tsx, features/menu/components/index.ts, lib/menu-catalog.ts, lib/menu-catalog.test.ts, components/SliceMaticStage3.tsx, app/admin-dashboard/page.tsx, plans/*, wiki/*

---

### [2026-07-16 15:33:38 IST] - Revamp R5 confirmation and R6 admin order context
- Finished the R5 confirmation lifecycle with a reusable `OrderJourneyRail`, deterministic state mapping, and focused tests.
- Replaced the simulated map, named rider, and invented ETA with explicit recorded-state and delivery-pending messaging.
- Finished the safe R6 order-context slice with selectable order rows, URL-backed `?tab=orders&order=...` state, and a responsive details panel.
- Applied the Dual-File Rule to both admin workspaces and kept delivery/RLS/API behavior unchanged.
- Removed the stale commented checkout fragment and corrected the sprint handoff.
- Validation: full `npm run test` passed 107/107; `npx tsc --noEmit` and `git diff --check` passed.
- Files: app/confirmation/page.tsx, app/payment/page.tsx, app/admin-dashboard/page.tsx, components/SliceMaticStage3.tsx, components/admin/OrderContextPanel.tsx, features/order-tracking/*, lib/order-journey.test.ts, app/globals.css, plans/ui-revamp-implementation-plan.md, wiki/*

---

### [2026-07-16 15:09:54 IST] - Revamp Sprint R3-R6 batch foundation
- Ran the next four revamp sprint slices as a batch with sprint-specific subagents and consolidated the safe landed work.
- R3 UI primitive bridge: added `components/ui` primitives (`Button`, `Card`, `Skeleton`, `StatusPill`) plus semantic `sui-*` CSS tokens/classes and reduced-motion support in `app/globals.css`.
- R4 Forecast pilot: added refresh action/state to `ForecastPanel`, including loading/success/failure status, skeleton fallback, previous-forecast preservation, and auth-header support for the existing `/api/admin/forecast/refresh` route.
- R5 Payment pilot: moved `CheckoutSummary` onto the new primitives for the payment action, basket remove action, payment card surface, and payment status pill without changing pricing or payment behavior.
- R6 Admin shell scaffold: added URL-backed admin tab parsing/selection so `/admin-dashboard?tab=forecast` can restore the forecast tab, and added a tested delivery-state contract scaffold for future dispatch/tracking controls.
- Dual-file rule: updated both `app/admin-dashboard/page.tsx` and `components/SliceMaticStage3.tsx` for the forecast panel auth-header prop.
- Validation: full `npm run test` passed 104/104; `npx tsc --noEmit` passed.
- Known cleanup: `app/payment/page.tsx` contains a non-rendering commented legacy fragment with corrupted ellipsis bytes from the pre-extraction block; safe at runtime and compile-time, but should be removed in a cleanup pass before push.
- Files: app/globals.css, components/ui/*, components/admin/ForecastPanel.tsx, features/checkout/components/CheckoutSummary.tsx, app/admin-dashboard/page.tsx, components/SliceMaticStage3.tsx, lib/admin-tabs.ts, lib/delivery-state.ts, lib/delivery-state.test.ts, plans/ui-revamp-implementation-plan.md, wiki/components.md, wiki/handoff.md, wiki/log.md, wiki/source-map.md

---

### [2026-07-16 14:49:26 IST] - Revamp Sprint R2 checkout component extraction
- Completed the next revamp implementation sprint by extracting the checkout review/payment decision surface into a feature component.
- Added `FullStack/features/checkout/components/CheckoutSummary.tsx` for basket lines, member/guest policy, bill totals, payment mode cards, payment action, and payment status rendering.
- Updated `/payment` so the route owns data, menu loading, pricing calculation, payment side effects, and navigation, while `CheckoutSummary` owns checkout UI rendering.
- Preserved existing business-rule totals, payment mode behavior, Cashfree/Razorpay flows, and CSS class names; no visual redesign was introduced in R2.
- Kept R3 as the next planned sprint: UI primitive bridge with semantic tokens, `Button`, `Card`, `Skeleton`, `StatusPill`, and reduced-motion rules.
- Verification: full `npm run test` passed 98/98; `npx tsc --noEmit` passed.
- Files: app/payment/page.tsx, features/checkout/components/CheckoutSummary.tsx, plans/ui-revamp-implementation-plan.md, plans/frontend-architecture-restructure.md, wiki/handoff.md, wiki/log.md, wiki/source-map.md

---

### [2026-07-16 14:25:39 IST] - Revamp Sprint R1 checkout/session foundation
- Completed the first revamp implementation sprint by centralizing browser storage keys and checkout payment-recovery helpers.
- Added `FullStack/lib/session/storageKeys.ts` for shared session/local storage key ownership.
- Added `FullStack/lib/session/checkoutSession.ts` and focused tests for member/guest checkout identity plus Cashfree pending-payment recovery.
- Updated `/payment` to use the checkout session helpers instead of raw customer/Cashfree storage strings.
- Updated `lib/store.ts`, `lib/session-customer.ts`, and `lib/store.test.ts` to use the centralized key constants and align the reset-session expectation with the actual initial customer draft.
- Removed stale "vanilla CSS only" guidance from wiki decisions/tooling; current direction is best-fit styling through a planned token/component bridge.
- Updated sprint planning docs so R1 is complete and R2/R3 are the next build slices.
- Verification: `npm run test -- lib/session/checkoutSession.test.ts lib/store.test.ts` passed 12/12; full `npm run test` passed 98/98; `npx tsc --noEmit` passed.
- Files: app/payment/page.tsx, lib/session/storageKeys.ts, lib/session/checkoutSession.ts, lib/session/checkoutSession.test.ts, lib/store.ts, lib/store.test.ts, lib/session-customer.ts, plans/ui-revamp-implementation-plan.md, plans/frontend-architecture-restructure.md, plans/fullstack-delivery-intelligence-sprints.md, wiki/css-system.md, wiki/decisions.md, wiki/scripts-tooling.md

---

### [2026-07-06 00:43:52] - Customer session and privacy hardening (TDD)

**Context:** A security audit found two real issues: (1) `GET /api/customer/profile` and `GET /api/customer/orders` had **zero authentication** — anyone who knew or guessed a customer's email/phone/`customer_id` could pull their full name, phone, email, and order history via curl; (2) `lib/store.ts`'s Zustand `persist()` defaulted to `localStorage` with no clearing on logout, so Customer A's cart/name/phone/address/last order stayed on a shared browser and leaked into Customer B's session on the same machine — even after Customer A logged out. This directly failed the `code-review-excellence` skill's own Security checklist ("Is authentication required where needed? Are authorization checks before every action?").

**Fix — JWT ownership checks (`lib/customer-auth.ts`, new):**
* Added `requireCustomerOwnership(request, { identifier?, customerId? })`, mirroring the existing `lib/admin-auth.ts` pattern: requires an `Authorization: Bearer <token>` header, resolves the requested identifier/`customer_id` to its `slicematic.customer.email`, and requires it to match the caller's verified Supabase JWT email (case-insensitive) — `401` if missing/invalid token, `403` on identity mismatch.
* The demo customer (`demo@slicematic.in` / phone `9999999999`) has no real Supabase session (hardcoded OTP `1111`), so it authenticates with a `demo-bypass` bearer token — **scoped only to its own identity**: `demo-bypass` + any other customer's email/phone/`customer_id` is rejected with `403`, so it cannot recreate the original vulnerability. Explicitly covered by tests.
* Wired into `app/api/customer/profile/route.ts`, `app/api/customer/orders/route.ts`, and (after audit) `app/api/customer/register/route.ts` (which previously let anyone probe whether an arbitrary email/phone was already registered and get back its `customer_id`).
* Updated client call sites — `components/EntryPortal/EntryPortal.tsx`, `lib/session-customer.ts`, `components/SliceMaticStage3.tsx` (`refreshCustomerOrders`), `app/admin-dashboard/page.tsx` (customer orders fetch) — to resolve and attach the bearer token (live Supabase access token, or `demo-bypass` for the demo identity) before calling the now-protected routes.

**Fix — sessionStorage + explicit reset (`lib/store.ts`):**
* Switched the `persist()` middleware's storage engine from the implicit `localStorage` default to `createJSONStorage(() => sessionStorage)` (isolated per tab, cleared when the tab closes).
* Added `resetSession()`, resetting `cart`, `customer`, `lastOrder`, `recommendation`, and `pricingConfig` back to their defaults. Wired as defense-in-depth (on top of the storage-engine change) into every customer/admin login and logout: `EntryPortal.tsx` (`saveSessionAndProceed`, `handleGuestLogin`), and `customerLogin`/`customerLogout`/`adminLogin`/`adminLogout` in **both** `components/SliceMaticStage3.tsx` and `app/admin-dashboard/page.tsx` (previously-inconsistent duplicates — `admin-dashboard`'s `customerLogout` cleared no session keys at all; now both clear the same set). `localStorage["cf_pending"]` (pending Cashfree payload) is also cleared on every logout.
* **Intentional behavior change:** cart/customer draft still survives an accidental page refresh mid-checkout (`sessionStorage` persists across refreshes in the same tab), but no longer survives closing the browser tab/window — the correct trade-off for a shared/public ordering device.

**Tests (TDD, red-green per slice):** `lib/customer-auth.test.ts` (11 tests: 401/403/200 matrix for identifier and `customer_id` targets, phone-to-email resolution, and the demo-bypass scoping matrix including the explicit "demo-bypass cannot fetch another customer's data" case), `app/api/customer/profile/route.test.ts`, `app/api/customer/orders/route.test.ts`, `app/api/customer/register/route.test.ts` (route-level wiring, auth helper mocked), and extended `lib/store.test.ts` (`resetSession()` behavior + sessionStorage-vs-localStorage engine assertion). Full suite: **84/84 passing** across 14 files.

**Docs:** Updated `README.md` with a new "Customer route authorization" and "Session storage change" section under Customer Authentication, and marked the three `/api/customer/*` routes "auth required" in the API table.

---

### [2026-07-06 00:40:00] - Admin Menu & Financials persistence fix (TDD)
**Context:** Audit found that Pizzas/Bases/Toppings catalogue edits never persisted to Supabase (local React state only, no Save action, no update endpoint), Financials/Create-Item/Image-upload silently failed to persist for the demo admin login (empty `adminAccessToken` meant the `authorization` header was omitted entirely, the server 401'd, and the client never checked `response.ok`), and image upload wrote to the local filesystem (`fs/promises` `writeFile`), which does not work on Vercel's read-only serverless filesystem.
**Root causes fixed:**
1. No update endpoint existed for editing an existing pizza/base/topping (only create).
2. No client-side Save action was wired up for catalogue edit fields.
3. Demo-admin session never sent a usable auth token, and failures were silently swallowed in `persistOutletPricing`, `addMenuItem`, and `uploadMenuImage`.
4. Image upload wrote to local disk instead of a durable, CDN-served store.
**Changes & Fixes:**
* **New `PATCH /api/admin/menu`** (`app/api/admin/menu/route.ts`): validates `{ section, id, item }`, reuses the POST route's name/price validation (extracted into `validateItemFields`), updates the matching Supabase row (`.update(...).eq(id, ...).select("*").single()`), and falls back to an optimistic in-memory patch when Supabase isn't configured (demo mode, mirrors the existing `createDemoItem` POST fallback).
* **`adminAuthHeader()` helper** added to both `app/admin-dashboard/page.tsx` and `components/SliceMaticStage3.tsx` (duplicated per the two-file architecture): resolves to the real Supabase Auth bearer token when present, otherwise falls back to the server's `demo-bypass` token when the admin is logged in via the demo flow. Replaces the ad-hoc `adminAccessToken ? {...} : undefined` checks in `addMenuItem`, `uploadMenuImage`, `persistOutletPricing`, and `generateMenuCopy` in both files — the demo admin login now actually reaches Supabase-backed routes instead of silently no-op'ing or 401'ing.
* **Surfaced save failures:** `persistOutletPricing` now checks `response.ok`/`result.ok` and toasts on failure instead of swallowing 401s silently; `addMenuItem` and `uploadMenuImage` now also check `response.ok` in addition to the existing `result.ok` check.
* **Per-row Save UI** for Pizzas/Bases/Toppings catalogue rows (both files): a `menuBaseline` snapshot (captured on initial `/api/menu` load and refreshed after each successful save/create) is diffed against live row state to compute a per-row dirty flag; a `.row-save-btn` next to each row's Available checkbox shows idle/dirty/saving/saved/error states and PATCHes only that row via `adminAuthHeader()`.
* **`.row-save-btn` styles** added to `app/globals.css` using existing design tokens (`--gold`-tinted dirty, `--blue`-tinted saving, `--basil`-tinted saved, `--tomato`-tinted error), and `.menu-editor article`/`article.compact` grid templates extended with a 5th column for the button.
* **Image upload moved to Supabase Storage** (`app/api/admin/upload/route.ts`): now uploads to the `menu-images` bucket via `getSupabaseServerClient().storage.from("menu-images").upload(...)` (service-role client bypasses Storage RLS) and returns `getPublicUrl(...)` instead of a local `/uploads/...` path; kept the same JPG/PNG/WEBP/GIF + 4MB validation; when Supabase isn't configured, returns a clear 400 (no working local-disk fallback in production, unlike the demo-item fallback for menu create/update).
* **New `scripts/setup-storage-bucket.mjs`** (`npm run setup:storage`): idempotently creates the public `menu-images` bucket. `createBucket()` is **not** idempotent (409 `BucketAlreadyExists` on re-run) — the script calls `listBuckets()` first and also catches a 409 from `createBucket` itself as a defense-in-depth fallback. Ran successfully against the project's live Supabase instance (bucket created, then confirmed idempotent on re-run); also smoke-tested a real upload + public URL fetch (200 OK) + cleanup directly against Storage.
* **Tests added (TDD, red-before-green for new behavior):** `app/api/admin/menu/route.test.ts` (PATCH auth branches, validation, Supabase-backed success shape), `lib/admin-auth.test.ts` (all `requireAdminSession` branches — demo-bypass, no-token, valid/invalid/absent Supabase session, no-admin-env), `app/api/admin/outlet/pricing/route.test.ts` (GET/POST auth + demo-bypass), `app/api/admin/upload/route.test.ts` (401, type/size validation, Supabase Storage success returning a non-`/uploads/...` public URL, clear error when Storage isn't configured). Full suite: **84/84 passing**.
**Manual verification still required (documented in README):** live Vercel deploy with `npm run setup:storage` run against production Supabase; end-to-end demo-admin click-through (create pizza, edit+Save a row, change GST, upload an image) confirmed live in the Supabase tables and reflected on a second incognito customer session; parity check with a real Supabase-Auth admin account; confirming error toasts appear on a revoked/corrupted token.

---

### [2026-07-05 23:35:00] - Centralized outlet pricing + schema.sql safety review
**Context:** User asked whether re-running `schema.sql` could break anything, and flagged the earlier Vercel-only bug where customer order history silently returned empty.
**Schema review:** Confirmed every statement in `supabase/schema.sql` is idempotent (`if not exists`, `on conflict do nothing/update`, `create or replace view`, `drop policy if exists`) — no `DROP`/`TRUNCATE`/`DELETE` anywhere, so re-running it is safe for existing orders/customers. Only caveat: the seed `insert ... on conflict do update` for `pizza_bases`/`pizza_types`/`toppings` (ids 1–5/1–8/1–10) would reset those specific rows to seed values if ever hand-edited in the DB directly — not a live risk today since the admin menu-editor's inline edit fields are local-state only and not yet persisted.
**Security fix:** `slicematic.outlet_settings` (new table backing GST/discount sync) had no RLS enabled while the script grants `all privileges` to `anon` — added `alter table ... enable row level security` with no anon/authenticated policy so only the service role (used by `/api/outlet/pricing` and `/api/admin/outlet/pricing`) can touch it.
**Vercel note:** New pricing-config reads/writes (`lib/outlet-settings.ts`) use a plain `.eq(...).maybeSingle()` via the Supabase client — not the `.order()+.limit()` combo that caused the earlier PostgREST bug — so they don't need the raw-SQL (`lib/db.ts`) workaround. Confirmed the existing raw-SQL path for customer order history (`fetchOrderHistoryByCustomerId`) is untouched and still required.
**Docs fix:** `README.md` incorrectly listed `DATABASE_URL` as "optional." It is required in production — without it, order history fails silently (empty list, no error). Updated the env var docs to call this out explicitly.

---

### [2026-07-05 23:20:00] - Menu create-item image preview fix
**Context:** Pizza image preview in admin Menu → Create Item showed only a narrow vertical strip.
**Root cause:** `.menu-editor img` forced all images to 78×64px, overriding `.image-preview-frame img`.
**Fix:** Scoped catalogue thumbnails to `.menu-editor article img`; strengthened `.image-preview-frame` with 16:10 aspect ratio and explicit preview sizing.

---

### [2026-07-05 23:15:00] - AI tab shows live recommendation prompt + UI fixes
**Context:** Admin AI tab displayed a shortened stale "system prompt summary" that did not match `/api/recommend`. Forecast peak cards had a grid alignment bug (title consumed first grid cell).
**Changes & Fixes:**
* **Single source of truth:** `lib/recommendation-prompt.ts` — exports the exact `RECOMMENDATION_SYSTEM_PROMPT` sent to OpenRouter.
* **`/api/recommend`** imports the shared prompt and default model constant (no duplicate string).
* **`RecommendationAIPanel`** component shows the full live prompt, model, JSON output schema, user payload fields, and endpoint — used in admin dashboard and `SliceMaticStage3`.
* **Forecast peaks UI:** moved eyebrow title outside `.forecast-list` grid so all 3 peak cards align in one row.

---

### [2026-07-05 17:10:00] - Demand forecast (KISS) + README / changelog documentation
**Context:** Align demand forecasting with Stage 3 rubric (scikit-learn, hour/day features, admin chart, top 3 peaks, RMSE documentation) and document the full FullStack feature set in README.
**Changes & Fixes:**
* **Forecast model simplified** (`scripts/forecast_model.py`): features reduced to **`weekday` + `hour` only**; removed `hourly_revenue`, `is_weekend`, and synthetic confidence scores. Target remains orders per hour; metric remains hold-out **RMSE**.
* **Hybrid train/serve pipeline:** `npm run forecast:refresh` → Supabase `order_datetime` → Python trainer → `lib/generated/forecast-cache.json` → admin UI via `lib/forecast-service.ts` (no Python on Vercel at request time).
* **Admin Forecast tab** (`components/admin/ForecastPanel.tsx`): area chart for next 7 days (11:00–22:00), top 3 peak hours list, model documentation card (model, features, RMSE, train metadata).
* **Optional local retrain:** `POST /api/admin/forecast/refresh` when Python + scikit-learn installed on the machine.
* **Synthetic seed script** (`scripts/seed-synthetic-orders.mjs`, `npm run seed:synthetic-orders`): append/purge tagged demo orders (`SYNTHETIC_ML_SEED`) for ML bucket volume; backup recommended under `FullStack/backups/` (gitignored).
* **README expanded:** quick reference table, NPM scripts, API routes table, project layout, full forecast architecture/steps/cache shape/seed workflow, updated env vars (Cashfree, DATABASE_URL), customer register/profile docs, demo flow including Forecast tab.
* **Current live metrics (201 orders):** RMSE ≈ 1.05 orders/hour; top peaks Sat 17:00, Sat 22:00, Sun 11:00.

---

### [2026-07-04 22:45:00] - Documentation updates in README.md
**Context:** Expanded documentation in `README.md` to cover system architecture, the AI features engine, model choices, and the Admin Console workspace.
**Changes & Fixes:**
* Updated the Customer Authentication section to cover the new `EntryPortal` flow and guest redirections.
* Expanded the Payments section to outline both Razorpay and Cashfree Sandbox payment integrations.
* Revamped the Architecture diagram (Mermaid flowchart) to map the entire system data flow (UI, API routes, and persistence/infrastructure layers).
* Elaborated on the AI engine mechanics, closed-loop attribution, and the default **`openai/gpt-oss-20b`** model choice (detailing its semantic reasoning for flavor profiling, dietary constraint mapping, JSON output stability, and sub-second latency targets).
* Added a detailed breakdown of the Admin Operations Console features (Pulse Strip, order management, dynamic configurations, and reports).


### [2026-07-04 21:35:00] - Redirect guest checkout sign-in to new login portal
**Context:** When checking out as guest, the "Sign in for Cash" button and account redirection were taking users to the old customer account login screen instead of the new EntryPortal OTP-based login screen.
**Changes & Fixes:**
* Updated `openAccount()` in [SliceMaticStage3.tsx](file:///d:/FDE/FDEGit/Slicematic/FullStack/components/SliceMaticStage3.tsx) to check if the user is not logged in and `onUnauthorize` exists.
* If so, redirect the user by triggering `onUnauthorize()`, which returns them to the glassmorphic `EntryPortal` (new login screen).



### [2026-07-03 14:30:00] - Customer session and member checkout restoration
**Context:** Fixed the EntryPortal account handoff so registered/logged-in customers are restored correctly in the main FullStack app and no longer show as guest checkout.
**Changes & Fixes:**
* Added session restoration in `FullStack/components/SliceMaticStage3.tsx` for `slicematic_customer`, `slicematic_customer_email`, and `slicematic_customer_logged_in`.
* Ensured successful customer sign-in and password reset now open the customer workspace and `menu` step instead of leaving the user in guest mode.
* Kept explicit guest behavior when `slicematic_customer_logged_in` is `false`, routing guest users to the intake step.
* Verified the app build succeeds after the fix.

### [2026-07-03 13:52:00] - TDD Parity with GRADIO-MVP-2
**Context:** Audited the `FullStack` Next.js application against the original `GRADIO-MVP-2` prototype tests (`test_core.py` and `test_edge_cases.py`) to ensure 100% logic and edge-case parity.
**Changes & Fixes:**
*   **Phone Validation:** Modified `lib/pricing.ts` to output highly specific error messages for phone numbers (e.g., missing, wrong length, bad starting digits) mirroring the exact MVP specs rather than relying on a generic regex fallback.
*   **Menu Parsing:** Updated `lib/data-service.ts` to intercept `null`-like strings (`"na"`, `"nan"`, `"none"`) and missing or negative prices. Instead of falling back to default seed data, it now intentionally disables these items (setting `price = 0` and `available = false`) and deduplicates rows to precisely replicate the Python file-loader logic.
*   **Test Coverage:** Introduced `lib/pricing.test.ts` and `lib/data-service.test.ts` using Vitest to execute and verify every single MVP test case (TDD Red-Green-Refactor). Tests are fully passing.

---

### [2026-07-03 01:25:00] - Debugging Cashfree Sandbox UPI Failures
**Context:** Cashfree payments were failing with a generic `502 Bad Gateway: Could not start UPI payment. Please retry.` error when checking out with UPI.
**Changes & Fixes:**
*   **Error Visibility:** Modified `app/api/payments/cashfree/create-order/route.ts` to log the actual `err.message` from the `createCashfreeOrder` function instead of swallowing it.
*   **Environment Variables:** Discovered that although `CASHFREE_APP_ID` and `CASHFREE_SECRET_KEY` were updated in `.env`, the Next.js development server had not been restarted. The server was using stale placeholder keys, resulting in Cashfree silently rejecting the requests with a `401 Unauthorized`. Restarted the server to fix this.
*   **Sandbox Limits:** Upon fixing the keys, the API surfaced a `400` error: `"order amount exceeds the maximum limit"`. This occurred because Cashfree's Sandbox environment heavily restricts transaction amounts for testing.
*   **Resolution:** Emptied the cart and added a single, low-priced item to stay within the Sandbox transaction limits, allowing the test payment window to open successfully.

---

### [2026-07-03 01:00:00] - Fixing Supabase Order Logging & Schema Permissions
**Context:** Orders placed in the frontend appeared successful but were not being saved to the Postgres database.
**Changes & Fixes:**
*   **Error Swallowing:** The `saveOrder` function in `lib/data-service.ts` was suppressing Supabase `insert` errors. Modified the code to explicitly check for `{ error }` on the `customer`, `orders`, and `order_item` insertions, and `throw new Error(...)` so failures are correctly caught and logged.
*   **API Schema Exposure:** Supabase returned `Invalid schema: slicematic`. The custom `slicematic` schema was not exposed to the PostgREST API. Fixed by adding `slicematic` to the **"Exposed schemas"** list in the Supabase Dashboard API Settings.
*   **Role Permissions:** Supabase returned `permission denied for schema slicematic`. By default, newly created schemas are locked down. The API roles (`anon`, `authenticated`, `service_role`) lacked usage rights.
*   **Resolution:** Executed the following script in the Supabase SQL Editor and permanently appended it to `supabase/schema.sql` to ensure future database resets grant the correct permissions automatically:
    ```sql
    -- API Role Permissions for Custom Schema
    grant usage on schema slicematic to anon, authenticated, service_role;
    grant all privileges on all tables in schema slicematic to anon, authenticated, service_role;
    grant all privileges on all routines in schema slicematic to anon, authenticated, service_role;
    grant all privileges on all sequences in schema slicematic to anon, authenticated, service_role;
    alter default privileges in schema slicematic grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema slicematic grant all on routines to anon, authenticated, service_role;
    alter default privileges in schema slicematic grant all on sequences to anon, authenticated, service_role;
    ```

---

### [2026-07-02 18:30:00] - Supabase Authentication & Database Connection Setup
**Context:** Initial setup of the Supabase backend and DBeaver connections.
**Changes & Fixes:**
*   **Auth Failure:** Authentication was failing because the `.env` variable `NEXT_PUBLIC_SUPABASE_URL` incorrectly included `/rest/v1/` at the end. Removing the trailing path fixed the login flow.
*   **Table Visibility:** Clarified that custom tables created in `supabase/schema.sql` live under the `slicematic` schema, requiring the user to switch the schema dropdown from `public` to `slicematic` in the Supabase Table Editor.
*   **DBeaver Connection:** Verified that DBeaver can connect to the database using the session-mode pooler URL provided in the `DATABASE_URL` string within `.env`.

### [2026-07-03 14:05:00] - Currency Rounding & Cashfree Test Coverage
**Context:** The final total displayed on the checkout page included decimals (e.g., Rs. 3173.26), causing a visual discrepancy for users since subtotal and tax lines were displayed as rounded integers. Also, lib/cashfree.test.ts was missing from the test suite.
**Changes & Fixes:**
*   **Math Rounding:** Updated calculateBill in lib/pricing.ts to strictly enforce Math.round() on every calculation step (discount, taxable, gst, deliveryCharge). 
*   **Formatter Standardization:** Removed the exact fractional formatter (moneyExact) entirely and swapped all frontend references in payment/page.tsx, confirmation/page.tsx, and SliceMaticStage3.tsx to the rounding formatter (money), guaranteeing no decimals are shown to the user.
*   **Test Suite Additions:** 
    *   Overrode the pricing.test.ts billing logic tests to expect rounded integers instead of the strict floats used in MVP-2.
    *   Created lib/cashfree.test.ts to mock and verify order creation, missing env validation, and payment status checks for 100% gateway test parity.

### [2026-07-03 14:15:00] - Comprehensive Red-Green Protocol & Environment Fixes
**Context:** Ensuring the entire suite of 44 tests strictly abides by the TDD Red-Green-Refactor protocol, while cleaning up any lingering environment warnings.
**Changes & Fixes:**
*   **Store Middleware Warning:** The test suite was throwing [zustand persist middleware] errors in Node because localStorage isn't native to Vitest. Resolved this by placing i.mock("zustand/middleware") at the top of lib/store.test.ts to cleanly bypass persistence in tests.
*   **Red Phase Verification:** To strictly verify the remaining legacy tests, intentional breaks were introduced to lib/razorpay.ts, lib/store.ts, and pp/api/payments/create-order/route.ts. The suite successfully failed as expected.
*   **Green Phase Restoration:** The logic was restored, and all 44 tests across 6 files now confidently pass with zero warnings, guaranteeing the integrity of our Payment Gateways (Razorpay/Cashfree) and Pricing/Data logic.
