# FullStack Changelog & Troubleshooting Context

This file maintains a timestamp-based record of the modifications, debugging sessions, and environment fixes applied to the Slicematic FullStack project.

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
