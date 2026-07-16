# 🧪 SliceMatic — Testing Guide

---

## Test Runner

**Vitest** — `npm run test` (in `FullStack/`)

```bash
npm run test          # Run all tests once
npm run test:watch    # Watch mode
```

---

## Test Files

| File | What it tests |
|---|---|
| `lib/pricing.test.ts` | Bill calculation, validation, edge cases |
| `lib/store.test.ts` | Zustand store state transitions |
| `lib/customer-auth.test.ts` | Customer ownership validation logic |
| `lib/admin-auth.test.ts` | Admin token verification |
| `lib/cashfree.test.ts` | Cashfree order creation + verification |
| `lib/razorpay.test.ts` | Razorpay order verification |
| `lib/data-service.test.ts` | DB query helpers (mocked Supabase) |
| `lib/session/checkoutSession.test.ts` | Checkout identity and Cashfree return recovery |
| `lib/delivery-state.test.ts` | Delivery transition contract scaffold |
| `lib/order-journey.test.ts` | Recorded order status to customer journey mapping |
| `lib/menu-catalog.test.ts` | Available filtering, category/query matching, starting crust price |

Latest verified full run: **111/111 tests passed across 19 files** on 2026-07-16 after Revamp R7A.

---

## Key Test Scenarios Covered

### Pricing (`pricing.test.ts`)
- GST 18% applied AFTER discount
- Bulk discount triggers at qty ≥ 5 (10% off)
- Delivery fee waived when subtotal ≥ freeDeliveryMin
- Customer validation: name format, phone regex, address length, zone rank
- Order line validation: qty limits, unavailable items, duplicate toppings

### Store (`store.test.ts`)
- State transitions for cart, customer, paymentMode
- `resetSession()` clears all session data
- `clearCheckout()` empties cart only

### Customer Auth (`customer-auth.test.ts`)
- UUID format validation
- Customer ownership check prevents cross-customer data access

---

## What Is NOT Tested

- React component rendering (no React Testing Library setup)
- Full browser/API integration against live external services
- E2E flows (no Playwright/Cypress setup)
- EntryPortal, SliceMaticStage3 UI behaviour

These are candidates for future test expansion.

---

## Stage 2 Tests (Gradio — Reference Only)

`GRADIO-MVP-2/` has its own Python tests:
```bash
cd GRADIO-MVP-2
python test_core.py          # file loading, validation, bill math, log format
python test_edge_cases.py    # ~72 edge cases
```
⚠️ One known stale assertion: `qty=1 final 799.06` — correct answer is `798.86`. App is correct, test is wrong.

---

## Running Tests After Making Changes

**Always run after touching:**
- `lib/pricing.ts` → run `npm run test` (pricing.test.ts most impacted)
- `lib/store.ts` → run `npm run test` (store.test.ts)
- `lib/customer-auth.ts` → run `npm run test` (customer-auth.test.ts)
- Any API route → manually test via browser or curl

---

*Last updated: 2026-07-06*
