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
│  SliceMaticStage3.tsx  (customer workspace)             │
│  admin-dashboard/page.tsx  (admin workspace)            │
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

## 🔴 Critical: The Dual-File Pattern

**This is the most important architectural fact in this codebase.**

Two files contain almost identical code:

| File | Path | Role |
|---|---|---|
| `SliceMaticStage3.tsx` | `components/SliceMaticStage3.tsx` | Customer-facing app (rendered at `/`) |
| `page.tsx` (admin) | `app/admin-dashboard/page.tsx` | Admin dashboard (rendered at `/admin-dashboard`) |

**Why two files exist:** The admin dashboard needed admin-only features (order management, menu CRUD, analytics, settings) while sharing the same customer account UI. The components were not extracted into shared sub-components; instead both files are kept in sync manually.

**The rule:** Any change to shared UI sections (customer account page, auth flows, shared modals) **MUST be applied to both files**. Failure to do this causes UI inconsistency between customer and admin views.

**Shared sections (must sync both files):**
- `renderCustomerAccount()` function
- `account-grid` with 3 info cards (Personalized picks, Easy login, Full payment choice)
- Customer auth views (login, forgot, reset)
- Order history widget
- CSS class names for account layout

---

## Page / Route Map

```
/                        → app/page.tsx
                           → EntryPortal (if not logged in)
                           → SliceMaticStage3.tsx (customer logged in)
                           → redirect /admin-dashboard (admin logged in)

/admin-dashboard         → app/admin-dashboard/page.tsx
                           → Full admin dashboard with tabs

/payment                 → app/payment/page.tsx
                           → Checkout / payment selection

/confirmation            → app/confirmation/page.tsx
                           → Order tracking / confirmation
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

*Last updated: 2026-07-06*
