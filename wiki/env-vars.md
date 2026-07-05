# 🔑 SliceMatic — Environment Variables

> Reference for all required and optional env vars.  
> Full list in `FullStack/.env.example`. Actual secrets in `FullStack/.env` — never echo them.

---

## Required (Core App)

| Variable | Where Used | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-side only | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side only | Supabase admin key (bypasses RLS) |

**Without these:** App works in seed-data fallback mode. No persistence.

---

## AI / LLM

| Variable | Default | Purpose |
|---|---|---|
| `OPENROUTER_API_KEY` | — | OpenRouter gateway key |
| `OPENROUTER_MODEL` | `openai/gpt-oss-20b` | LLM model to use for recommendations |

**Without these:** Recommendations use popularity-based fallback (`source: "fallback"`).

---

## Payments — Cashfree (UPI)

| Variable | Purpose |
|---|---|
| `CASHFREE_APP_ID` | Cashfree merchant app ID |
| `CASHFREE_SECRET_KEY` | Cashfree secret key |
| `CASHFREE_ENV` | `sandbox` or `production` |

---

## Payments — Razorpay (Card)

| Variable | Purpose |
|---|---|
| `RAZORPAY_KEY_ID` | Razorpay key ID (public) |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret |
| `RAZORPAY_CONFIG_ID` | Razorpay checkout config ID |

---

## Demo Auth

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_DEMO_ADMIN_EMAIL` | `admin@slicematic.in` | Demo admin login email |
| `NEXT_PUBLIC_DEMO_ADMIN_PASSWORD` | `slicematic-demo` | Demo admin login password |

---

## Missing = Graceful Degradation

The app is designed so that missing env vars degrade gracefully:

```
No Supabase     → seed menu data, no order persistence, no order history
No OpenRouter   → fallback recommendations (popularity-based)
No Cashfree     → UPI payment will fail (show error to user)
No Razorpay     → Card payment will fail (show error to user)
No Demo creds   → Uses hardcoded defaults in source (not ideal for prod)
```

---

## Environment Scoping

```
NEXT_PUBLIC_*   → Bundled into client JS (visible in browser)
All others      → Server-only (never sent to browser)
```

**Security rule:** `SUPABASE_SERVICE_ROLE_KEY`, `CASHFREE_SECRET_KEY`, `RAZORPAY_KEY_SECRET` must never be prefixed with `NEXT_PUBLIC_`.

---

*Last updated: 2026-07-06*
