# SliceMatic — Agent Rules (AGENTS.md)
# Read by: Antigravity, Claude Code, Cursor, and all AI agents

---

## MANDATORY FIRST STEP — Read the Wiki

**Before doing ANYTHING, read these files:**

1. `FullStack/wiki/index.md` — master project map
2. `FullStack/wiki/handoff.md` — what was done last session, what's next
3. `FullStack/plans/2026-07-21-next-horizon-sprint-plan.md` — active R13→R12→S0 queue
4. The specific wiki page for your task area

There is **no** repo-root `wiki/`. Canonical path is `FullStack/wiki/`.

---

## Critical Rules (Non-Negotiable)

### 1. Shells And Shared UI (updated 2026-07-21)

- Customer: `components/CustomerShell.tsx` (via `app/page.tsx`)
- Admin: `app/admin-dashboard/page.tsx`
- Shared presentation: `features/*` and `components/*`
- **`SliceMaticStage3.tsx` is deleted.** Do not revive dual-file sync against it.
- EntryPortal is the only login screen for every user type.

### 2. CSS / Design System

- Legacy CSS: `FullStack/app/globals.css`
- Prefer semantic tokens and `sui-*` primitives
- Tailwind CSS v4 is allowed only through a deliberate migration/design-system bridge (`wiki/css-system.md`). Do not mix random utilities onto unmigrated legacy screens.

### 3. State Management

- Global state = Zustand (`lib/store.ts`) persisted to `sessionStorage`
- Auth state = sessionStorage keys (`lib/session/storageKeys.ts`)
- Never use `localStorage` for session auth (Cashfree pending payment may use localStorage)

### 4. Supabase is Optional

- Features must degrade without Supabase
- Guard with `hasSupabaseEnv()` / null clients
- Fall back to `lib/seed-data.ts` for menu data
- Do not change `supabase/schema.sql` without S0 ADR + migrations

### 5. Business Rules are Locked

- Pricing constants in `lib/pricing.ts` match the graded spec
- GST = 18%, Discount = 10% at qty >= 5, Max qty = 10
- Bill calculation order: subtotal → discount → taxable → GST → delivery → total
- See `wiki/business-rules.md`

### 6. Writeback is Mandatory

For material FullStack changes:

1. Affected `wiki/*.md` pages
2. `wiki/handoff.md` + `wiki/log.md`
3. `FullStack/CHANGELOG.md`

### 7. Delivery Honesty

- Do not invent rider / ETA / live map data
- Confirmation and admin OrderTable show recorded kitchen status only until delivery schema exists

---

## Commands

```bash
cd FullStack
npm run dev
npm run test
npm run test:watch
npm run build
```

---

## Project Structure (current)

```
FullStack/
├── app/                 # routes: /, /payment, /confirmation, /admin-dashboard, api/**
├── components/          # CustomerShell, EntryPortal, AppHeader, admin/*, ui/*
├── features/            # admin-dashboard, customer-ordering, menu, checkout, order-tracking
├── lib/                 # pricing, store, data-service, auth, session helpers
├── plans/               # sprint SOT + next-horizon plan
├── wiki/                # LLM wiki
└── supabase/schema.sql  # DB source of truth
```

---

*Last updated: 2026-07-21*
