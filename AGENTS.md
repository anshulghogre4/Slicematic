# AGENTS.md - Codex Rules for SliceMatic

Read this file automatically. It applies to all Codex sessions on this repo.

## Active Project Root

SliceMatic Stage 3 is the active project. Treat `FullStack/` as the working root for implementation, planning, wiki maintenance, screenshots, and UI design work.

Stage 1 and Stage 2 artifacts are reference-only unless the user explicitly asks for them:

- Stage 1: `documents/`, `Project_Requirements/`
- Stage 2: `gradio-MVP/`, `GRADIO-MVP-2/`
- Stage 3: `FullStack/` - active development

## Start Every Session By Reading The FullStack Wiki

Read these before material FullStack work:

1. `FullStack/wiki/index.md`
2. `FullStack/wiki/handoff.md`
3. `FullStack/wiki/AGENTS.md`
4. The task-specific wiki page, usually from `FullStack/wiki/index.md`

For UI work, also read:

- `FullStack/wiki/ui-map.md`
- `FullStack/wiki/components.md`
- `FullStack/wiki/css-system.md`

## Critical Implementation Rules

### Dual-File Rule

Shared customer/admin UI is duplicated in:

- `FullStack/components/SliceMaticStage3.tsx`
- `FullStack/app/admin-dashboard/page.tsx`

When editing shared sections, update both files or explicitly document why only one file changed. Verify with search before finishing.

### Styling And Design System

The legacy app uses `FullStack/app/globals.css`. New UI work may modernize the styling system, but do it deliberately:

- Tailwind CSS v4 is allowed for new design-system work if introduced through a migration plan.
- A stronger component system is allowed: semantic tokens, reusable UI primitives, CVA-style variants, accessible dialog/popover/select primitives, and typed utilities.
- Do not mix random inline styles, one-off utility soup, and legacy CSS without a bridge plan.
- Keep existing vanilla CSS stable until a screen or component is intentionally migrated.
- Prefer semantic tokens over hardcoded color values.

### Customer Experience Bar

Customer-facing screens should feel polished and alive:

- Use meaningful illustrations or product imagery where they clarify ordering, customization, delivery, or tracking.
- Add skeleton loaders for menu, recommendations, forecast, order lists, maps, tracking, and AI panels.
- Add tasteful motion: page/section entry, cart updates, modal transitions, map/rider progress, order timeline, and loading states.
- Respect `prefers-reduced-motion`.
- Keep animations under 300ms for routine UI and avoid `transition: all`.
- Maintain visible focus states, keyboard navigation, labels, `aria-live` for async state, and readable long-content behavior.

### Supabase

- Always guard DB calls with `hasSupabaseEnv()` or `hasSupabaseAdminEnv()`.
- Fall back gracefully when Supabase is absent.
- Do not weaken production auth while preserving demo behavior.

### Business Rules

Before pricing, checkout, delivery fee, or payout work, read:

- `FullStack/wiki/business-rules.md`

Bill formula:

```text
subtotal -> discount -> taxable -> GST -> delivery -> finalTotal
```

## Commands

Run from `FullStack/`:

```bash
npm run dev
npm run test
npm run test:watch
npm run build
```

Only run `npm run build` when asked or when risk justifies it.

## Required Writeback

After every material FullStack change:

1. Update affected `FullStack/wiki/*.md` pages.
2. Update `FullStack/wiki/handoff.md`.
3. Append to `FullStack/wiki/log.md`.
4. Update `FullStack/CHANGELOG.md` for code changes.
5. Refresh screenshots in `FullStack/wiki/assets/ui-map/` for material UI changes.

Changelog format:

```md
### [YYYY-MM-DD HH:MM:SS IST] - Title
- What changed
- Files: file1.tsx, file2.css
```

## Sensitive Files

Never echo secrets from:

- `.env`
- `FullStack/.env`
- `.mcp.json`
- `db/supabase.md`
- any credential-bearing local config

Environment variable names are fine; values are not.

## Git Hygiene

- Do not restore user-deleted root noise unless explicitly asked.
- Do not commit local runtime logs, `.codex/`, `.next/`, `node_modules/`, or generated caches.
- Plans and wiki artifacts for Stage 3 belong under `FullStack/`.

Last updated: 2026-07-16
