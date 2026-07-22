# 🏗️ SliceMatic — Architecture

> **Read this before making any structural changes.**

---

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER (Client)                      │
│                                                         │
│  EntryPortal → SessionStorage check → Route decision   │
│       ↓                                                 │
│  CustomerShell.tsx  (customer workspace)                │
│  admin-dashboard/page.tsx  (admin workspace)            │
│  features/* shared presentation                         │
│       ↓                                                 │
│  Zustand Store (sessionStorage persisted)               │
└─────────────────────────────────────────────────────────┘
              ↕ fetch()
┌─────────────────────────────────────────────────────────┐
│                  NEXT.JS API ROUTES                      │
│                  (app/api/**/route.ts)                   │
│                                                         │
│  /api/menu          /api/orders        /api/recommend   │
│  /api/admin/*       /api/payments/*    /api/customer/*  │
│  /api/health        /api/outlet        /api/ai          │
└─────────────────────────────────────────────────────────┘
              ↕
┌─────────────────────────────────────────────────────────┐
│                     DATA LAYER                           │
│                                                         │
│  Supabase/Postgres (primary)                            │
│  lib/seed-data.ts (fallback when Supabase absent)       │
│  lib/data-service.ts (all DB operations)                │
└─────────────────────────────────────────────────────────┘
              ↕
┌──────────────────────┐   ┌────────────────────────────┐
│  Supabase Auth       │   │  External Services          │
│  (customer + admin)  │   │  Cashfree (UPI payments)   │
│                      │   │  Razorpay (Card payments)  │
│                      │   │  OpenRouter (AI/LLM)       │
└──────────────────────┘   └────────────────────────────┘
```

---

## Critical: Customer And Admin Shells

**Updated 2026-07-21:** The dual-file Stage3 monolith is gone.

| File | Path | Role |
|---|---|---|
| `CustomerShell.tsx` | `components/CustomerShell.tsx` | Customer-facing app (rendered at `/` after EntryPortal) |
| `page.tsx` (admin) | `app/admin-dashboard/page.tsx` | Admin dashboard |
| Feature modules | `features/*` | Shared presentation extracted from the old monolith |

**The rule:** Prefer shared `features/` components. Do not recreate `SliceMaticStage3.tsx`. EntryPortal is the only login form.

---

## Page / Route Map

```
/                        → app/page.tsx
                           → EntryPortal (if not logged in)
                           → CustomerShell.tsx (customer logged in / guest)
                           → redirect /admin-dashboard (admin logged in)

/admin-dashboard         → app/admin-dashboard/page.tsx
                           → Full admin dashboard with tabs (gated on admin session)

/payment                 → app/payment/page.tsx
                           → Checkout / payment selection

/confirmation            → app/confirmation/page.tsx
                           → Order confirmation / honest journey rail
```

---

## Authentication Flow

```
Browser loads /
     ↓
sessionStorage check:
  slicematic_customer_logged_in = "true"/"false"/null
  slicematic_is_admin = "true"/"false"
  slicematic_admin_view_customer = "true"/"false"
     ↓
null → EntryPortal (choose: Customer / Guest / Admin)
"false" → SliceMaticStage3 (guest mode, intake required)
"true" (admin) → redirect /admin-dashboard
"true" (customer) → SliceMaticStage3 (logged in, auto-recommend)
```

**SessionStorage Keys (complete list):**
```
slicematic_customer_logged_in   "true" | "false"
slicematic_is_admin             "true" | "false"
slicematic_admin_view_customer  "true" | "false"
slicematic_customer_email       email string
slicematic_customer_id          UUID string
slicematic_customer             JSON CustomerDetails
slicematic_workspace            "account" | undefined
slicematic_refresh_orders       "1" | undefined
slicematic-storage              Zustand persisted JSON
```

---

## Data Flow: Order Placement

```
User fills intake form
     ↓
validateCustomer() → lib/pricing.ts
     ↓ pass
User browses menu → adds to cart (Zustand: cart[])
     ↓
User selects payment: Cash | Card | UPI
     ↓
Cash → POST /api/orders
UPI  → POST /api/payments/cashfree/create-order → Cashfree SDK → redirect → return → POST /api/payments/cashfree/verify
Card → POST /api/payments/razorpay/create-order → Razorpay SDK → verify
     ↓
Order saved to Supabase → confirmation page
```

---

## Data Flow: Recommendations

```
Customer logs in (with phone number)
     ↓
Auto-trigger: POST /api/recommend
  body: { name, phone, customer_id }
     ↓
API fetches customer order history from Supabase
  → if returning: analyzes history, builds prompt
  → if new: uses global popularity fallback
     ↓
Calls OpenRouter LLM (lib/ai.ts)
     ↓
Returns: { pizzaId, toppingId, pizzaName, toppingName, reason, confidence, source, customerTier }
     ↓
Stored in Zustand: recommendation
     ↓
Displayed in account page "Personalized picks" card
```

---

## Supabase Schema (Key Tables)

```sql
customers          -- id (UUID), email, phone, name, created_at
orders             -- id, customer_id(FK), payment_mode, status, totals...
order_lines        -- id, order_id(FK), pizza_name, base_name, size_name, toppings[], quantity, line_total
recommendations    -- id, customer_id(FK), pizza_id, topping_id, confidence, source, created_at
outlet_settings    -- key, value (JSON) -- stores pricingConfig
menu_items         -- pizzas, bases, toppings (available flag)
```

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | ^14.2.23 |
| Language | TypeScript | ^5.5.4 |
| Styling | Vanilla CSS | — |
| State | Zustand | ^5.0.14 |
| Database | Supabase / Postgres | — |
| Icons | Lucide React | ^0.468.0 |
| Charts | Recharts | ^2.15.0 |
| Payments | Cashfree + Razorpay | — |
| AI/LLM | OpenRouter | — |
| Testing | Vitest | ^2.1.0 |
| Node | ≥ 20 | — |

---

## 2026-07-16 frontend restructure direction

The baseline above is still the current runtime shape. Future FullStack UI work should follow `FullStack/plans/frontend-architecture-restructure.md`.

Target direction:

- Keep `app/**/page.tsx` files as thin route composition shells.
- Extract customer menu/cart/recommendation/customize flows into feature folders under `features/`.
- Extract checkout and payment provider orchestration into `features/checkout/`.
- Extract confirmation/tracking into `features/confirmation/`.
- Extract each admin tab into `features/admin/{overview,orders,menu,settings,forecast,ai}/`.
- Move reusable primitives into `components/ui/` and shell layout into `components/layout/`.
- Use URL search params for visible admin state such as `tab`, filters, nested settings/menu page, and pagination.
- Use Zustand only for durable client session/checkout state, not for all server data or transient UI state.

The Dual-File Rule stays active until shared customer/admin UI is actually extracted and duplicate sections are removed.

*Last updated: 2026-07-16*
