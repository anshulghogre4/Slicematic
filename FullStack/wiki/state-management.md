# 🗄️ SliceMatic — State Management

---

## Zustand Store (`lib/store.ts`)

**Persistence:** `sessionStorage` key `SESSION_STORAGE_KEYS.zustandStore` (`"slicematic-storage"`)
**Why sessionStorage:** Cart should not survive browser close. Auth isolation per tab.

### State Shape

```typescript
interface AppState {
  cart: CartLine[];                   // Active cart items
  customer: CustomerDetails;          // Name, phone, address, zone, note
  pricingConfig: PricingConfig;       // GST, discount, delivery config
  paymentMode: PaymentMode;           // "Cash" | "Card" | "UPI"
  lastOrder: SavedOrder | null;       // Most recent completed order
  recommendation: Recommendation | null; // Current AI recommendation
}
```

### Setters (All accept value OR updater function)

```typescript
setCart(updater)          // Update cart
setCustomer(updater)      // Update customer details
setPricingConfig(updater) // Update pricing config (admin use)
setPaymentMode(updater)   // Switch payment method
setLastOrder(updater)     // Store last placed order
setRecommendation(updater)// Store AI recommendation
clearCheckout()           // Empty the cart
resetSession()            // Full reset (cart + customer + lastOrder + recommendation)
```

### Usage in Components

```typescript
import { useStore } from "../lib/store";

const { cart, setCart, customer, setCustomer, pricingConfig, ... } = useStore();
```

---

## SessionStorage Keys (Manual Auth State)

These are **not** in Zustand — they're set manually via `window.sessionStorage`.

Runtime code should import keys from `lib/session/storageKeys.ts` instead of repeating string literals. Checkout/payment route recovery should go through `lib/session/checkoutSession.ts`:

```typescript
// Auth decision keys
"slicematic_customer_logged_in"   // "true" | "false" | null(absent)
"slicematic_is_admin"             // "true" | null
"slicematic_admin_view_customer"  // "true" | null

// Customer identity
"slicematic_customer_email"       // email or phone string
"slicematic_customer_id"          // UUID from Supabase
"slicematic_customer"             // JSON-stringified CustomerDetails

// UI state
"slicematic_workspace"            // "account" | (absent = customer)
"slicematic_refresh_orders"       // "1" | (absent) — triggers order refresh

// Zustand persistence
"slicematic-storage"              // Auto-managed by zustand/middleware/persist
```

---

## State Flow: Login → Recommendation

```
1. User logs in (password or OTP)
2. sessionStorage keys set by auth handler
3. useEffect reads sessionStorage on mount
4. if (loggedInValue === "true"):
     setCustomerLoggedIn(true)
     setCustomerSessionEmail(email)
     setWorkspace("customer" or "account")
     if (phoneFromSession):
       setStep("recommendation")
       void submitCustomer(name, phone)  // auto-fires recommendation
     else:
       setStep("menu")
```

---

## `lib/session-customer.ts`

Helper functions for order-related sessionStorage operations:

```typescript
applyOrderToSession(order: SavedOrder)
  // Updates slicematic_customer_id, slicematic_customer_email from completed order

syncSessionCustomerId(id: string)
  // Updates stored customer ID if server returns a resolved one
```

---

## `lib/session/checkoutSession.ts`

Checkout-specific session helpers added in Revamp Sprint R1:

```typescript
readCheckoutSessionIdentity(sessionStorage)
  // Returns member/guest mode, stored email, and stored customer ID

writeCashfreePendingPayment(localStorage, pending)
  // Stores pending Cashfree order handoff before redirect

completeCashfreeReturn(localStorage, returnOrderId)
  // Reads and clears pending Cashfree state on return to /payment?order_id=...
```

The `/payment` route uses these helpers so checkout refresh/redirect behavior is tested without scattering raw storage keys.

---

## `lib/customer-flow.ts`

```typescript
CUSTOMER_FLOW_TABS  // Tab definitions for customer workspace
fetchOutletPricingConfig()  // Fetches admin-set PricingConfig from /api/outlet
```

---

## 2026-07-16 target state model

The existing `lib/store.ts` is still the runtime source today. Future restructuring should split state by ownership:

| State type | Examples | Target owner | Persistence |
|---|---|---|---|
| Server state | menu, orders, forecast, admin summary, customer profile | server components, route handlers, feature API hooks | cache/revalidate/refetch |
| Durable session state | cart, customer draft, payment mode, last order snapshot | feature-level Zustand stores | `sessionStorage`, versioned |
| URL state | admin tab, filters, pagination, nested settings/menu page | Next search params | browser URL |
| Ephemeral UI state | modal open, toast, loading animation, draft text | local component or feature hook | none |
| Redirect recovery | Cashfree pending payment payload | checkout payment service | `localStorage` with cleanup |

State persistence should remain, but only where it protects the order journey:

- keep cart, customer draft, selected payment mode, last order snapshot, and temporary session identity;
- do not persist toast messages, modal state, skeleton/loading flags, transient AI panel state, or admin filters that should live in the URL.

Future stores should use selectors so components subscribe only to the exact fields they render.

See `FullStack/plans/frontend-architecture-restructure.md` for the migration roadmap.

*Last updated: 2026-07-16*
