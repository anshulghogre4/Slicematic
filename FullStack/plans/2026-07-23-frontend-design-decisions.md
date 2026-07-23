---
title: Frontend design decisions (Final)
status: active
owner: SliceMatic FullStack team
created: 2026-07-23
updated: 2026-07-23
related:
  - landing-page-vision.md
  - ui-inspiration-research.md
  - frontend-architecture-restructure.md
  - ui-ux-improvement-plan.md
---

# Frontend design decisions — Final (2026-07-23)

## 1. Tailwind CSS v4 — adopt now (bridge, not big-bang)

**Decision: Install Tailwind CSS v4 + PostCSS plugin now. Migrate screens gradually.**

| Was | Now |
|---|---|
| Deferred indefinitely | **Installed** (`tailwindcss`, `@tailwindcss/postcss`, `postcss`) |
| `globals.css` only | `@import "tailwindcss"` at top of `globals.css` + keep legacy `sui-*` rules |

**Rules:**

1. New greenfield surfaces (landing) prefer Tailwind utilities + daisyUI components.  
2. Existing Orders / OCP / checkout keep working CSS classes; convert opportunistically.  
3. Semantic colors stay bridged: map daisy `--color-primary` → SliceMatic tomato; do not invent a second brand palette.  
4. Never rewrite admin tables to utility soup in one PR.

## 2. daisyUI + `data-theme` (theme system of record)

**Decision: daisyUI 5 themes drive `html[data-theme]`.** Custom themes:

- `slicematic` — light, `--default`  
- `slicematic-dark` — dark, `--prefersdark`

**ThemeToggle** writes `document.documentElement.dataset.theme` to one of those names and persists `localStorage: slicematic_theme`.

Legacy `[data-theme="dark"]` / `[data-theme="light"]` aliases remain as fallbacks mapped to the same token overrides.

AppHeader / landing both use the same toggle. Customer + admin share one theme.

## 3. Auth vs marketing routes

**Decision (locked with landing vision):**

| Route | Role |
|---|---|
| `/` | Marketing landing when logged out; CustomerShell when logged in |
| `/signin` | EntryPortal only (email → OTP). Sole login form |
| Hero CTA **Sign in** | `router.push("/signin")` |

## 4. Landing motion libraries (landing route only)

See [landing-page-vision.md](landing-page-vision.md) §5.

| Phase | Stack |
|---|---|
| Bridge | No GSAP/Lenis required |
| R1 | `gsap` + `lenis` (ScrollTrigger sync per Lenis README) |
| Micro | Prefer Framer Motion already in app **or** Anime.js on landing — not both in one tree |
| R2 | Lottie; optional Rive/Spline after LCP gate |

**Do not** load Lenis/GSAP on `/signin`, payment, confirmation, or admin.

## 5. Dispatch tab vs Orders mode

**Unchanged:** Defer UI. Honest OCP placeholder. Prefer Orders filter/drawer when S2 lands.

## 6. Illustration / asset strategy

- Customer + landing: real menu photography under `public/assets/`  
- Admin: Lucide + glass cards  
- No fake rider GPS imagery until S2–S3  

## 7. Admin consistency recipe

Unchanged: `admin-page-head` + `admin-glass-card` + `FadeInUp` + skeletons + no invented Delivery columns.

## 8. Remaining FE items — decided

| Item | Decision | Applied? |
|---|---|---|
| Tailwind | v4 bridge now | Yes |
| daisyUI themes | `slicematic` / `slicematic-dark` + ThemeToggle | Yes |
| `/signin` OTP split | Extract EntryPortal | Yes |
| Thin landing shell | Brand + Sign in CTA | Yes (no cinematic GSAP yet) |
| Full GSAP/Lenis landing | Landing R1 ticket | Deferred |
| shadcn/ui full kit | Optional later; daisyUI covers theme/toggle first | Deferred |
| App-wide Tailwind rewrite | No | Deferred |

## 9. Explicit non-goals

- Schema / delivery invention  
- Big-bang Tailwind rewrite of Orders  
- OTP fields on the marketing hero  
- Installing GSAP/Lenis before Landing R1 photography + LCP budget  

---

**Source docs for motion:** [GSAP v3](https://gsap.com/docs/v3/) · [Anime.js](https://animejs.com/documentation/) · [Lenis](https://github.com/darkroomengineering/lenis)
