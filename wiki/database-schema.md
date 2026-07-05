# 🗃️ SliceMatic — Database Schema (Supabase / Postgres)

> All tables live under the `slicematic` schema (not public).  
> Source of truth: `FullStack/supabase/schema.sql`

---

## Schema: `slicematic`

### `pizza_types` (Pizzas)
```sql
pizza_type_id  integer PRIMARY KEY
code           text UNIQUE NOT NULL
pizza_name     text NOT NULL
price          numeric(10,2) >= 0
description    text
image_url      text
badge          text
tags           text[] DEFAULT '{}'
prep_minutes   integer (5–90) DEFAULT 24
is_available   boolean DEFAULT true
created_at     timestamptz
updated_at     timestamptz
```

### `pizza_bases` (Crusts)
```sql
base_id        integer PRIMARY KEY
code           text UNIQUE NOT NULL
base_name      text NOT NULL
price          numeric(10,2) >= 0
description    text
is_available   boolean DEFAULT true
```

### `toppings`
```sql
topping_id     integer PRIMARY KEY
code           text UNIQUE NOT NULL
topping_name   text NOT NULL
price          numeric(10,2) >= 0
is_available   boolean DEFAULT true
```

### `pizza_sizes`
```sql
size_id        text PRIMARY KEY  (e.g., "regular", "large")
size_name      text NOT NULL
extra_price    numeric(10,2) DEFAULT 0
detail         text
sort_order     integer DEFAULT 1
is_available   boolean DEFAULT true
```

### `customer`
```sql
customer_id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
first_name               text NOT NULL
last_name                text
mobile_number            text UNIQUE (regex: ^[6-9][0-9]{9}$)
email                    text
city                     text DEFAULT 'Delhi NCR'
state                    text DEFAULT 'Delhi'
country                  text DEFAULT 'India'
registration_date        timestamptz
preferred_contact_channel text DEFAULT 'Phone'
marketing_opt_in         boolean DEFAULT false
```

### `orders`
```sql
order_id         uuid PRIMARY KEY DEFAULT gen_random_uuid()
customer_id      uuid REFERENCES slicematic.customer
order_datetime   timestamptz
order_status     text DEFAULT 'Placed'
payment_method   text CHECK IN ('Cash', 'Card', 'UPI')
subtotal_amount  numeric(10,2)
discount_amount  numeric(10,2) DEFAULT 0
tax_amount       numeric(10,2) DEFAULT 0
delivery_charge  numeric(10,2) DEFAULT 0
final_amount     numeric(10,2)
city             text DEFAULT 'Delhi NCR'
delivery_address text NOT NULL
delivery_zone    text CHECK IN ('0-2', '2-4', '4-6')
customer_note    text
created_at       timestamptz
-- Payment fields:
razorpay_order_id   text
razorpay_payment_id text
cashfree_order_id   text
cashfree_payment_id text
payment_status      text CHECK IN ('paid', 'confirmed', 'failed')
```

### `order_lines`
```sql
order_line_id   uuid PRIMARY KEY
order_id        uuid REFERENCES slicematic.orders
pizza_name      text
base_name       text
size_name       text
toppings        text[]
quantity        integer > 0
unit_price      numeric(10,2)
line_total      numeric(10,2)
```

### `outlet_settings`
```sql
setting_key    text PRIMARY KEY
setting_value  jsonb NOT NULL
updated_at     timestamptz
```
Used for: `pricing_config` key → stores `PricingConfig` JSON

### `recommendations` (if exists)
```sql
recommendation_id  uuid PRIMARY KEY
customer_id        uuid REFERENCES slicematic.customer
pizza_id           integer
topping_id         integer
confidence         numeric
source             text ('openrouter' | 'fallback')
created_at         timestamptz
```

---

## Schema Naming Convention

DB column names use `snake_case`. TypeScript type names use `camelCase`.  
`lib/data-service.ts` maps between them (e.g., `pizza_type_id` → `id`, `base_name` → `name`).

Key mappings in `enrichPizza()` / `enrichBase()` / `enrichTopping()`:
```
DB: pizza_type_id → TS: id
DB: pizza_name    → TS: name
DB: base_name     → TS: name
DB: topping_name  → TS: name
DB: image_url     → TS: image
DB: is_available  → TS: available
DB: extra_price   → TS: extra
```

---

## Supabase Clients (lib/supabase.ts)

| Function | Key Used | When to Use |
|---|---|---|
| `getSupabaseBrowserClient()` | ANON_KEY | Client-side browser code |
| `getSupabaseServerClient()` | SERVICE_ROLE_KEY (or ANON fallback) | Server-side API routes |
| `getSupabaseAdminClient()` | SERVICE_ROLE_KEY only | Admin operations, bypasses RLS |
| `hasSupabaseEnv()` | checks URL + ANON_KEY | Guard before client-side fetch |
| `hasSupabaseAdminEnv()` | checks URL + SERVICE_ROLE_KEY | Guard before admin DB calls |

**RLS Note:** Admin client bypasses Row Level Security. Server client respects RLS.

---

## Forecast System

- **Model:** Python `RandomForestRegressor` (scikit-learn)
- **Script:** `scripts/forecast_model.py`
- **Cache:** `lib/generated/forecast-cache.json` (auto-generated, gitignored)
- **Refresh:** `npm run forecast:refresh` → calls Python script via `spawnSync`
- **Fallback:** `lib/seed-data.ts → seedForecast[]` if no cache exists
- **Features:** `weekday`, `hour`
- **Output:** `ForecastPoint[]` = `{ label: string, predictedOrders: number }`

---

*Last updated: 2026-07-06*
