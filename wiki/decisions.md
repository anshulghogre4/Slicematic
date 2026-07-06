# 📋 SliceMatic — Architecture Decision Records

> WHY things are built the way they are. Read before proposing major changes.

---

## ADR-001: Dual-File Architecture (SliceMaticStage3 + admin-dashboard/page.tsx)

**Date:** Early Stage 3  
**Status:** Active

**Decision:** Keep customer workspace and admin workspace as two near-identical monolithic files rather than extracting shared components.

**Rationale:**
- Admin needs custom tab-based navigation that doesn't exist in customer view
- The visual divergence was deemed too complex to cleanly prop-drill
- Faster iteration speed during initial build
- Both files are large (~2700 lines each) — extracting shared logic is a future refactor goal

**Consequence:** Any shared UI section (customer account page, auth views) must be manually kept in sync between both files. This is a known tech debt.

**Future:** Consider extracting `renderCustomerAccount()` into a shared component when time permits.

---

## ADR-002: Supabase-Optional Architecture

**Date:** Stage 3  
**Status:** Active

**Decision:** All features must work without Supabase environment variables. Supabase is used as primary DB but the app falls back gracefully.

**Rationale:**
- Demo deployments may not have Supabase configured
- FDE Academy graders may not have DB access
- The app should show a functional UI always

**Implementation:**
- `lib/supabase.ts` exports `hasSupabaseEnv()` / `hasSupabaseAdminEnv()` guards
- API routes check these before attempting DB calls
- `lib/seed-data.ts` provides complete fallback menu data
- `lib/data-service.ts` returns empty arrays / null when Supabase unavailable

---

## ADR-003: Zustand Persisted to SessionStorage (not localStorage)

**Date:** Stage 3  
**Status:** Active

**Decision:** Zustand store is persisted to `sessionStorage`, not `localStorage`.

**Rationale:**
- Cart should not survive browser close (session intent)
- Prevents session data leaking between users on shared devices
- Admin and customer sessions should not bleed across tabs

**Consequence:** Each new browser tab starts fresh. Cart is lost on tab close.

---

## ADR-004: Monolithic Component Approach

**Date:** Stage 3  
**Status:** Active (tech debt acknowledged)

**Decision:** `SliceMaticStage3.tsx` is a single massive component with internal render functions rather than a tree of separate components.

**Rationale:**
- Rapid prototyping speed
- All state is co-located, avoiding prop drilling
- The entire customer workspace fits in one scroll

**Known trade-offs:**
- File is ~2700 lines — hard to navigate
- Testing individual sections requires full component mount
- Refactoring to proper component tree is a future goal

---

## ADR-005: Vanilla CSS Over Tailwind

**Date:** Stage 3  
**Status:** Firm (non-negotiable)

**Decision:** All styling uses hand-written Vanilla CSS in `app/globals.css`.

**Rationale:**
- Full design control without Tailwind's class noise
- Custom design tokens that don't need the Tailwind config
- `globals.css` serves as living documentation of the design system

**Rule:** No Tailwind classes anywhere. Not even `cn()` utilities. If you find Tailwind, remove it.

---

## ADR-006: OpenRouter as LLM Gateway

**Date:** Stage 3  
**Status:** Active

**Decision:** Use OpenRouter (not direct OpenAI/Anthropic) for AI recommendations.

**Rationale:**
- Single API key for multiple LLM providers
- Fallback to popularity-based recommendations when OpenRouter unavailable
- Cost control via model selection

**Fallback:** If OpenRouter call fails → `source: "fallback"` recommendation using order frequency.

---

## ADR-007: Cashfree Over Razorpay for Primary UPI

**Date:** Stage 3  
**Status:** Active

**Decision:** Cashfree is the primary UPI payment provider. Razorpay handles card.

**Rationale:**
- Cashfree has better UPI support in India
- Razorpay SDK was already partially integrated
- Two-provider approach covers all payment modes

---

*Last updated: 2026-07-06*
