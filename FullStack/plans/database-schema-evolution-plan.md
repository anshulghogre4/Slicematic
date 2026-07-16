---
title: SliceMatic Database Schema Evolution Plan
status: draft-for-review
owner: SliceMatic FullStack team
created: 2026-07-16
scope: Supabase/Postgres schema, RLS, delivery, forecasting, AI, preferences, activity, frontend joins
---

# SliceMatic Database Schema Evolution Plan

This plan reviews the current Supabase schema and proposes the database changes needed for the planned FullStack work: preferences/activity utilization, delivery fee quotes, rider assignment, live tracking, forecast refresh, AI service extraction, voice/menu assistant, and the frontend architecture revamp.

This is a planning document only. Do not apply SQL from this document directly without turning it into ordered migrations, tests, RLS checks, and rollback notes.

## Sources Reviewed

Repository evidence:

- `FullStack/supabase/schema.sql`
- `FullStack/lib/data-service.ts`
- `FullStack/lib/store.ts`
- `FullStack/wiki/database-schema.md`
- `FullStack/wiki/auth-flows.md`
- `FullStack/wiki/api-contracts.md`
- `FullStack/plans/fullstack-delivery-intelligence-sprints.md`
- `FullStack/plans/frontend-architecture-restructure.md`

Official Supabase references:

- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase RLS performance recommendations: https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-recommendations
- Supabase Tables and primary keys: https://supabase.com/docs/guides/database/tables#primary-keys
- Supabase foreign keys: https://supabase.com/docs/guides/database/tables#foreign-keys

Key Supabase guidance to apply:

- Enable RLS on API-exposed tables.
- When RLS is enabled, publishable-key access gets no rows until policies allow access.
- Service keys can bypass RLS and must never be exposed to browsers.
- Policies behave like an implicit `WHERE` clause on every query.
- Index columns used inside RLS policies.
- Give every table a primary key.
- Use foreign keys for joins/relationships.

## Current Schema Summary

Current durable tables:

| Table | Current role |
|---|---|
| `pizza_types` | Pizza catalogue |
| `pizza_bases` | Crust catalogue |
| `pizza_sizes` | Size catalogue |
| `toppings` | Topping catalogue |
| `customer` | Customer profile keyed by mobile/email |
| `orders` | Order header, payment, totals, address |
| `order_item` | Order line item |
| `order_item_topping` | Order line item toppings |
| `customer_activity` | Existing but underused event table |
| `customer_preference` | Existing but underused per-customer summary |
| `recommendation_event` | Recommendation display/action event |
| `daily_sales_fact` | Historical analytics/forecast placeholder |
| `outlet_settings` | JSON settings, currently pricing config |
| `user_roles` | Auth user role mapping |

Current good foundations:

- Menu tables are normalized.
- Orders and order lines have foreign keys.
- `customer_activity` and `customer_preference` already exist, so recommendation personalization does not need to start from zero.
- `recommendation_event` exists and can become the AI attribution table.
- `outlet_settings` gives a safe place for low-frequency config, especially while schema is evolving.

Current drift/risk:

- Wiki still mentions `order_lines` and `recommendations`; source schema uses `order_item`, `order_item_topping`, and `recommendation_event`.
- `user_roles.user_id` is a primary key but does not currently reference `auth.users(id)`.
- `customer` does not link to `auth.users(id)`, so customer-owned RLS is awkward.
- RLS policies for admin reads use `using (true)` for any authenticated user.
- RLS policies named `server read ...` use `using (true)`, which can expose customer/order data if anon/authenticated roles have table privileges.
- Current grants give broad table privileges to `anon` and `authenticated`; RLS blocks some actions, but broad grants plus broad policies should be tightened before production review.
- `daily_sales_fact` is useful historically, but the Random Forest refresh workflow needs explicit run/point persistence if it becomes an operational dashboard feature.

## Production RLS Review

### Current policy issue

Current examples from `schema.sql`:

```sql
create policy "authenticated admin read orders"
on slicematic.orders for select to authenticated using (true);

create policy "server read orders for order history"
on slicematic.orders for select using (true);
```

These are acceptable for a demo only. In production they are too broad:

- Any Supabase-authenticated user could read admin data if the table is directly accessible.
- Policies without a `to` clause apply more broadly than intended.
- `using (true)` on customer/order data does not enforce ownership.

### Target RLS posture

Target rule:

> Public browser access should read only the public menu. Customer/order/admin data should be accessed through authenticated ownership policies or server route handlers using service role. Service role must stay server-only.

Recommended policy helpers:

```sql
create or replace function slicematic.is_admin()
returns boolean
language sql
stable
security definer
set search_path = slicematic, public
as $$
  select exists (
    select 1
    from slicematic.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  );
$$;
```

Admin read policy pattern:

```sql
create policy "admins can read orders"
on slicematic.orders
for select
to authenticated
using (slicematic.is_admin());
```

Customer-owned read pattern after adding `customer.auth_user_id`:

```sql
create policy "customers can read own profile"
on slicematic.customer
for select
to authenticated
using (auth.uid() is not null and auth.uid() = auth_user_id);
```

Order ownership pattern:

```sql
create policy "customers can read own orders"
on slicematic.orders
for select
to authenticated
using (
  exists (
    select 1
    from slicematic.customer c
    where c.customer_id = orders.customer_id
      and c.auth_user_id = auth.uid()
  )
);
```

RLS performance indexes needed:

- `customer(auth_user_id)`
- `user_roles(user_id, role)`
- `orders(customer_id, order_datetime desc)`
- `order_item(order_id)`
- `order_item_topping(order_item_id)`
- every new FK column used in policies or joins

## Proposed Schema Changes

### 1. Auth ownership hardening

#### Add `customer.auth_user_id`

Purpose:

- Link customer profile to Supabase Auth user.
- Enable customer-owned RLS without trusting request body `customer_id`.

Proposed additive change:

```sql
alter table slicematic.customer
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create unique index if not exists uq_customer_auth_user_id
  on slicematic.customer(auth_user_id)
  where auth_user_id is not null;

create index if not exists idx_customer_email on slicematic.customer(email);
```

Impact:

- Existing customers are not broken because the column is nullable.
- Backfill can happen during login/register when Supabase user id is known.
- Once stable, customer APIs should prefer `auth_user_id` ownership over raw `customer_id`.

#### Add FK to `user_roles`

```sql
alter table slicematic.user_roles
  add constraint user_roles_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
```

Migration caution:

- Check for orphan `user_roles.user_id` values before adding.
- If demo/admin users are not real Supabase auth users locally, keep this as a production migration step or add a precheck.

### 2. Preferences and activity

Existing tables:

- `customer_activity`
- `customer_preference`

Recommended table evolution:

```sql
alter table slicematic.customer_activity
  add column if not exists session_id text,
  add column if not exists order_id uuid references slicematic.orders(order_id) on delete set null,
  add column if not exists pizza_type_id integer references slicematic.pizza_types(pizza_type_id),
  add column if not exists source text not null default 'web'
    check (source in ('web', 'admin', 'ai_service', 'system'));

create index if not exists idx_customer_activity_customer_time
  on slicematic.customer_activity(customer_id, created_at desc);

create index if not exists idx_customer_activity_type_time
  on slicematic.customer_activity(activity_type, created_at desc);

create index if not exists idx_customer_activity_metadata
  on slicematic.customer_activity using gin (metadata);
```

Recommended `activity_type` values:

- `menu_viewed`
- `pizza_viewed`
- `customize_opened`
- `cart_added`
- `cart_removed`
- `recommendation_shown`
- `recommendation_accepted`
- `checkout_started`
- `order_placed`
- `voice_query`

Preference table additions:

```sql
alter table slicematic.customer_preference
  add column if not exists dietary_tags text[] not null default '{}',
  add column if not exists spice_preference text,
  add column if not exists preferred_size_id text references slicematic.pizza_sizes(size_id),
  add column if not exists last_ordered_at timestamptz,
  add column if not exists order_count integer not null default 0,
  add column if not exists preference_version integer not null default 1;
```

Best practice:

- Keep raw events in `customer_activity`.
- Keep derived summary in `customer_preference`.
- Do not make recommendations depend only on summary; always support deterministic fallback.

### 3. Delivery fee quotes and serviceability

New table: `delivery_fee_rule`

Purpose:

- Version delivery-fee formulas so old orders can explain which rule was used.

```sql
create table if not exists slicematic.delivery_fee_rule (
  delivery_fee_rule_id uuid primary key default gen_random_uuid(),
  rule_name text not null,
  base_fee numeric(10, 2) not null default 0 check (base_fee >= 0),
  per_km_fee numeric(10, 2) not null default 0 check (per_km_fee >= 0),
  free_delivery_min numeric(10, 2) not null default 0 check (free_delivery_min >= 0),
  max_service_distance_meters integer not null check (max_service_distance_meters > 0),
  eta_buffer_minutes integer not null default 10 check (eta_buffer_minutes between 0 and 120),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

New table: `delivery_quote`

Purpose:

- Store the server-authoritative distance, ETA, fee, and provider response used during checkout/payment.

```sql
create table if not exists slicematic.delivery_quote (
  delivery_quote_id uuid primary key default gen_random_uuid(),
  customer_id uuid references slicematic.customer(customer_id) on delete set null,
  order_id uuid unique references slicematic.orders(order_id) on delete set null,
  delivery_fee_rule_id uuid references slicematic.delivery_fee_rule(delivery_fee_rule_id),
  provider text not null default 'manual',
  destination_address text not null,
  destination_lat numeric(10, 7),
  destination_lng numeric(10, 7),
  distance_meters integer,
  duration_seconds integer,
  serviceable boolean not null default false,
  customer_delivery_charge numeric(10, 2) not null default 0 check (customer_delivery_charge >= 0),
  rider_fee_estimate numeric(10, 2) not null default 0 check (rider_fee_estimate >= 0),
  quote_status text not null default 'quoted'
    check (quote_status in ('quoted', 'accepted', 'expired', 'failed')),
  provider_payload jsonb not null default '{}',
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_delivery_quote_customer_time
  on slicematic.delivery_quote(customer_id, created_at desc);

create index if not exists idx_delivery_quote_order
  on slicematic.delivery_quote(order_id);
```

Optional additive order columns for snapshot/read performance:

```sql
alter table slicematic.orders
  add column if not exists delivery_quote_id uuid references slicematic.delivery_quote(delivery_quote_id),
  add column if not exists delivery_distance_meters integer,
  add column if not exists delivery_eta_minutes integer,
  add column if not exists delivery_fee_rule_id uuid references slicematic.delivery_fee_rule(delivery_fee_rule_id);
```

Migration caution:

- Avoid circular NOT NULL constraints between `orders` and `delivery_quote` at first.
- Start with nullable links; enforce stronger constraints after checkout flow is proven.

### 4. Order lifecycle and delivery tracking

New table: `order_status_event`

Purpose:

- Store append-only lifecycle events for customer timeline and admin audit.
- Avoid overloading `orders.order_status` with every event.

```sql
create table if not exists slicematic.order_status_event (
  event_id uuid primary key default gen_random_uuid(),
  order_id uuid not null references slicematic.orders(order_id) on delete cascade,
  event_type text not null check (
    event_type in (
      'placed',
      'accepted',
      'preparing',
      'ready',
      'assigned',
      'picked_up',
      'nearby',
      'delivered',
      'cancelled',
      'delayed',
      'failed'
    )
  ),
  actor_type text not null default 'system'
    check (actor_type in ('system', 'admin', 'rider', 'customer', 'provider')),
  actor_user_id uuid,
  note text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_order_status_event_order_time
  on slicematic.order_status_event(order_id, created_at desc);
```

New table: `rider`

```sql
create table if not exists slicematic.rider (
  rider_id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  phone text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_rider_auth_user_id
  on slicematic.rider(auth_user_id)
  where auth_user_id is not null;
```

New table: `delivery_assignment`

```sql
create table if not exists slicematic.delivery_assignment (
  assignment_id uuid primary key default gen_random_uuid(),
  order_id uuid not null references slicematic.orders(order_id) on delete cascade,
  rider_id uuid references slicematic.rider(rider_id) on delete set null,
  assignment_status text not null default 'offered'
    check (assignment_status in ('offered', 'accepted', 'rejected', 'picked_up', 'delivered', 'cancelled')),
  offered_at timestamptz not null default now(),
  accepted_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  rider_fee numeric(10, 2) not null default 0 check (rider_fee >= 0),
  created_by uuid,
  updated_at timestamptz not null default now()
);

create index if not exists idx_delivery_assignment_order
  on slicematic.delivery_assignment(order_id);

create index if not exists idx_delivery_assignment_rider_status
  on slicematic.delivery_assignment(rider_id, assignment_status);
```

New table: `rider_location_ping`

Purpose:

- Persist sparse location samples only when needed.
- Realtime live transport can be Supabase Realtime Broadcast; persistent storage should be limited for privacy.

```sql
create table if not exists slicematic.rider_location_ping (
  ping_id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references slicematic.delivery_assignment(assignment_id) on delete cascade,
  rider_id uuid not null references slicematic.rider(rider_id) on delete cascade,
  order_id uuid not null references slicematic.orders(order_id) on delete cascade,
  lat numeric(10, 7) not null,
  lng numeric(10, 7) not null,
  accuracy_meters numeric(8, 2),
  heading_degrees numeric(6, 2),
  speed_mps numeric(8, 2),
  captured_at timestamptz not null default now()
);

create index if not exists idx_rider_location_assignment_time
  on slicematic.rider_location_ping(assignment_id, captured_at desc);
```

Privacy note:

- Set a retention policy later, for example purge pings older than 7–30 days.
- Do not expose raw rider coordinates to public customers without assignment/order authorization.

### 5. Forecast run persistence

Current forecast is file-cache based:

- `scripts/forecast_model.py`
- `lib/generated/forecast-cache.json`
- `app/api/admin/forecast/refresh/route.ts`

New table: `forecast_run`

```sql
create table if not exists slicematic.forecast_run (
  forecast_run_id uuid primary key default gen_random_uuid(),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'succeeded', 'failed')),
  model_name text not null default 'RandomForestRegressor',
  feature_version text not null default 'weekday-hour-v1',
  order_watermark timestamptz,
  training_started_at timestamptz,
  training_finished_at timestamptz,
  bucket_count integer not null default 0,
  rmse numeric(10, 4),
  error_message text,
  created_by uuid,
  created_at timestamptz not null default now()
);
```

New table: `forecast_point`

```sql
create table if not exists slicematic.forecast_point (
  forecast_point_id uuid primary key default gen_random_uuid(),
  forecast_run_id uuid not null references slicematic.forecast_run(forecast_run_id) on delete cascade,
  forecast_for timestamptz not null,
  label text not null,
  predicted_orders numeric(10, 2) not null check (predicted_orders >= 0),
  predicted_revenue numeric(12, 2),
  rank integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_forecast_point_run_time
  on slicematic.forecast_point(forecast_run_id, forecast_for);
```

Admin UI can show:

- active run id
- last success
- stale indicator
- failed run error
- chart from latest succeeded run

### 6. AI and voice/menu assistant events

Existing:

- `recommendation_event`

Additions:

```sql
alter table slicematic.recommendation_event
  add column if not exists request_id uuid,
  add column if not exists input_context jsonb not null default '{}',
  add column if not exists response_payload jsonb not null default '{}',
  add column if not exists source text not null default 'openrouter'
    check (source in ('openrouter', 'fallback', 'rules'));
```

New table: `ai_interaction_event`

Purpose:

- One common event log for menu assistant, cart strategist, AI copy polish, ops briefing, and service health.

```sql
create table if not exists slicematic.ai_interaction_event (
  ai_event_id uuid primary key default gen_random_uuid(),
  customer_id uuid references slicematic.customer(customer_id) on delete set null,
  order_id uuid references slicematic.orders(order_id) on delete set null,
  feature_name text not null
    check (feature_name in ('recommendation', 'cart_strategist', 'menu_assistant', 'menu_copy', 'ops_briefing', 'forecast')),
  model_name text,
  prompt_version text,
  input_payload jsonb not null default '{}',
  output_payload jsonb not null default '{}',
  fallback_used boolean not null default false,
  latency_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_event_feature_time
  on slicematic.ai_interaction_event(feature_name, created_at desc);

create index if not exists idx_ai_event_customer_time
  on slicematic.ai_interaction_event(customer_id, created_at desc);
```

If voice/menu assistant becomes conversational, add:

```sql
create table if not exists slicematic.menu_assistant_session (
  menu_assistant_session_id uuid primary key default gen_random_uuid(),
  customer_id uuid references slicematic.customer(customer_id) on delete set null,
  session_id text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists slicematic.menu_assistant_message (
  message_id uuid primary key default gen_random_uuid(),
  menu_assistant_session_id uuid not null references slicematic.menu_assistant_session(menu_assistant_session_id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  transcript text not null,
  matched_pizza_type_id integer references slicematic.pizza_types(pizza_type_id),
  matched_topping_id integer references slicematic.toppings(topping_id),
  confidence numeric(5, 4),
  created_at timestamptz not null default now()
);
```

MVP recommendation:

- Start with `ai_interaction_event`.
- Add assistant session/message only when the UI supports multi-turn context.

## Updated Relationship Map

```text
auth.users
  ├─ user_roles.user_id
  ├─ customer.auth_user_id
  └─ rider.auth_user_id

customer
  ├─ orders.customer_id
  ├─ customer_preference.customer_id
  ├─ customer_activity.customer_id
  ├─ recommendation_event.customer_id
  ├─ delivery_quote.customer_id
  └─ ai_interaction_event.customer_id

orders
  ├─ order_item.order_id
  ├─ order_status_event.order_id
  ├─ delivery_quote.order_id
  ├─ delivery_assignment.order_id
  ├─ rider_location_ping.order_id
  └─ ai_interaction_event.order_id

order_item
  └─ order_item_topping.order_item_id

pizza_types / pizza_bases / pizza_sizes / toppings
  ├─ order_item
  ├─ order_item_topping
  ├─ customer_preference
  ├─ recommendation_event
  └─ menu_assistant_message

delivery_fee_rule
  ├─ delivery_quote.delivery_fee_rule_id
  └─ orders.delivery_fee_rule_id

rider
  ├─ delivery_assignment.rider_id
  └─ rider_location_ping.rider_id

forecast_run
  └─ forecast_point.forecast_run_id
```

## Migration Order

### Phase DB-0: Clean documentation drift

- Update `FullStack/wiki/database-schema.md` so it matches `order_item`, `order_item_topping`, and `recommendation_event`.
- Mark current broad RLS policies as demo-risk until tightened.

### Phase DB-1: Auth ownership and RLS foundation

- Add nullable `customer.auth_user_id`.
- Add indexes for `customer.auth_user_id`, `customer.email`, `user_roles(user_id, role)`.
- Add `slicematic.is_admin()` helper.
- Replace broad admin policies with role-checked policies.
- Remove or narrow public `server read ... using (true)` policies.

Do this before production review.

### Phase DB-2: Preference/activity capture

- Extend `customer_activity`.
- Extend `customer_preference`.
- Add event writes behind server routes only.
- Keep recommendation fallback deterministic.

### Phase DB-3: Delivery quote and fee rules

- Add `delivery_fee_rule`.
- Add `delivery_quote`.
- Add nullable order snapshot columns.
- Use quote table in customer details/cart/payment before any live rider work.

### Phase DB-4: Order lifecycle and admin dispatch

- Add `order_status_event`.
- Add `rider`.
- Add `delivery_assignment`.
- Add admin-only RLS policies.
- Build admin dispatch UI from these tables.

### Phase DB-5: Tracking pings and realtime

- Add `rider_location_ping`.
- Prefer private realtime broadcast for live motion.
- Persist sparse pings only with retention policy.

### Phase DB-6: Forecast and AI operational history

- Add `forecast_run` and `forecast_point`.
- Add `ai_interaction_event`.
- Optionally add menu assistant session/message tables after typed assistant MVP.

## RLS Policy Matrix

| Table | anon | authenticated customer | admin | service role |
|---|---|---|---|---|
| Menu tables | SELECT public available fields | SELECT | ALL via admin policy/server route | ALL |
| `customer` | none | own row only | SELECT via `is_admin()` | ALL |
| `orders` | none | own orders only | SELECT/UPDATE via `is_admin()` | ALL |
| `order_item*` | none | own order items through order ownership | SELECT via `is_admin()` | ALL |
| `customer_activity` | INSERT only via server route, not direct table | own read optional, no direct write initially | SELECT via `is_admin()` | ALL |
| `customer_preference` | none | own read optional | SELECT via `is_admin()` | ALL |
| `recommendation_event` | none direct | own read optional | SELECT via `is_admin()` | ALL |
| `delivery_quote` | none | own quote only | SELECT via `is_admin()` | ALL |
| `delivery_assignment` | none | maybe read current assignment for own order | SELECT/UPDATE via `is_admin()` | ALL |
| `rider_location_ping` | none | no raw direct read; use tracking endpoint | SELECT via `is_admin()` and assigned rider | ALL |
| `forecast_run/point` | none | none | SELECT/INSERT via `is_admin()` or server route | ALL |
| `ai_interaction_event` | none | own read optional | SELECT via `is_admin()` | ALL |

Safer MVP:

- Let browser read public menu only.
- Use Next.js API routes for all writes and sensitive reads.
- Keep service role key server-only.

## Index Checklist

Required immediately with new tables:

```sql
create index if not exists idx_customer_auth_user_id on slicematic.customer(auth_user_id);
create index if not exists idx_user_roles_user_role on slicematic.user_roles(user_id, role);
create index if not exists idx_order_item_order_id on slicematic.order_item(order_id);
create index if not exists idx_order_item_topping_order_item_id on slicematic.order_item_topping(order_item_id);
```

Required with delivery:

```sql
create index if not exists idx_order_status_event_order_time on slicematic.order_status_event(order_id, created_at desc);
create index if not exists idx_delivery_assignment_order on slicematic.delivery_assignment(order_id);
create index if not exists idx_delivery_assignment_rider_status on slicematic.delivery_assignment(rider_id, assignment_status);
create index if not exists idx_rider_location_assignment_time on slicematic.rider_location_ping(assignment_id, captured_at desc);
```

Required with forecast/AI:

```sql
create index if not exists idx_forecast_point_run_time on slicematic.forecast_point(forecast_run_id, forecast_for);
create index if not exists idx_ai_event_feature_time on slicematic.ai_interaction_event(feature_name, created_at desc);
```

## What Not To Break

- Do not rename `order_item` to `order_lines` without a migration and data-service update.
- Do not make `customer.auth_user_id` NOT NULL until guest checkout and existing customer backfill are solved.
- Do not add NOT NULL `delivery_quote_id` to `orders` until legacy orders are backfilled or exempted.
- Do not expose service role key to browser clients.
- Do not rely on `using (true)` RLS policies for customer/order/admin data in production.
- Do not persist raw rider location longer than the approved retention window.
- Do not remove current seed/fallback behavior until production Supabase env is stable.
- Do not let browser-supplied distance, fee, rider payout, or forecast results become trusted values.

## Review Questions Before SQL Implementation

1. Are customers always Supabase Auth users, or can guest orders remain unlinked?
2. Should customers directly read their order history through RLS, or only through `/api/customer/orders`?
3. Should delivery quotes expire after 10, 15, or 30 minutes?
4. What is the rider location retention period?
5. Should forecast results be generated only by admin action, scheduled job, or both?
6. Should AI interaction logs store full prompts/outputs, or sanitized summaries only?
7. Is `outlet_settings` JSON enough for provider config, or do we need a typed `delivery_provider_config` table after provider selection?

## Recommendation

Start with DB-1 before feature implementation:

1. Add customer/auth ownership links and indexes.
2. Replace broad RLS policies with ownership/admin policies.
3. Keep public direct access limited to menu reads.
4. Keep all sensitive writes behind Next.js server routes using existing environment guards.

Then implement DB-2 and DB-3 for preferences/activity and delivery quotes. Live rider tracking and forecast persistence should come after the fee/quote and RLS foundation is safe.
