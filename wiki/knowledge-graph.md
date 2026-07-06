# 🔗 SliceMatic — Knowledge Graph

> Entity-Relationship map of the codebase. Use this to understand "what calls what" and "what breaks if I change X."

---

## Entity Nodes

```
[PAGES]
  / (app/page.tsx)
  /admin-dashboard (app/admin-dashboard/page.tsx)
  /payment (app/payment/page.tsx)
  /confirmation (app/confirmation/page.tsx)

[COMPONENTS]
  EntryPortal
  SliceMaticStage3
  CustomerOrderHistoryTable
  ForecastPanel
  RecommendationAIPanel

[LIB MODULES]
  lib/types.ts
  lib/store.ts
  lib/pricing.ts
  lib/supabase.ts
  lib/data-service.ts
  lib/seed-data.ts
  lib/session-customer.ts
  lib/customer-flow.ts
  lib/customer-auth.ts
  lib/admin-auth.ts
  lib/admin-tabs.ts
  lib/ai.ts
  lib/cashfree.ts
  lib/razorpay.ts
  lib/forecast-service.ts
  lib/recommendation-prompt.ts
  lib/outlet-settings.ts
  lib/db.ts

[API ROUTES]
  GET  /api/menu
  POST /api/orders
  POST /api/recommend
  GET  /api/health
  GET  /api/outlet
  GET  /api/admin/orders
  POST /api/admin/outlet/pricing
  GET  /api/customer/orders
  POST /api/payments/cashfree/create-order
  POST /api/payments/cashfree/verify
  POST /api/payments/razorpay/create-order
  POST /api/payments/razorpay/verify

[EXTERNAL SERVICES]
  Supabase (Auth + Database)
  Cashfree (UPI payments)
  Razorpay (Card payments)
  OpenRouter (LLM / AI)
```

---

## Relationship Edges

### Page → Component
```
/ ──renders──► EntryPortal (when no session)
/ ──renders──► SliceMaticStage3 (when customer session)
/admin-dashboard ──renders──► [admin UI] (from admin-dashboard/page.tsx)
```

### Component → Lib
```
SliceMaticStage3 ──imports──► lib/pricing.ts (calculateBill, validateCustomer, money)
SliceMaticStage3 ──imports──► lib/store.ts (useStore hook)
SliceMaticStage3 ──imports──► lib/types.ts (all types)
SliceMaticStage3 ──imports──► lib/seed-data.ts (fallback menu)
SliceMaticStage3 ──imports──► lib/session-customer.ts (applyOrderToSession)
SliceMaticStage3 ──imports──► lib/customer-flow.ts (CUSTOMER_FLOW_TABS, fetchOutletPricingConfig)
SliceMaticStage3 ──imports──► lib/admin-tabs.ts (ADMIN_TABS, adminTabLabel)
SliceMaticStage3 ──imports──► components/CustomerOrderHistoryTable.tsx
SliceMaticStage3 ──imports──► components/admin/ForecastPanel.tsx
SliceMaticStage3 ──imports──► components/admin/RecommendationAIPanel.tsx
```

### Component → API (fetch calls)
```
SliceMaticStage3 ──fetch GET──► /api/menu (on mount)
SliceMaticStage3 ──fetch POST──► /api/recommend (on customer login)
SliceMaticStage3 ──fetch POST──► /api/orders (cash order)
SliceMaticStage3 ──fetch POST──► /api/payments/cashfree/create-order (UPI)
SliceMaticStage3 ──fetch POST──► /api/payments/cashfree/verify (UPI return)
SliceMaticStage3 ──fetch GET──► /api/customer/orders (account page)
SliceMaticStage3 ──fetch GET──► /api/admin/orders (admin tab)
SliceMaticStage3 ──fetch POST──► /api/admin/outlet/pricing (admin settings)
```

### API Route → Lib
```
/api/orders ──uses──► lib/data-service.ts (saveOrder)
/api/orders ──uses──► lib/pricing.ts (validateOrderLines, calculateBill)
/api/orders ──uses──► lib/supabase.ts (getSupabaseServerClient)
/api/recommend ──uses──► lib/data-service.ts (getCustomerOrderHistory)
/api/recommend ──uses──► lib/ai.ts (callLLM)
/api/recommend ──uses──► lib/recommendation-prompt.ts (buildPrompt)
/api/customer/orders ──uses──► lib/data-service.ts (loadCustomerOrderHistoryByCustomerId)
/api/customer/orders ──uses──► lib/customer-auth.ts (requireCustomerOwnership)
/api/payments/cashfree/* ──uses──► lib/cashfree.ts
/api/payments/razorpay/* ──uses──► lib/razorpay.ts
/api/admin/orders ──uses──► lib/data-service.ts (buildAdminSummary)
/api/admin/orders ──uses──► lib/admin-auth.ts (verifyAdminToken)
/api/outlet ──uses──► lib/outlet-settings.ts
```

### Lib → External
```
lib/supabase.ts ──connects──► Supabase
lib/data-service.ts ──uses──► lib/supabase.ts (getSupabaseServerClient)
lib/data-service.ts ──fallback──► lib/seed-data.ts (when no Supabase)
lib/cashfree.ts ──calls──► Cashfree API
lib/razorpay.ts ──calls──► Razorpay API
lib/ai.ts ──calls──► OpenRouter API
```

### State Flow
```
lib/store.ts (Zustand) ──persisted to──► sessionStorage["slicematic-storage"]
SliceMaticStage3 ──reads/writes──► lib/store.ts
SliceMaticStage3 ──reads/writes──► sessionStorage (auth keys)
lib/session-customer.ts ──reads/writes──► sessionStorage (customer keys)
```

---

## Blast Radius Analysis

**If you change `lib/pricing.ts`:**
- All cart totals change
- Order placement validation changes
- Both `SliceMaticStage3.tsx` and `admin-dashboard/page.tsx` affected
- API routes `/api/orders`, `/api/payments/*/create-order` affected
- Tests in `lib/pricing.test.ts` must pass

**If you change `lib/types.ts`:**
- Everything that imports from it (ALL components + ALL lib files)
- Must rebuild TypeScript

**If you change `.account-grid` CSS:**
- Customer account page layout in both `SliceMaticStage3.tsx` and `admin-dashboard/page.tsx`
- Mobile responsive breakpoint at line ~2736 of globals.css

**If you change `/api/orders`:**
- Cash order placement flow
- Order confirmation page receives `SavedOrder`
- `applyOrderToSession()` in `lib/session-customer.ts`

**If you change `lib/store.ts`:**
- All state across the entire app
- sessionStorage persistence key: `"slicematic-storage"`
- Both component files read from this store

**If you change `renderCustomerAccount()` in one file:**
- MUST sync to the other file (dual-file rule)
- Affects: account page, 3-info-cards, order history widget

---

*Last updated: 2026-07-06*
