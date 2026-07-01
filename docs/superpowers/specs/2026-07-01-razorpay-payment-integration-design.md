# Payment Gateway Integration — Design Spec

**Date:** 2026-07-01
**Branch:** `sm-payment-integration`
**Target app:** `FullStack/` (Next.js App Router + Supabase)
**Mode:** Test mode only (`rzp_test_` keys + Cashfree sandbox, no real charges)
**Reference:** `documents/razorpay_integration_analysis.md` (written for FastAPI+Gradio; logic reused, stack adapted to Next.js)

## 1. Goal & Scope

Add real (test-mode) payment processing for **Card** and **UPI** orders in the existing
Next.js customer checkout. Two gateways are used:

- **Razorpay** — Card payments via `checkout.js` modal (same-page, callback fires in-place).
- **Cashfree** — UPI payments via full-page redirect to Cashfree's hosted checkout.

Both gateways verify payment server-side before persisting the order to Supabase.
**Cash** orders keep their current behavior (immediate save, no gateway).

**Why two gateways:** Razorpay's test mode does not support UPI simulation for all accounts.
Cashfree's sandbox provides reliable UPI test VPAs (`testsuccess@gocash`).

**Out of scope:** webhooks, refunds, payment links, live-mode keys, saved cards, partial payments,
multi-currency. The amount cap is well within test limits (max ~Rs.15k for 10 pizzas).

## 2. Key Decisions (locked)

| Decision | Choice | Why |
|---|---|---|
| Target app | `FullStack/` Next.js | Single deployed Vercel frontend; reuses existing ordering/pricing logic. |
| Card gateway | Razorpay (`checkout.js` modal) | React-native path; modal stays on same page, handler callback fires in-place. |
| UPI gateway | Cashfree (full-page redirect) | Razorpay test mode UPI unreliable; Cashfree sandbox has working test VPAs. |
| Order persistence | Save **after** payment verified | Preserves "only confirmed orders persist" architecture. |
| No-keys behavior | Card/UPI **require** real test keys | `create-order` returns explicit 503 if keys missing. |
| Test runner | **Vitest** | Standard zero-config TS runner for Next.js. |

## 3. Architecture

New files:

| File | Purpose |
|---|---|
| `FullStack/lib/razorpay.ts` | Server-only. `hasRazorpayEnv()`; `toPaise(finalTotal): number`; `createRazorpayOrder(...)` via Razorpay Orders REST API; `verifySignature(orderId, paymentId, signature): boolean` = HMAC-SHA256 via `crypto.timingSafeEqual`. |
| `FullStack/lib/cashfree.ts` | Server-only. `hasCashfreeEnv()`; `createCashfreeOrder(...)` via Cashfree Orders API (sandbox); `verifyCashfreePayment(orderId)` via GET payment status API. |
| `FullStack/app/api/payments/create-order/route.ts` | `POST`. Validates + recomputes bill, creates Razorpay order for Card. |
| `FullStack/app/api/payments/verify/route.ts` | `POST`. Verifies Razorpay HMAC signature + amount cross-check; saves order. |
| `FullStack/app/api/payments/cashfree/create-order/route.ts` | `POST`. Validates + recomputes bill, creates Cashfree order for UPI with `payment_methods: "upi"`. |
| `FullStack/app/api/payments/cashfree/verify/route.ts` | `POST`. Checks Cashfree payment status via server API; saves order. |
| `FullStack/types/cashfree.d.ts` | TypeScript declarations for `@cashfreepayments/cashfree-js` (ships no types). |
| `FullStack/lib/razorpay.test.ts` | Vitest unit tests — 9/9 passing. |

Edited files: `components/SliceMaticStage3.tsx` (placeOrder routing: Cash→placeCashOrder, UPI→placeUpiOrder,
Card→placeOnlineOrder + checkout UI states + Cashfree redirect detection useEffect),
`lib/data-service.ts` (`saveOrder` accepts Razorpay + Cashfree payment meta),
`lib/types.ts` (payment-meta + optional `SavedOrder` payment fields),
`supabase/schema.sql` (additive columns for both gateways),
`.env.example`, `package.json` (vitest + `@cashfreepayments/cashfree-js` + `test` script).

## 4. Data Flow

1. Customer at checkout selects a payment mode and clicks **Place Order**.
2. **Cash** (members only): unchanged — `POST /api/orders` → `saveOrder` → tracking page.
3. **Card** (Razorpay):
   1. `placeOnlineOrder()` → `POST /api/payments/create-order` with order payload.
   2. Server validates, recomputes bill, creates Razorpay order, returns `razorpayOrderId` + `keyId` + prefill.
   3. Client lazy-loads `checkout.razorpay.com/v1/checkout.js`, opens `new Razorpay(options).open()`.
   4. **success handler** → `POST /api/payments/verify` with `{razorpay_order_id, razorpay_payment_id, razorpay_signature, amountPaise, payload}`.
   5. Server `verifySignature(...)` + asserts recomputed paise == `amountPaise`; saves order.
   6. Client: `setLastOrder`, clear cart, `step = 'tracking'`, success toast.
   7. **modal dismiss** → status "Payment cancelled — no order placed."; stays on checkout.
4. **UPI** (Cashfree):
   1. `placeUpiOrder()` → `POST /api/payments/cashfree/create-order` with order payload.
   2. Server validates, recomputes bill, creates Cashfree order with `payment_methods: "upi"` and `return_url`, returns `paymentSessionId`.
   3. Client saves pending data to `localStorage`, calls `cashfree.checkout({ paymentSessionId, redirectTarget: "_self" })`.
   4. Browser redirects to Cashfree's hosted payment page. User pays with UPI VPA.
   5. Cashfree redirects back to `return_url?order_id=<our_order_id>`.
   6. Page loads fresh. `useEffect` detects `order_id` query param + localStorage pending data.
   7. Client calls `POST /api/payments/cashfree/verify` with `{cfOrderId, amountPaise, payload}`.
   8. Server checks Cashfree payment status via GET API + asserts recomputed paise; saves order.
   9. Client: `setLastOrder`, clear cart, `step = 'tracking'`, success toast.

Security: amount is recomputed server-side in **both** create-order and verify for both gateways.
Razorpay secret used for HMAC signature (`timingSafeEqual`). Cashfree secret used for server-to-server
API authentication only. Neither secret is ever sent to the browser.

## 5. Database Schema (additive, `FullStack/supabase/schema.sql`)

```sql
-- Razorpay
alter table slicematic.orders add column if not exists razorpay_order_id text;
alter table slicematic.orders add column if not exists razorpay_payment_id text;
alter table slicematic.orders add column if not exists payment_status text not null default 'confirmed'
  check (payment_status in ('paid', 'confirmed', 'failed'));
-- Cashfree
alter table slicematic.orders add column if not exists cashfree_order_id text;
alter table slicematic.orders add column if not exists cashfree_payment_id text;
create index if not exists idx_orders_razorpay_order_id on slicematic.orders(razorpay_order_id);
```

Card/UPI orders are stored `payment_status = 'paid'`; Cash orders `'confirmed'`. `'failed'` is
allowed by the constraint but unused under the save-after-verify model (no failed rows are written).
`saveOrder` writes these columns when present; in demo (no-Supabase) mode it stamps them on the
returned `SavedOrder` only.

## 6. Business-rule & constraint compliance

- Payment modes remain `{Cash, Card, UPI}`, enforced server-side.
- Guest → UPI/Card only; member → Cash/Card/UPI (guest-Cash gated by `pricingConfig.guestCashAllowed`).
- GST-after-discount, 10% at qty ≥ 5, max qty, name/phone validation: untouched — all bill math
  flows through the existing `lib/pricing.ts`.
- **Phone** appears only on intake confirmation and the order-log/DB line, plus as a Razorpay
  prefill `contact` (sent to the gateway, not rendered on bill/payment/receipt) — consistent with
  the repo rule that phone is not shown on bill/payment/receipt screens.
- **No unhandled exception reaches the customer:** every payment route is wrapped; failures map to
  friendly messages; a failed verify writes no order.

## 7. Testing Strategy (TDD)

Write tests first, watch them fail, then implement. Vitest.

**`lib/razorpay.test.ts` (pure units — primary TDD target):**
- `toPaise`: ₹850.34 → `85034`; ₹936.92 → `93692`; ₹2529.68 → `252968`; rounds half-up; values
  below ₹1 handled by the route's min-100 guard (assert `toPaise` of `0.50` → `50` so the route can
  reject `< 100`).
- `verifySignature`: known `orderId|paymentId` + secret produces the expected HMAC and returns
  `true`; a tampered signature returns `false`; a length-mismatched signature returns `false`
  without throwing (timingSafeEqual guard).

**Route test (lightweight):**
- `create-order` with `RAZORPAY_KEY_ID` unset returns HTTP 503 with the configured message.
- (Optional, if cheap) validation rejection returns 400 with an `{errors}` body.

The `checkout.js` browser modal glue is intentionally not unit-tested (would require a heavy DOM/
network mock harness — out of proportion for a test-mode demo). It is exercised manually with the
test card `4111 1111 1111 1111` and test UPI `success@razorpay`.

## 8. Web Interface Guidelines (applied to new checkout UI)

- Payment selector: real `<button>`s with `:focus-visible` rings and `aria-pressed` for selection.
- Place Order: `aria-busy` + disabled while the order/modal is in flight; no double-submit.
- Cancelled/failed payment: `aria-live="polite"` status region (reuse/extend the existing toast).
- Honor `prefers-reduced-motion`; animate only transform/opacity; no `transition: all`.
- A `/web-design-guidelines` compliance pass is run on the changed files before completion.

## 9. Environment Variables

```bash
# FullStack/.env.local (server-only; never exposed to the browser bundle)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
```

The key id is public by nature but is delivered to the client **by the server** (`create-order`
response), so no `NEXT_PUBLIC_` variable is introduced. README documents setup + the test card / UPI.

## 10. Implementation Order

1. Add Vitest + `test` script (`package.json`); confirm runner executes.
2. TDD `lib/razorpay.ts` (`toPaise`, `verifySignature`, `hasRazorpayEnv`) — red → green.
3. `create-order` route (+ 503 test) — red → green.
4. `verify` route (signature + amount cross-check → `saveOrder`).
5. `saveOrder` payment-meta arg + `types.ts` + `schema.sql` additive columns.
6. Wire `placeOrder()` branch + checkout UI states + `checkout.js` loader in the component.
7. `.env.example` + README.
8. Manual end-to-end with test card / test UPI; `/web-design-guidelines` pass on changed files.
```
