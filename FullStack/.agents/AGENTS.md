# SliceMatic — Agent Rules (AGENTS.md)
# Read by: Antigravity, Claude Code, Cursor, and all AI agents

---

## 🧠 MANDATORY FIRST STEP — Read the Wiki

**Before doing ANYTHING, read these files:**

1. `wiki/index.md` — master project map
2. `wiki/handoff.md` — what was done last session, what's next
3. Read the specific wiki page for your task area

The wiki is at: `f:\Preparation\FDE_Slicemate\Slicematic\wiki\`

---

## ⚡ Critical Rules (Non-Negotiable)

### 1. The Dual-File Rule
`SliceMaticStage3.tsx` and `app/admin-dashboard/page.tsx` are near-identical twins.  
**ANY change to shared UI sections MUST be applied to BOTH files.**

Shared sections requiring sync:
- `renderCustomerAccount()` function
- The 3-info-card section (Personalized picks, Easy login, Full payment choice)
- Customer auth views (login, forgot, reset)
- Order history widget

**Failure to sync both files = broken UI. This is the #1 source of bugs.**

### 2. CSS Rules
- **NEVER use Tailwind** — not even a single class
- All styles go in `FullStack/app/globals.css`
- All new design tokens go in the `:root {}` block at the top of globals.css
- Check `wiki/css-system.md` for existing classes before creating new ones
- Never add inline styles for layout — use existing CSS classes

### 3. State Management
- Global state = Zustand (`lib/store.ts`) persisted to `sessionStorage`
- Auth state = manual sessionStorage keys (see `wiki/auth-flows.md`)
- Never use `localStorage` for session data (sessionStorage only)

### 4. Supabase is Optional
- All features must gracefully degrade without Supabase
- Always check `hasSupabaseEnv()` before any DB call
- Fall back to `lib/seed-data.ts` for menu data

### 5. Business Rules are Locked
- Pricing constants in `lib/pricing.ts` match the graded spec — do NOT change values
- GST = 18%, Discount = 10% at qty >= 5, Max qty = 10
- Bill calculation order: subtotal → discount → taxable → GST → delivery → total
- See `wiki/business-rules.md` for full details

### 6. Changelog is Mandatory
Every session that changes code must add an entry to `FullStack/CHANGELOG.md`:
```
### [YYYY-MM-DD HH:MM:SS IST] - Short descriptive title
- What changed and why
- Files modified
```

### 7. Update the Handoff
At the end of every session, update `wiki/handoff.md` with:
- What was done
- Files changed
- Next steps

---

## 🛠️ Commands

```bash
# Working directory
cd f:\Preparation\FDE_Slicemate\Slicematic\FullStack

# Development
npm run dev          # Start dev server on port 3000

# Testing
npm run test         # Run all vitest tests
npm run test:watch   # Watch mode

# Build (only when asked)
npm run build

# Scripts
npm run forecast:refresh       # Refresh demand forecast
npm run seed:synthetic-orders  # Seed fake orders
npm run setup:storage          # Setup Supabase storage bucket
```

---

## 📁 Project Structure

```
Slicematic/                      ← repo root
├── wiki/                        ← LLM Wiki (shared brain for all agents)
│   ├── index.md                 ← START HERE
│   ├── handoff.md               ← read at start, update at end
│   ├── architecture.md
│   ├── components.md
│   ├── api-contracts.md
│   ├── css-system.md
│   ├── business-rules.md
│   ├── auth-flows.md
│   ├── decisions.md
│   └── knowledge-graph.md
├── FullStack/                   ← ACTIVE DEVELOPMENT (Next.js app)
│   ├── app/
│   │   ├── globals.css          ← ALL CSS GOES HERE
│   │   ├── page.tsx             ← Root route / entry point
│   │   ├── admin-dashboard/
│   │   │   └── page.tsx         ← Admin dashboard (DUAL-FILE TWIN)
│   │   ├── payment/             ← Checkout page
│   │   ├── confirmation/        ← Order tracking
│   │   └── api/                 ← All API routes
│   ├── components/
│   │   ├── SliceMaticStage3.tsx ← Main customer component (DUAL-FILE TWIN)
│   │   ├── CustomerOrderHistoryTable.tsx
│   │   ├── EntryPortal/
│   │   └── admin/
│   ├── lib/
│   │   ├── types.ts             ← All TypeScript types
│   │   ├── store.ts             ← Zustand state
│   │   ├── pricing.ts           ← Business rules / bill calculation
│   │   ├── data-service.ts      ← All DB operations
│   │   ├── supabase.ts          ← Supabase client factory
│   │   └── seed-data.ts         ← Fallback menu data
│   ├── CHANGELOG.md             ← MUST update after each session
│   └── .agents/AGENTS.md        ← THIS FILE (workspace-scoped)
├── CLAUDE.md                    ← Claude Code specific rules
├── gradio-MVP/                  ← Stage 2 app A (do not modify for Stage 3 work)
├── GRADIO-MVP-2/                ← Stage 2 app B (do not modify for Stage 3 work)
├── documents/                   ← Stage 1 PRD + architecture docs
└── db/                          ← Supabase SQL schema
```

---

## 🧩 Key Type Reference

```typescript
// lib/types.ts — memorize these
PaymentMode = "Cash" | "Card" | "UPI"
MenuItem    = { id, code, name, price, description?, image?, badge?, tags?, available }
CartLine    = { id, pizzaId, baseId, sizeId, toppingIds[], quantity }
CustomerDetails = { name, phone, address, deliveryZone?, note? }
PricingConfig   = { gstRate, bulkDiscountRate, bulkDiscountQty, maxOrderQty, deliveryFee, freeDeliveryMin, activeDeliveryZone, guestCashAllowed }
Recommendation  = { pizzaId, toppingId, pizzaName, toppingName, reason, confidence, source, customerTier }
```

---

## 🔍 Skills to Check Before Working

Before implementing features from scratch, check `FullStack/.agents/skills/`:
- `supabase-postgres-best-practices` — for any DB schema or query work
- Code review and frontend skills for architectural changes

---

## 🚫 Never Do These

- Never hardcode menu item names, prices, or IDs
- Never use `localStorage` for session auth data (use `sessionStorage`)
- Never add Tailwind CSS classes
- Never change pricing constants without reading the PRD in `documents/`
- Never let unhandled exceptions reach the UI
- Never modify `gradio-MVP/` or `GRADIO-MVP-2/` when working on Stage 3
- Never commit secrets from `.env` or `.mcp.json` to logs or new files

---

*This file is read by Antigravity, Claude Code, Cursor, and all agents.*  
*Last updated: 2026-07-06*
