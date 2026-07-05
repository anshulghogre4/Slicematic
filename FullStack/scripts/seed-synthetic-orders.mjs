import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { existsSync, readFileSync } from "fs";

const SYNTHETIC_NOTE = "SYNTHETIC_ML_SEED";
const CUSTOMER_POOL_SIZE = 20;
const PHONE_PREFIX = "91000000";
const GST_RATE = 0.18;
const BULK_DISCOUNT_RATE = 0.1;
const BULK_DISCOUNT_QTY = 5;

const BASES = [
  { id: 1, price: 149 },
  { id: 2, price: 179 },
  { id: 3, price: 229 },
  { id: 4, price: 159 },
  { id: 5, price: 169 }
];

const PIZZAS = [
  { id: 1, price: 299 },
  { id: 2, price: 349 },
  { id: 3, price: 329 },
  { id: 4, price: 339 },
  { id: 5, price: 319 },
  { id: 6, price: 369 },
  { id: 7, price: 379 },
  { id: 8, price: 349 }
];

const SIZES = [
  { id: "regular", extra: 0 },
  { id: "large", extra: 120 },
  { id: "party", extra: 220 }
];

const PAYMENTS = ["Cash", "Card", "UPI"];
const ZONES = ["0-2", "2-4", "4-6"];
const ADDRESSES = [
  "12 Connaught Lane, Block A, Delhi NCR",
  "45 Saket Courtyard, Gate 2, Delhi NCR",
  "8 Karol Bagh Street, Near Metro, Delhi NCR",
  "221 Green Park Extension, Delhi NCR"
];

const HOUR_WEIGHTS = [];
for (let hour = 11; hour <= 22; hour += 1) {
  let weight = 1;
  if (hour === 12 || hour === 13) weight = 4;
  if (hour === 19 || hour === 20 || hour === 21) weight = 7;
  if (hour === 22) weight = 2;
  for (let i = 0; i < weight; i += 1) HOUR_WEIGHTS.push(hour);
}

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match && !process.env[match[1].trim()]) {
        process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  }
}

function parseArgs(argv) {
  const args = { count: 150, dryRun: false, purge: false, yes: false };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--dry-run") args.dryRun = true;
    else if (token === "--purge") args.purge = true;
    else if (token === "--yes") args.yes = true;
    else if (token === "--count") {
      args.count = Number(argv[i + 1] ?? 150);
      i += 1;
    }
  }
  return args;
}

function seedPhone(index) {
  return `${PHONE_PREFIX}${String(index + 1).padStart(2, "0")}`;
}

function pick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function calculateTotals(unitPrice, quantity) {
  const subtotal = Math.round(unitPrice * quantity);
  const discount = Math.round(quantity >= BULK_DISCOUNT_QTY ? subtotal * BULK_DISCOUNT_RATE : 0);
  const taxable = Math.round(subtotal - discount);
  const gst = Math.round(taxable * GST_RATE);
  return { subtotal, discount, gst, finalTotal: taxable + gst };
}

function makeOrderDatetime(daysAgo) {
  const hour = pick(HOUR_WEIGHTS);
  const minute = pick([0, 5, 10, 15, 20, 30, 35, 40, 45, 50]);
  const base = new Date();
  base.setDate(base.getDate() - daysAgo);
  const yyyy = base.getFullYear();
  const mm = String(base.getMonth() + 1).padStart(2, "0");
  const dd = String(base.getDate()).padStart(2, "0");
  const hh = String(hour).padStart(2, "0");
  const min = String(minute).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:00+05:30`;
}

function pickDaysAgo() {
  const base = Math.floor(Math.random() * 42);
  if (Math.random() < 0.35) {
    for (let offset = 0; offset < 7; offset += 1) {
      const candidate = base + offset;
      if (candidate > 41) break;
      const date = new Date();
      date.setDate(date.getDate() - candidate);
      const day = date.getDay();
      if (day === 0 || day === 6) return candidate;
    }
  }
  return base;
}

function buildCustomerRows() {
  return Array.from({ length: CUSTOMER_POOL_SIZE }, (_, index) => ({
    customer_id: randomUUID(),
    first_name: "Seed",
    last_name: `Customer${String(index + 1).padStart(2, "0")}`,
    mobile_number: seedPhone(index),
    email: null,
    city: "Delhi NCR",
    state: "Delhi",
    country: "India",
    preferred_contact_channel: "Phone",
    marketing_opt_in: false
  }));
}

function buildSyntheticOrders(count, customerRows) {
  const orders = [];
  const items = [];

  for (let i = 0; i < count; i += 1) {
    const orderId = randomUUID();
    const itemId = randomUUID();
    const customer = pick(customerRows);
    const pizza = pick(PIZZAS);
    const base = pick(BASES);
    const size = pick(SIZES);
    const quantity = pick([1, 1, 1, 2, 2, 3, 4, 5, 6]);
    const unitPrice = pizza.price + base.price + size.extra;
    const totals = calculateTotals(unitPrice, quantity);

    orders.push({
      order_id: orderId,
      customer_mobile: customer.mobile_number,
      order_datetime: makeOrderDatetime(pickDaysAgo()),
      order_status: "Delivered",
      payment_method: pick(PAYMENTS),
      subtotal_amount: totals.subtotal,
      discount_amount: totals.discount,
      tax_amount: totals.gst,
      delivery_charge: 0,
      final_amount: totals.finalTotal,
      city: "Delhi NCR",
      coupon_code: totals.discount > 0 ? "GROUP-SAVER" : null,
      delivery_address: pick(ADDRESSES),
      delivery_zone: pick(ZONES),
      customer_note: SYNTHETIC_NOTE,
      payment_status: "confirmed"
    });

    items.push({
      order_item_id: itemId,
      order_id: orderId,
      pizza_type_id: pizza.id,
      base_id: base.id,
      size_id: size.id,
      quantity,
      base_price: base.price,
      pizza_price: pizza.price,
      line_total: totals.subtotal
    });
  }

  return { orders, items };
}

async function preflight(supabase) {
  const [pizzas, orders, customers, syntheticOrders, foreignPhones] = await Promise.all([
    supabase.schema("slicematic").from("pizza_types").select("pizza_type_id", { count: "exact", head: true }),
    supabase.schema("slicematic").from("orders").select("order_id", { count: "exact", head: true }),
    supabase.schema("slicematic").from("customer").select("customer_id", { count: "exact", head: true }),
    supabase.schema("slicematic").from("orders").select("order_id", { count: "exact", head: true }).eq("customer_note", SYNTHETIC_NOTE),
    supabase
      .schema("slicematic")
      .from("customer")
      .select("mobile_number, first_name")
      .like("mobile_number", `${PHONE_PREFIX}%`)
      .not("first_name", "eq", "Seed")
  ]);

  if (pizzas.error) throw new Error(`Menu check failed: ${pizzas.error.message}`);
  if ((pizzas.count ?? 0) < 8) throw new Error("Expected at least 8 pizza_types rows. Run supabase/schema.sql first.");

  return {
    orderCount: orders.count ?? 0,
    customerCount: customers.count ?? 0,
    syntheticOrderCount: syntheticOrders.count ?? 0,
    foreignPhones: foreignPhones.data ?? []
  };
}

async function purgeSynthetic(supabase) {
  const { data: syntheticOrders, error } = await supabase
    .schema("slicematic")
    .from("orders")
    .select("order_id")
    .eq("customer_note", SYNTHETIC_NOTE);

  if (error) throw new Error(`Purge lookup failed: ${error.message}`);
  const orderIds = (syntheticOrders ?? []).map((row) => row.order_id);
  if (!orderIds.length) {
    console.log("No synthetic orders to purge.");
    return { orders: 0, customers: 0 };
  }

  const { error: deleteOrdersError } = await supabase.schema("slicematic").from("orders").delete().eq("customer_note", SYNTHETIC_NOTE);
  if (deleteOrdersError) throw new Error(`Purge orders failed: ${deleteOrdersError.message}`);

  const seedPhones = Array.from({ length: CUSTOMER_POOL_SIZE }, (_, index) => seedPhone(index));
  let deletedCustomers = 0;
  for (const phone of seedPhones) {
    const { data: customerRows } = await supabase
      .schema("slicematic")
      .from("customer")
      .select("customer_id, first_name")
      .eq("mobile_number", phone)
      .maybeSingle();
    if (!customerRows?.customer_id || customerRows.first_name !== "Seed") continue;

    const { count } = await supabase
      .schema("slicematic")
      .from("orders")
      .select("order_id", { count: "exact", head: true })
      .eq("customer_id", customerRows.customer_id);

    if ((count ?? 0) === 0) {
      const { error: deleteCustomerError } = await supabase
        .schema("slicematic")
        .from("customer")
        .delete()
        .eq("customer_id", customerRows.customer_id);
      if (!deleteCustomerError) deletedCustomers += 1;
    }
  }

  return { orders: orderIds.length, customers: deletedCustomers };
}

async function upsertCustomers(supabase, customerRows) {
  const { data, error } = await supabase
    .schema("slicematic")
    .from("customer")
    .upsert(customerRows, { onConflict: "mobile_number" })
    .select("customer_id, mobile_number");

  if (error) throw new Error(`Customer upsert failed: ${error.message}`);

  return new Map((data ?? []).map((row) => [row.mobile_number, row.customer_id]));
}

async function insertBatch(supabase, table, rows, batchSize = 50) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await supabase.schema("slicematic").from(table).insert(chunk);
    if (error) throw new Error(`${table} insert failed: ${error.message}`);
  }
}

async function main() {
  loadEnv();
  const args = parseArgs(process.argv);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env/.env.local");
    process.exit(1);
  }

  if (args.count < 100 || args.count > 200) {
    console.error("--count must be between 100 and 200");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey);
  const stats = await preflight(supabase);

  console.log("Pre-flight:");
  console.log(`- Existing orders: ${stats.orderCount}`);
  console.log(`- Existing customers: ${stats.customerCount}`);
  console.log(`- Existing synthetic orders: ${stats.syntheticOrderCount}`);

  if (stats.foreignPhones.length) {
    console.error("Aborting: reserved phone band already used by non-seed customers:");
    for (const row of stats.foreignPhones) console.error(`  - ${row.mobile_number} (${row.first_name})`);
    process.exit(1);
  }

  if (args.purge && !args.dryRun) {
    const purged = await purgeSynthetic(supabase);
    console.log(`Purged ${purged.orders} synthetic orders and ${purged.customers} seed customers.`);
  }

  const customerRows = buildCustomerRows();
  const { orders, items } = buildSyntheticOrders(args.count, customerRows);

  console.log(`Plan: upsert ${customerRows.length} seed customers, insert ${orders.length} orders, ${items.length} order_items`);
  console.log(`Sample order_id: ${orders[0].order_id}`);
  console.log(`Sample datetime: ${orders[0].order_datetime}`);

  if (args.dryRun) {
    console.log("Dry run complete. No writes performed.");
    return;
  }

  if (!args.yes) {
    console.error("Refusing to write without --yes. Run with --dry-run first, then add --yes.");
    process.exit(1);
  }

  const phoneToId = await upsertCustomers(supabase, customerRows);
  const orderRows = orders.map(({ customer_mobile, ...order }) => ({
    ...order,
    customer_id: phoneToId.get(customer_mobile)
  }));

  if (orderRows.some((row) => !row.customer_id)) {
    throw new Error("Failed to resolve customer_id for one or more synthetic orders.");
  }

  await insertBatch(supabase, "orders", orderRows);
  await insertBatch(supabase, "order_item", items);

  const after = await preflight(supabase);
  console.log(`Done. Orders now: ${after.orderCount} (synthetic: ${after.syntheticOrderCount})`);
  console.log("Next: npm run forecast:refresh");
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
