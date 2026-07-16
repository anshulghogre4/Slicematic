# SliceMatic UI/UX Improvement Plan

Based on a craft-first audit of the current codebase using the interface-design skill.

## Current State Assessment

**Tokens:** Good foundation — `--ink`, `--paper`, `--tomato`, `--basil`, `--gold`, `--blue` are domain-appropriate (pizza kitchen world). But only 2 text hierarchy levels (primary + muted), missing tertiary/metadata tier.

**Depth:** Mixed — EntryPortal uses shadows, admin uses borders, customer app uses both. Needs consistency.

**Typography:** Inter only, size-based hierarchy. Weight/color levers underused.

**Spacing:** 8px base but inconsistent — some inline styles use `1rem`, `0.5rem`, `14px` randomly.

**States:** Missing loading skeletons, hover states on recommendation cards, empty states for order history.

---

## Priority 1: Quick Wins (high impact, low effort)

### 1.1 Loading skeleton for recommendation step
**Problem:** When auto-fire recommendation is loading, the UI shows "Reading order history..." text only — no visual feedback that AI is working.
**Fix:** Add a skeleton/spinner card with animated pulse while `/api/recommend` is loading.
**File:** `SliceMaticStage3.tsx` — recommendation step, `globals.css`

### 1.2 Recommendation card hover + press states
**Problem:** Recommendation cards have no hover/active feedback — feels static.
**Fix:** Add `transform: translateY(-2px)` on hover, `scale(0.98)` on active, subtle shadow lift.
**File:** `globals.css` — `.recommendation-card`

### 1.3 Tabular numbers on all prices/totals
**Problem:** Prices shift width when loading — `Rs. 588` vs `Rs. 3,473` causes layout jump.
**Fix:** Add `font-variant-numeric: tabular-nums` to `.money`, `.order-row`, `.kpi-grid strong`, `.summary b`.
**File:** `globals.css`

### 1.4 Text wrapping optimization
**Problem:** Headlines and reasons can orphan single words.
**Fix:** Add `text-wrap: balance` to headings, `text-wrap: pretty` to body text.
**File:** `globals.css`

### 1.5 Font smoothing
**Problem:** Text renders heavy on macOS browsers.
**Fix:** Add `-webkit-font-smoothing: antialiased` to `body`.
**File:** `globals.css`

---

## Priority 2: Structural Improvements (medium effort)

### 2.1 Add tertiary text hierarchy level
**Problem:** Only `--ink` (primary) and `--muted` exist. Metadata like timestamps, confidence %, and source tags need a third tier.
**Fix:** Add `--tertiary: #9a948c` token and `.text-tertiary` utility class.
**File:** `globals.css`

### 2.2 Consistent depth strategy
**Problem:** EntryPortal uses shadows, admin uses borders, customer app mixes both.
**Fix:** Commit to "borders + subtle shadows" everywhere. Cards get `0 0 0 1px rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.06)`. Remove heavy `--shadow` from non-modal elements.
**File:** `globals.css`

### 2.3 Concentric border radius
**Problem:** Parent and child elements often share the same `8px` radius — looks flat.
**Fix:** Parent cards `12px`, inner elements `8px`, buttons `6px`. Add `--radius-sm: 6px`, `--radius-md: 8px`, `--radius-lg: 12px`.
**File:** `globals.css`

### 2.4 Order history empty state
**Problem:** "No past orders found. Place your first order today!" is plain text — no visual.
**Fix:** Add an icon + illustration + CTA button for empty order history.
**File:** `SliceMaticStage3.tsx` — `renderCustomerAccount()`

### 2.5 Admin order table row hover
**Problem:** Order table rows have no hover state — hard to scan.
**Fix:** Add `background: var(--panel-soft)` on `.order-row:hover` (not head).
**File:** `globals.css`

---

## Priority 3: Polish & Motion (higher effort)

### 3.1 Recommendation card entrance animation
**Problem:** 3 recommendation cards appear all at once — no stagger.
**Fix:** Stagger entrance with `animation-delay: calc(var(--i) * 80ms)` on each card. Use `cubic-bezier(0.23, 1, 0.32, 1)` ease-out.
**File:** `globals.css`, `SliceMaticStage3.tsx` (add `style={{ '--i': idx }}`)

### 3.2 Toast animation improvement
**Problem:** Toast appears instantly with no animation.
**Fix:** Slide up from bottom with `transform: translateY(100%)` → `translateY(0)`, 200ms ease-out.
**File:** `globals.css` — `.toast`

### 3.3 Button press feedback
**Problem:** Buttons have `translateY(-1px)` on hover but no `:active` feedback.
**Fix:** Add `transform: scale(0.97)` on `button:active`.
**File:** `globals.css`

### 3.4 Pizza card image hover zoom
**Problem:** Pizza images are static — no engagement cue.
**Fix:** Add `transform: scale(1.05)` on `.pizza-media img` when `.pizza-card:hover`, with `overflow: hidden` on parent. 300ms ease.
**File:** `globals.css`

### 3.5 Focus-visible styles for keyboard navigation
**Problem:** No visible focus rings on buttons/inputs — accessibility gap.
**Fix:** Add `:focus-visible { outline: 2px solid var(--basil); outline-offset: 2px; }` globally.
**File:** `globals.css`

---

## Priority 4: Architectural (for demo polish)

### 4.1 Split SliceMaticStage3.tsx
**Problem:** 2,600+ lines in one file — unmaintainable, slow to edit.
**Fix:** Extract `AdminOverview`, `ForecastPanel`, `OrderTable`, `AIPanel`, `renderCustomerAccount` into separate component files.
**Impact:** Maintainability, not visible to user.

### 4.2 Responsive recommendation cards
**Problem:** Recommendation cards stack vertically on mobile but don't adapt well.
**Fix:** Use `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))` for `.recommendation-list` on desktop, single column on mobile.
**File:** `globals.css`

### 4.3 Admin dashboard dark mode support
**Problem:** No dark mode — admin dashboard is bright only.
**Fix:** Add `@media (prefers-color-scheme: dark)` overrides for all tokens.
**Impact:** Demo polish, evaluator comfort.

---

## Recommended Implementation Order

1. **Quick wins first** (1.1–1.5): ~30 min, immediate visual improvement
2. **Structural** (2.1–2.5): ~1 hour, consistency and hierarchy
3. **Polish** (3.1–3.5): ~1 hour, motion and accessibility
4. **Architectural** (4.1–4.3): Optional, for long-term maintainability

## Token Summary (proposed additions)

```css
:root {
  /* Existing tokens stay */
  --tertiary: #9a948c;        /* metadata, timestamps, source tags */
  --radius-sm: 6px;           /* buttons, inputs */
  --radius-md: 8px;           /* cards, panels (current default) */
  --radius-lg: 12px;          /* modals, hero cards */
  --shadow-card: 0 0 0 1px rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.06);
  --shadow-card-hover: 0 0 0 1px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.08);
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
}
```
