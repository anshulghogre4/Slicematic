create extension if not exists pgcrypto;

create schema if not exists slicematic;

create table if not exists slicematic.pizza_bases (
  base_id integer primary key,
  code text not null unique,
  base_name text not null,
  price numeric(10, 2) not null check (price >= 0),
  description text,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists slicematic.pizza_types (
  pizza_type_id integer primary key,
  code text not null unique,
  pizza_name text not null,
  price numeric(10, 2) not null check (price >= 0),
  description text,
  image_url text,
  badge text,
  tags text[] not null default '{}',
  prep_minutes integer not null default 24 check (prep_minutes between 5 and 90),
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists slicematic.toppings (
  topping_id integer primary key,
  code text not null unique,
  topping_name text not null,
  price numeric(10, 2) not null check (price >= 0),
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists slicematic.pizza_sizes (
  size_id text primary key,
  size_name text not null,
  extra_price numeric(10, 2) not null default 0 check (extra_price >= 0),
  detail text,
  sort_order integer not null default 1,
  is_available boolean not null default true
);

create table if not exists slicematic.customer (
  customer_id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text,
  mobile_number text not null unique check (mobile_number ~ '^[6-9][0-9]{9}$'),
  email text,
  city text not null default 'Delhi NCR',
  state text not null default 'Delhi',
  country text not null default 'India',
  registration_date timestamptz not null default now(),
  preferred_contact_channel text not null default 'Phone',
  marketing_opt_in boolean not null default false
);

create table if not exists slicematic.orders (
  order_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references slicematic.customer(customer_id),
  order_datetime timestamptz not null default now(),
  order_status text not null default 'Placed',
  payment_method text not null check (payment_method in ('Cash', 'Card', 'UPI')),
  subtotal_amount numeric(10, 2) not null check (subtotal_amount >= 0),
  discount_amount numeric(10, 2) not null default 0 check (discount_amount >= 0),
  tax_amount numeric(10, 2) not null default 0 check (tax_amount >= 0),
  delivery_charge numeric(10, 2) not null default 0 check (delivery_charge >= 0),
  final_amount numeric(10, 2) not null check (final_amount >= 0),
  city text not null default 'Delhi NCR',
  coupon_code text,
  delivery_address text not null,
  delivery_zone text check (delivery_zone in ('0-2', '2-4', '4-6')),
  customer_note text,
  created_at timestamptz not null default now()
);

alter table slicematic.orders add column if not exists delivery_address text;
alter table slicematic.orders add column if not exists delivery_zone text;
alter table slicematic.orders add column if not exists customer_note text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_delivery_zone_check'
      and conrelid = 'slicematic.orders'::regclass
  ) then
    alter table slicematic.orders
      add constraint orders_delivery_zone_check
      check (delivery_zone in ('0-2', '2-4', '4-6'));
  end if;
end $$;

alter table slicematic.orders add column if not exists razorpay_order_id text;
alter table slicematic.orders add column if not exists razorpay_payment_id text;
alter table slicematic.orders add column if not exists cashfree_order_id text;
alter table slicematic.orders add column if not exists cashfree_payment_id text;
alter table slicematic.orders add column if not exists payment_status text not null default 'confirmed'
  check (payment_status in ('paid', 'confirmed', 'failed'));
create index if not exists idx_orders_razorpay_order_id on slicematic.orders(razorpay_order_id);
create index if not exists idx_orders_cashfree_order_id on slicematic.orders(cashfree_order_id);

create table if not exists slicematic.order_item (
  order_item_id uuid primary key default gen_random_uuid(),
  order_id uuid not null references slicematic.orders(order_id) on delete cascade,
  pizza_type_id integer not null references slicematic.pizza_types(pizza_type_id),
  base_id integer not null references slicematic.pizza_bases(base_id),
  size_id text not null references slicematic.pizza_sizes(size_id),
  quantity integer not null check (quantity between 1 and 10),
  base_price numeric(10, 2) not null check (base_price >= 0),
  pizza_price numeric(10, 2) not null check (pizza_price >= 0),
  line_total numeric(10, 2) not null check (line_total >= 0)
);

create table if not exists slicematic.order_item_topping (
  order_item_id uuid not null references slicematic.order_item(order_item_id) on delete cascade,
  topping_id integer not null references slicematic.toppings(topping_id),
  topping_price numeric(10, 2) not null check (topping_price >= 0),
  primary key (order_item_id, topping_id)
);

create table if not exists slicematic.customer_activity (
  activity_id uuid primary key default gen_random_uuid(),
  customer_id uuid references slicematic.customer(customer_id) on delete set null,
  activity_type text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists slicematic.customer_preference (
  customer_id uuid primary key references slicematic.customer(customer_id) on delete cascade,
  favourite_pizza_type_id integer references slicematic.pizza_types(pizza_type_id),
  favourite_topping_id integer references slicematic.toppings(topping_id),
  veg_preference_score numeric(5, 2) not null default 0,
  avg_spend numeric(10, 2) not null default 0,
  last_calculated_at timestamptz not null default now()
);

create table if not exists slicematic.recommendation_event (
  recommendation_id uuid primary key default gen_random_uuid(),
  customer_id uuid references slicematic.customer(customer_id) on delete set null,
  recommended_item_type text not null,
  recommended_item_id integer not null references slicematic.pizza_types(pizza_type_id),
  recommended_topping_id integer references slicematic.toppings(topping_id),
  recommendation_score numeric(5, 4) not null check (recommendation_score between 0 and 1),
  recommendation_timestamp timestamptz not null default now(),
  action_taken text not null default 'Shown',
  model_name text not null default 'openai/gpt-oss-20b',
  prompt_version text not null default 'stage3-v1'
);

create table if not exists slicematic.daily_sales_fact (
  sales_date date primary key,
  total_orders integer not null default 0,
  total_revenue numeric(12, 2) not null default 0,
  discount_revenue_loss numeric(12, 2) not null default 0,
  gst_collected numeric(12, 2) not null default 0,
  busiest_hour integer,
  top_pizza_type_id integer references slicematic.pizza_types(pizza_type_id),
  forecast_orders integer,
  forecast_confidence numeric(5, 4)
);

create index if not exists idx_orders_customer_datetime on slicematic.orders(customer_id, order_datetime desc);
create index if not exists idx_orders_payment_datetime on slicematic.orders(payment_method, order_datetime desc);
create index if not exists idx_order_item_pizza on slicematic.order_item(pizza_type_id);
create index if not exists idx_recommendation_customer_time on slicematic.recommendation_event(customer_id, recommendation_timestamp desc);

create or replace view slicematic.admin_order_export as
select
  o.order_id,
  o.order_datetime,
  concat_ws(' ', c.first_name, c.last_name) as customer_name,
  c.mobile_number,
  o.payment_method,
  o.order_status,
  o.subtotal_amount,
  o.discount_amount,
  o.tax_amount,
  o.final_amount,
  o.delivery_address,
  o.delivery_zone
from slicematic.orders o
join slicematic.customer c on c.customer_id = o.customer_id;

create or replace view slicematic.order_analytics as
select
  count(distinct o.order_id) as order_count,
  coalesce(sum(o.final_amount), 0) as total_revenue,
  coalesce(avg(o.final_amount), 0) as average_order_value,
  mode() within group (order by o.payment_method) as top_payment_method,
  extract(hour from o.order_datetime)::integer as order_hour
from slicematic.orders o
group by extract(hour from o.order_datetime);

insert into slicematic.pizza_bases (base_id, code, base_name, price, description, is_available) values
  (1, 'B1', 'Thin Crust', 149, 'Light, crisp edge', true),
  (2, 'B2', 'Thick Crust', 179, 'Soft, filling bite', true),
  (3, 'B3', 'Cheese Burst', 229, 'Molten cheese layer', true),
  (4, 'B4', 'Whole Wheat', 159, 'Nutty, everyday base', true),
  (5, 'B5', 'Multigrain', 169, 'Seeded texture', true)
on conflict (base_id) do update set
  base_name = excluded.base_name,
  price = excluded.price,
  description = excluded.description,
  is_available = excluded.is_available,
  updated_at = now();

insert into slicematic.pizza_types (pizza_type_id, code, pizza_name, price, description, image_url, badge, tags, prep_minutes, is_available) values
  (1, 'P1', 'Margherita', 299, 'Tomato sauce, mozzarella, basil finish, and a crisp city-style bite.', '/assets/menu/P1.jpg', 'Fastest bake', array['Veg','Classic','Cheese'], 18, true),
  (2, 'P2', 'Chicago Deep Dish', 349, 'Tall crust, chunky sauce, slow-melted cheese, and a generous filling.', '/assets/menu/P2.jpg', 'Loaded', array['Cheese','Hearty','Signature'], 28, true),
  (3, 'P3', 'Greek Mediterranean', 329, 'Olives, peppers, tomatoes, herbs, and a balanced mozzarella layer.', '/assets/menu/P3.jpg', 'Herb forward', array['Veg','Olives','Fresh'], 22, true),
  (4, 'P4', 'California Veggie', 339, 'Colorful vegetables, bright sauce, and a clean finish for repeat orders.', '/assets/menu/P4.jpg', 'Garden pick', array['Veg','Light','Peppers'], 21, true),
  (5, 'P5', 'Farm House', 319, 'Mushrooms, corn, peppers, onions, and cheese on a familiar crowd favorite.', '/assets/menu/P5.jpg', 'Best value', array['Veg','Corn','Mushroom'], 24, true),
  (6, 'P6', 'Pepperoni Classic', 369, 'Pepperoni-style slices, mozzarella, oregano, and a rich tomato base.', '/assets/menu/P6.jpg', 'High protein', array['Chicken','Classic','Spiced'], 23, true),
  (7, 'P7', 'BBQ Chicken', 379, 'Barbecue chicken, onions, peppers, and a sweet-smoky sauce drizzle.', '/assets/menu/P7.jpg', 'Smoky', array['Chicken','BBQ','Smoky'], 25, true),
  (8, 'P8', 'Paneer Tikka', 349, 'Tikka-spiced paneer, onions, peppers, and a masala sauce base.', '/assets/menu/P8.jpg', 'Local favorite', array['Veg','Paneer','Spicy'], 24, true)
on conflict (pizza_type_id) do update set
  pizza_name = excluded.pizza_name,
  price = excluded.price,
  description = excluded.description,
  image_url = excluded.image_url,
  badge = excluded.badge,
  tags = excluded.tags,
  prep_minutes = excluded.prep_minutes,
  is_available = excluded.is_available,
  updated_at = now();

insert into slicematic.toppings (topping_id, code, topping_name, price, is_available) values
  (1, 'T1', 'Black Olives', 49, true),
  (2, 'T2', 'Extra Cheese', 69, true),
  (3, 'T3', 'Button Mushrooms', 49, true),
  (4, 'T4', 'Green Peppers', 39, true),
  (5, 'T5', 'Jalapenos', 39, true),
  (6, 'T6', 'Sun-Dried Tomatoes', 59, true),
  (7, 'T7', 'Caramelised Onions', 49, true),
  (8, 'T8', 'Sweet Corn', 39, true),
  (9, 'T9', 'Roasted Garlic', 49, true),
  (10, 'T10', 'Peri-Peri Drizzle', 59, true)
on conflict (topping_id) do update set
  topping_name = excluded.topping_name,
  price = excluded.price,
  is_available = excluded.is_available,
  updated_at = now();

insert into slicematic.pizza_sizes (size_id, size_name, extra_price, detail, sort_order, is_available) values
  ('regular', 'Regular', 0, 'Serves 1-2', 1, true),
  ('large', 'Large', 120, 'Serves 2-3', 2, true),
  ('party', 'Party', 220, 'Serves 3-4', 3, true)
on conflict (size_id) do update set
  size_name = excluded.size_name,
  extra_price = excluded.extra_price,
  detail = excluded.detail,
  sort_order = excluded.sort_order,
  is_available = excluded.is_available;

create table if not exists slicematic.user_roles (
  user_id uuid primary key,
  role text not null check (role in ('admin', 'customer'))
);
alter table slicematic.user_roles enable row level security;
drop policy if exists "Users can read own role" on slicematic.user_roles;
create policy "Users can read own role" on slicematic.user_roles for select using (auth.uid() = user_id);

alter table slicematic.pizza_bases enable row level security;
alter table slicematic.pizza_types enable row level security;
alter table slicematic.toppings enable row level security;
alter table slicematic.pizza_sizes enable row level security;
alter table slicematic.customer enable row level security;
alter table slicematic.orders enable row level security;
alter table slicematic.order_item enable row level security;
alter table slicematic.order_item_topping enable row level security;
alter table slicematic.recommendation_event enable row level security;

drop policy if exists "public read menu bases" on slicematic.pizza_bases;
drop policy if exists "public read menu pizzas" on slicematic.pizza_types;
drop policy if exists "public read menu toppings" on slicematic.toppings;
drop policy if exists "public read menu sizes" on slicematic.pizza_sizes;
drop policy if exists "authenticated admin read customers" on slicematic.customer;
drop policy if exists "authenticated admin read orders" on slicematic.orders;
drop policy if exists "authenticated admin read order items" on slicematic.order_item;
drop policy if exists "authenticated admin read order toppings" on slicematic.order_item_topping;
drop policy if exists "authenticated admin read recommendations" on slicematic.recommendation_event;

create policy "public read menu bases" on slicematic.pizza_bases for select using (true);
create policy "public read menu pizzas" on slicematic.pizza_types for select using (true);
create policy "public read menu toppings" on slicematic.toppings for select using (true);
create policy "public read menu sizes" on slicematic.pizza_sizes for select using (true);
create policy "authenticated admin read customers" on slicematic.customer for select to authenticated using (true);
create policy "authenticated admin read orders" on slicematic.orders for select to authenticated using (true);
create policy "authenticated admin read order items" on slicematic.order_item for select to authenticated using (true);
create policy "authenticated admin read order toppings" on slicematic.order_item_topping for select to authenticated using (true);
create policy "authenticated admin read recommendations" on slicematic.recommendation_event for select to authenticated using (true);

-- API Role Permissions for Custom Schema
grant usage on schema slicematic to anon, authenticated, service_role;
grant all privileges on all tables in schema slicematic to anon, authenticated, service_role;
grant all privileges on all routines in schema slicematic to anon, authenticated, service_role;
grant all privileges on all sequences in schema slicematic to anon, authenticated, service_role;
alter default privileges in schema slicematic grant all on tables to anon, authenticated, service_role;
alter default privileges in schema slicematic grant all on routines to anon, authenticated, service_role;
alter default privileges in schema slicematic grant all on sequences to anon, authenticated, service_role;
