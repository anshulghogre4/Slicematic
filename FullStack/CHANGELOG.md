# FullStack Changelog & Troubleshooting Context

This file maintains a timestamp-based record of the modifications, debugging sessions, and environment fixes applied to the Slicematic FullStack project.

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
