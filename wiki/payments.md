# 💳 SliceMatic — Payment Flows

---

## Payment Modes

| Mode | Provider | Guest | Member | Flow Type |
|---|---|---|---|---|
| UPI | Cashfree | ✅ | ✅ | Redirect |
| Card | Razorpay | ✅ | ✅ | SDK overlay |
| Cash | — | ❌ (unless `guestCashAllowed`) | ✅ | Direct |

---

## Cash Order Flow

```
placeOrder() → paymentMode === "Cash" → placeCashOrder()
     ↓
POST /api/orders
  body: { customer, lines, paymentMode: "Cash", customerMode, customerId, pricingConfig, recommendationId }
     ↓
Response: { ok: true, order: SavedOrder }
     ↓
setLastOrder(order)
setCart([])
applyOrderToSession(order)
router.push("/confirmation")
```

---

## UPI Flow (Cashfree)

```
placeOrder() → paymentMode === "UPI" → placeUpiOrder()
     ↓
POST /api/payments/cashfree/create-order
  body: same as /api/orders
     ↓
Response: { ok: true, cfOrderId, paymentSessionId, amountPaise }
     ↓
localStorage.setItem("cf_pending", JSON.stringify({ orderId, amountPaise, payload }))
     ↓
Cashfree SDK: cashfree.checkout({ paymentSessionId, redirectTarget: "_self" })
     ↓ (page redirects to Cashfree payment page)

--- USER COMPLETES PAYMENT ON CASHFREE ---

     ↓ (redirected back with ?order_id=<cfOrderId>)
useEffect on mount detects ?order_id param
     ↓
reads localStorage["cf_pending"]
     ↓
POST /api/payments/cashfree/verify
  body: { orderId: cfOrderId, amountPaise, payload: OrderPayload }
     ↓
Response: { ok: true, order: SavedOrder }
     ↓
Same as Cash flow completion
```

**Key:** `cf_pending` in `localStorage` (not sessionStorage) survives page redirect.

---

## Card Flow (Razorpay)

```
placeOrder() → paymentMode === "Card" → placeOnlineOrder()
     ↓
POST /api/payments/razorpay/create-order
     ↓
Load Razorpay checkout SDK (injected as <script>)
     ↓
Razorpay.open({ ... options ... })
     ↓ (SDK overlay on same page — no redirect)
User pays → Razorpay callback
     ↓
POST /api/payments/razorpay/verify
     ↓
Completion same as Cash flow
```

---

## Key Files

| File | Purpose |
|---|---|
| `lib/cashfree.ts` | Cashfree order creation + verification logic |
| `lib/razorpay.ts` | Razorpay order creation + verification logic |
| `app/api/payments/cashfree/create-order/route.ts` | API: create Cashfree order |
| `app/api/payments/cashfree/verify/route.ts` | API: verify Cashfree payment |
| `app/api/payments/razorpay/create-order/route.ts` | API: create Razorpay order |
| `app/api/payments/razorpay/verify/route.ts` | API: verify Razorpay payment |

---

## Environment Variables (Payment)

```
# Cashfree
CASHFREE_APP_ID=...
CASHFREE_SECRET_KEY=...
CASHFREE_RETURN_URL=...

# Razorpay
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
```

All in `FullStack/.env` — never echo these.

---

## Error Handling

All payment API routes return `{ ok: false, errors: {...} }` on failure.  
The UI reads `ok` and shows a toast on failure.  
Payment failures do NOT write an order to the database.

---

*Last updated: 2026-07-06*
