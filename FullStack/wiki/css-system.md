# 🎨 SliceMatic — CSS Design System

> Legacy CSS inventory plus the current token/component migration bridge.

---

## Current Status

The app currently uses legacy global CSS in `FullStack/app/globals.css`. This page documents that inventory so old screens remain stable while the new UI revamp moves toward a deliberate design-system bridge.

The old "vanilla CSS only / no Tailwind ever" rule is no longer current project direction. Tailwind CSS v4, or an equivalent token-driven component system, is allowed for new UI work when introduced through the migration plan in `FullStack/plans/ui-revamp-implementation-plan.md`, `FullStack/plans/frontend-architecture-restructure.md`, and the inspiration research in `FullStack/plans/ui-inspiration-research.md`.

## Core Rules

Current rules:

1. Existing legacy styles remain in `FullStack/app/globals.css` until a screen or component is intentionally migrated.
2. New UI work should use semantic tokens and shared primitives before one-off utility classes.
3. Tailwind CSS v4 is allowed only through a project-level design-system bridge: tokens, primitives, reusable variants, accessibility rules, and migration notes.
4. Do not mix random inline styles, long duplicated utility strings, and legacy classes on the same surface without extracting or documenting the bridge.
5. Dark mode is not currently implemented; if added, it must be token-driven.

Legacy baseline notes below describe how the current screens are styled today, not a restriction on the future migration target.

1. Most current design tokens live in `app/globals.css` inside the `:root {}` block.
2. Most current layout classes are in `app/globals.css`; check existing classes before duplicating a pattern.
3. **Tailwind CSS v4 + daisyUI 5 (2026-07-23):** `@import "tailwindcss"` + `@plugin "daisyui"` in `globals.css`. Themes: `slicematic` (default) and `slicematic-dark` (`--prefersdark`). ThemeToggle sets `html[data-theme]` and persists `localStorage: slicematic_theme`. Legacy `sui-*` CSS remains for app routes; landing may use daisyUI `btn` / utilities. See `plans/2026-07-23-frontend-design-decisions.md`.

---

## Design Tokens (`:root`)

```css
/* Colors */
--tomato: #c0392b;           /* Primary brand red */
--tomato-dark: #a93226;      /* Darker red for hover */
--accent: var(--tomato);     /* Alias */
--bg: #f5f5f0;               /* Page background */
--surface: #ffffff;          /* Card/panel background */
--line: #e8e5e0;             /* Border color */
--text: #1a1a1a;             /* Primary text */
--muted: #6b6b6b;            /* Secondary text */
--text-muted: var(--muted);  /* Alias */
--success: #27ae60;          /* Success green */
--danger: #c0392b;           /* Error red */

/* Spacing */
--radius: 10px;              /* Card border radius */
--radius-sm: 6px;            /* Small radius */

/* Shadows */
--shadow-soft: 0 2px 8px rgba(0,0,0,0.06);
--shadow-card: 0 4px 16px rgba(0,0,0,0.08);
```

---

## Layout Classes

### Account Page Layout

```css
/* The 3-card equal-width grid row */
.account-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

/* Card style inside the grid */
.account-grid article {
  display: grid;
  gap: 8px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: #fff;
  box-shadow: var(--shadow-soft);
  padding: 16px;
}

/* Order history widget spans all 3 columns */
.order-history-widget {
  grid-column: 1 / -1;
}

/* Hero section at top of account page */
.account-hero {
  display: grid;
  grid-template-columns: 1fr auto;
  /* ... */
}

/* Right-side action buttons in hero */
.account-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 280px;
}
```

---

### Common Layout Classes

| Class | Purpose |
|---|---|
| `.account-shell` | Wrapper for full account page |
| `.account-hero` | Top hero section (welcome + actions) |
| `.account-grid` | 3-column card grid |
| `.account-actions` | Right-side button stack |
| `.session-pill` | Email display pill (green) |
| `.auth-console` | Auth form wrapper |
| `.auth-card` | Login/register form card |
| `.hero-shell` | Main hero landing section |
| `.hero-card` | Full-width hero banner |
| `.intake-grid` | Customer intake 2-column layout |
| `.builder-panel` | Pizza builder 2-column layout |
| `.payment-grid` | Payment mode selector grid |
| `.kpi-grid` | Admin KPI cards row |
| `.chart-grid` | Admin chart section |
| `.settings-grid` | Admin settings 2-column layout |
| `.admin-section` | Admin page wrapper |

---

### Button Conventions

```css
/* Primary CTA (red) */
button.primary { background: var(--tomato); color: #fff; }

/* Danger action (logout, delete) */
button.danger-action { background: #fef2f2; color: var(--tomato); }

/* Text-only action */
button.text-action { background: none; color: var(--tomato); }

/* Default button — white with border */
button:not(.primary):not(.danger-action) {
  background: #fff;
  border: 1px solid var(--line);
}
```

---

### Icons

All icons from `lucide-react`. Standard icon size in grids:
```css
.account-grid svg {
  width: 24px;
  height: 24px;
  color: var(--tomato);
}
```

---

## Responsive Breakpoints

```css
/* Mobile: stacks all grids to 1 column */
@media (max-width: 768px) {
  .account-grid,
  .account-hero,
  .intake-grid,
  .builder-panel,
  .kpi-grid,
  .chart-grid,
  .settings-grid {
    grid-template-columns: 1fr;
  }
}
```

---

## CSS File Structure (`app/globals.css`)

```
Line 1-50:     CSS reset + base
Line 51-200:   Design tokens (:root), global elements
Line 201-500:  Typography, buttons, forms
Line 500-900:  Navigation, header, hero
Line 900-1200: Menu grid, pizza cards
Line 1200-1500: Builder, intake forms
Line 1500-1700: Checkout, payment
Line 1697-1722: Account page (.account-grid, .account-hero)
Line 1724+:    Auth forms, login card
Line 2680+:    Media queries (mobile responsive)
```

---

## Modern Revamp Additions

The upcoming revamp should add or map the following token families:

- `surface.canvas`, `surface.card`, `surface.elevated`, `surface.glass`, `surface.inset`
- `border.subtle`, `border.focus`
- `text.primary`, `text.secondary`, `text.tertiary`, `text.disabled`
- `accent.brand`, `accent.success`, `accent.warning`, `accent.danger`, `accent.info`
- `motion.fast`, `motion.base`, `motion.slow`
- `radius.control`, `radius.card`, `radius.panel`
- `shadow.card`, `shadow.floating`

Required primitive families:

- `Button`, `Card`, `Badge`, `StatusChip`, `MetricCard`, `Skeleton`
- `Dialog`, `Drawer`, `Tabs`, `Input`, `Select`
- `OrderJourneyRail`, `DeliveryFeeBreakdown`, `ForecastRefreshButton`, `AIHealthIndicator`, `MapPreviewPanel`, `EmptyState`

Motion rules:

- Routine motion under 300ms.
- Animate `transform` and `opacity` where possible.
- Avoid `transition: all`.
- Respect `prefers-reduced-motion`.

*Last updated: 2026-07-16*
