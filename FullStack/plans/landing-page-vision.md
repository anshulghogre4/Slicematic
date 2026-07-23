---
title: SliceMatic Landing Page Vision (Final)
status: final
owner: SliceMatic FullStack team
created: 2026-07-23
updated: 2026-07-23
scope: Marketing landing only — OTP/auth stays on /signin (EntryPortal)
sources:
  - https://gsap.com/docs/v3/
  - https://animejs.com/documentation/
  - https://github.com/darkroomengineering/lenis
  - ui-ux-pro-max (food delivery / hero-centric)
  - taste-skill (premium consumer landing)
related:
  - 2026-07-23-frontend-design-decisions.md
---

# SliceMatic Landing Page Vision — Final

**Design read:** Premium-consumer pizza landing for Delhi NCR guests and members, warm food brand language (tomato / basil / charcoal — not SaaS purple), hero-centric conversion, Sign-in → email OTP on a separate route.

**Dials (taste-skill):** `DESIGN_VARIANCE: 7` · `MOTION_INTENSITY: 6` · `VISUAL_DENSITY: 3`

**Implementation status:** **Landing R1 shipped (2026-07-23).** Vision + route contract locked. Cinematic motion is live: brand-first full-bleed hero over a hand-built SVG Delhi night scene, GSAP `MotionPathPlugin` scooter rider on a road ribbon, Lenis smooth scroll synced to `ScrollTrigger`, committed Lottie (`public/lottie/pizza-spin.json`, `steam.json`) via `lottie-react`, and an Order/Kitchen/Ride/Doorstep narrative + illustrated Signature slices. All screenshot/photo art removed (100% illustration). Fonts: Unbounded (display) + Hanken Grotesk (body). `prefers-reduced-motion` disables Lenis + heavy GSAP/Lottie loops; motion stays landing-only. Remaining/optional: R2 Rive/Spline hero object after LCP budget, trust section, ui-map PNG re-capture.

---

## 1. Product job

One composition that sells a single-outlet New Ashok Nagar pizza brand and routes people into auth — never into invented delivery GPS.

| Audience | Primary action | Destination |
|---|---|---|
| Member / returning | **Sign in** | `/signin` → EntryPortal email + OTP |
| Guest | **Continue as guest** (secondary) | `/signin` (same EntryPortal guest path) |
| Operator | Quiet footer link only | `/signin` then admin after OTP — **never** in the hero |

**Hard rule:** EntryPortal remains the **only** login form. Landing never embeds OTP fields.

---

## 2. Information architecture (locked)

```text
/                 Marketing landing (unauthorized)
                    ├─ Sign in ──────────────► /signin
                    └─ Continue as guest ───► /signin
/signin           EntryPortal (email → OTP) — sole auth UI
                  onComplete → CustomerShell (/) or /admin-dashboard
/admin-dashboard  Ops (unchanged)
/payment|/confirmation  App routes (unchanged)
```

Do **not** merge marketing into `CustomerShell`. Logged-in users hitting `/` skip the landing and enter the app shell (current session restore).

---

## 3. First viewport (hero budget)

Hero-centric pattern ([ui-ux-pro-max landing](https://)): full-bleed visual plane + minimal copy.

Allowed (max 4 text elements):

1. Brand mark + **SliceMatic** wordmark (hero-scale)  
2. One headline (≤ 2 lines)  
3. One supporting sentence (≤ 20 words)  
4. CTA group: primary **Sign in** + secondary **Continue as guest**

Banned in hero: stats, schedule, address blocks, promo chips, fake rider map, “Scroll” cues, version labels, AI-purple glows, three equal feature cards.

Brand test: remove the nav — page still reads SliceMatic.

---

## 4. Below-fold sections (one job each)

1. **How it works** — 3 steps: Sign in → Build pizza → Pay (honest; no live map)  
2. **Signature pizzas** — real `public/assets` menu photography  
3. **Trust** — outlet radius honesty, GST/discount clarity, payment modes (Cash/UPI/Card)  
4. **Footer** — outlet / hours / quiet admin path via Sign in  

Layout families must vary (taste-skill): no zigzag thrice; max 1 eyebrow per 3 sections; no em-dashes in copy.

---

## 5. Motion stack (from docs — landing only)

| Layer | Library | Role | Doc anchor |
|---|---|---|---|
| **Smooth scroll** | [Lenis](https://github.com/darkroomengineering/lenis) | Native-scroll wrapper; sticky/anchors keep working; drives GSAP sync | `lenis/react` or core + `import 'lenis/dist/lenis.css'` |
| **Scroll storytelling** | [GSAP v3](https://gsap.com/docs/v3/) + ScrollTrigger | Pin/scrub section choreography, hero text timeline, `gsap.context()` cleanup, `matchMedia()` for a11y | Core + ScrollTrigger; React: `useGSAP()` |
| **Micro motion** | [Anime.js v4](https://animejs.com/documentation/) **or** existing Framer Motion | Small CTA/press feedback, optional text scramble **once** | Prefer **one** micro engine on landing — do not mix Anime + Motion in the same component tree |
| **Lottie** | lottie-react (R1+) | One kitchen/dough loop, pause offscreen | Secondary |
| **Rive / Spline** | optional R2 | One interactive 3D/state machine max; static poster fallback | Progressive enhancement |

### Canonical Lenis ↔ GSAP sync (from Lenis README)

```js
const lenis = new Lenis();
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);
```

### Reduced motion (mandatory)

- `prefers-reduced-motion: reduce` → destroy Lenis (or `autoToggle` / stop), no ScrollTrigger scrub/pin, no Anime loops, still poster for any 3D.  
- ui-ux-pro-max: animate 1–2 key elements per view; duration 150–300ms for micro UI once inside the app shell.  
- Never `window.addEventListener("scroll")` — Lenis + ScrollTrigger / Motion `useScroll` only.

### What ships when

| Phase | Scope |
|---|---|
| **Bridge (now)** | `/` thin marketing shell + `/signin` EntryPortal; Tailwind/daisyUI theme; no Lenis/GSAP deps required yet |
| **Landing R1** | Install `gsap`, `lenis`; hero + how-it-works ScrollTrigger; photography; Lottie optional |
| **Landing R2** | Anime.js micro OR Rive/Spline after LCP budget (mobile mid-tier &lt; 2.5s) |

**Explicit:** Do **not** load Lenis/GSAP on `/signin`, `/payment`, admin, or CustomerShell. App shell keeps Framer Motion + `sui-*`.

---

## 6. Styling for landing

- Bridge: Tailwind v4 utilities + daisyUI themes via `data-theme` (see design decisions).  
- Map daisy primary to SliceMatic tomato; keep existing `sui-*` tokens for app routes.  
- Fonts: avoid Inter-as-hero-default on landing; use expressive display via `next/font` when R1 builds (ui-ux suggested culinary pairings — override serif if it fights brand; prefer strong sans display + Karla/body).  
- Dark mode: same `data-theme` as app (`slicematic` / `slicematic-dark` or light/dark aliases).

---

## 7. Accessibility & performance gates

- Contrast ≥ 4.5:1; visible focus; CTA ≥ 44×44px  
- Hero image `priority` / reserved aspect-ratio (CLS)  
- Captions if any video later; no emoji icons (Lucide already in repo)  
- Lighthouse: LCP &lt; 2.5s, INP &lt; 200ms, CLS &lt; 0.1 before R2 3D

---

## 8. Non-goals

- OTP fields on the landing  
- Fake Delivery / Rider / ETA marketing  
- Full app rewrite to Tailwind utilities in one PR  
- Voice / forecast widgets on marketing  
- Mixing GSAP + Anime.js + Motion inside one leaf component  

---

## 9. Acceptance criteria (Landing R1)

1. Unauthorized `/` is brand-first landing; Sign in → `/signin` OTP  
2. EntryPortal remains sole login form on `/signin`  
3. Lenis + GSAP ScrollTrigger synced; reduced-motion disables both  
4. No motion libraries on auth/app shells  
5. Screenshot in `wiki/assets/ui-map/` + ui-map row  
6. Pre-flight: zero em-dashes; max 1 marquee; hero stack discipline  

---

## 10. Suggested copy (working — no em-dashes)

- Headline: `Pizza from New Ashok Nagar`  
- Sub: `Customize toppings, see GST clearly, check out in minutes.`  
- Primary CTA: `Sign in`  
- Secondary: `Continue as guest`
