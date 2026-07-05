import { randomUUID } from "crypto";
import { calculateBill, getLineUnitPrice, sanitizePricingConfig } from "./pricing";
import { buildSeedSummary, seedMenu, seedOrders } from "./seed-data";
import { getForecastForSummary } from "./forecast-service";
import { getSupabaseAdminClient, getSupabaseServerClient } from "./supabase";
import { queryDb } from "./db";
import { AdminSummary, CartLine, MenuItem, MenuPayload, OrderPayload, PaymentMeta, SavedOrder } from "./types";

export type CustomerOrderHistoryItem = {
  id: string;
  createdAt: string;
  paymentMode: string;
  paymentStatus?: string;
  status: string;
  subtotal: number;
  discount: number;
  gst: number;
  finalTotal: number;
  deliveryZone?: string | null;
  lines: Array<{
    pizzaName: string;
    baseName: string;
    sizeName: string;
    quantity: number;
    lineTotal: number;
  }>;
};

const NULL_LIKE = new Set(["na", "nan", "none", "null", "n/a", "undefined", ""]);
function isNullLike(val: string) {
  return NULL_LIKE.has(String(val).trim().toLowerCase());
}

function enrichPizza(row: Record<string, unknown>, fallback: MenuItem): MenuItem {
  const name = String(row.pizza_name ?? row.name ?? fallback.name);
  const rawPrice = Number(row.price ?? fallback.price);
  
  const isBadName = isNullLike(name);
  const isBadPrice = isNaN(rawPrice) || rawPrice <= 0 || row.price === null || row.price === undefined;
  const isAvailable = row.is_available === undefined ? fallback.available : Boolean(row.is_available);

  return {
    id: Number(row.pizza_type_id ?? row.id ?? fallback.id),
    code: String(row.code ?? fallback.code),
    name: isBadName ? "Unnamed" : name,
    price: (isBadName || isBadPrice) ? 0 : rawPrice,
    description: String(row.description ?? fallback.description ?? ""),
    image: String(row.image_url ?? fallback.image ?? `/assets/menu/P${fallback.id}.jpg`),
    badge: String(row.badge ?? fallback.badge ?? "Signature"),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : fallback.tags ?? [],
    prepMinutes: Number(row.prep_minutes ?? fallback.prepMinutes ?? 24),
    available: (isBadName || isBadPrice) ? false : isAvailable
  };
}

function enrichBase(row: Record<string, unknown>, fallback: MenuItem): MenuItem {
  const name = String(row.base_name ?? row.name ?? fallback.name);
  const rawPrice = Number(row.price ?? fallback.price);
  const isBadName = isNullLike(name);
  const isBadPrice = isNaN(rawPrice) || rawPrice <= 0 || row.price === null || row.price === undefined;
  const isAvailable = row.is_available === undefined ? fallback.available : Boolean(row.is_available);

  return {
    id: Number(row.base_id ?? row.id ?? fallback.id),
    code: String(row.code ?? fallback.code),
    name: isBadName ? "Unnamed" : name,
    price: (isBadName || isBadPrice) ? 0 : rawPrice,
    description: String(row.description ?? fallback.description ?? ""),
    available: (isBadName || isBadPrice) ? false : isAvailable
  };
}

function enrichTopping(row: Record<string, unknown>, fallback: MenuItem): MenuItem {
  const name = String(row.topping_name ?? row.name ?? fallback.name);
  const rawPrice = Number(row.price ?? fallback.price);
  const isBadName = isNullLike(name);
  const isBadPrice = isNaN(rawPrice) || rawPrice <= 0 || row.price === null || row.price === undefined;
  const isAvailable = row.is_available === undefined ? fallback.available : Boolean(row.is_available);

  return {
    id: Number(row.topping_id ?? row.id ?? fallback.id),
    code: String(row.code ?? fallback.code),
    name: isBadName ? "Unnamed" : name,
    price: (isBadName || isBadPrice) ? 0 : rawPrice,
    available: (isBadName || isBadPrice) ? false : isAvailable
  };
}

function deduplicate<T extends { id: number | string; name: string; price: number }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const key = `${item.id}|${item.name}|${item.price}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

export async function loadMenu(): Promise<MenuPayload> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return seedMenu;

  try {
    const [pizzasResult, basesResult, toppingsResult, sizesResult] = await Promise.all([
      supabase.schema("slicematic").from("pizza_types").select("*").order("pizza_type_id"),
      supabase.schema("slicematic").from("pizza_bases").select("*").order("base_id"),
      supabase.schema("slicematic").from("toppings").select("*").order("topping_id"),
      supabase.schema("slicematic").from("pizza_sizes").select("*").order("sort_order")
    ]);

    if (pizzasResult.error || basesResult.error || toppingsResult.error) {
      return seedMenu;
    }

    const pizzas = (pizzasResult.data ?? []).map((row, index) => {
      const fallback = seedMenu.pizzas[index] ?? seedMenu.pizzas[0];
      return enrichPizza(row, fallback);
    });
    const bases = (basesResult.data ?? []).map((row, index) => {
      const fallback = seedMenu.bases[index] ?? seedMenu.bases[0];
      return enrichBase(row, fallback);
    });
    const toppings = (toppingsResult.data ?? []).map((row, index) => {
      const fallback = seedMenu.toppings[index] ?? seedMenu.toppings[0];
      return enrichTopping(row, fallback);
    });
    const sizes = sizesResult.error || !sizesResult.data?.length
      ? seedMenu.sizes
      : sizesResult.data.map((row) => ({
          id: String(row.size_id),
          name: String(row.size_name),
          extra: Number(row.extra_price),
          detail: String(row.detail ?? ""),
          available: row.is_available === undefined ? true : Boolean(row.is_available)
        }));

    return {
      pizzas: pizzas.length ? deduplicate(pizzas) : seedMenu.pizzas,
      bases: bases.length ? deduplicate(bases) : seedMenu.bases,
      toppings: toppings.length ? deduplicate(toppings) : seedMenu.toppings,
      sizes
    };
  } catch {
    return seedMenu;
  }
}

export async function saveOrder(payload: OrderPayload, paymentMeta: PaymentMeta = {}): Promise<SavedOrder> {
  const menu = await loadMenu();
  const pricingConfig = sanitizePricingConfig(payload.pricingConfig);
  const totals = calculateBill(payload.lines, menu, pricingConfig);
  const now = new Date().toISOString();
  const orderId = `SM-${Date.now().toString().slice(-6)}`;

  const savedOrder: SavedOrder = {
    id: orderId,
    createdAt: now,
    customerName: payload.customer.name.trim(),
    phone: payload.customer.phone.trim(),
    address: payload.customer.address.trim(),
    deliveryZone: payload.customer.deliveryZone,
    paymentMode: payload.paymentMode,
    status: "Placed",
    razorpayOrderId: paymentMeta.razorpayOrderId,
    razorpayPaymentId: paymentMeta.razorpayPaymentId,
    cashfreeOrderId: paymentMeta.cashfreeOrderId,
    cashfreePaymentId: paymentMeta.cashfreePaymentId,
    paymentStatus: paymentMeta.paymentStatus ?? "confirmed",
    subtotal: totals.subtotal,
    discount: totals.discount,
    gst: totals.gst,
    finalTotal: totals.finalTotal,
    lines: payload.lines.map((line) => describeLine(line, menu))
  };

  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) return savedOrder;

  try {
    const uuidOrderId = randomUUID();
    const [firstName, ...rest] = payload.customer.name.trim().split(/\s+/);
    const lastName = rest.join(" ");
    const accountEmail = (payload.customerAccountEmail ?? "").trim().toLowerCase() || null;
    const phone = payload.customer.phone.trim();
    const sessionCustomerId = (payload.customerId ?? "").trim() || null;

    let effectiveCustomerId: string | null = null;

    if (sessionCustomerId) {
      const byId = await supabase
        .schema("slicematic")
        .from("customer")
        .select("customer_id")
        .eq("customer_id", sessionCustomerId)
        .maybeSingle();
      if (byId.data?.customer_id) {
        effectiveCustomerId = byId.data.customer_id;
      }
    }

    if (!effectiveCustomerId) {
      const byPhone = await supabase
        .schema("slicematic")
        .from("customer")
        .select("customer_id")
        .eq("mobile_number", phone)
        .maybeSingle();
      effectiveCustomerId = byPhone.data?.customer_id ?? null;
    }

    if (!effectiveCustomerId && accountEmail) {
      const byEmail = await supabase
        .schema("slicematic")
        .from("customer")
        .select("customer_id")
        .eq("email", accountEmail)
        .maybeSingle();
      effectiveCustomerId = byEmail.data?.customer_id ?? null;
    }

    if (!effectiveCustomerId) {
      effectiveCustomerId = randomUUID();
      const { error: customerError } = await supabase.schema("slicematic").from("customer").insert({
        customer_id: effectiveCustomerId,
        first_name: firstName,
        last_name: lastName,
        mobile_number: phone,
        email: accountEmail,
        city: "Delhi NCR",
        state: "Delhi",
        country: "India",
        registration_date: now,
        preferred_contact_channel: "Phone",
        marketing_opt_in: false
      });
      if (customerError) {
        console.error("Customer insert error:", customerError);
        throw new Error("Customer insert failed: " + customerError.message);
      }
    } else if (accountEmail) {
      await supabase
        .schema("slicematic")
        .from("customer")
        .update({ email: accountEmail })
        .eq("customer_id", effectiveCustomerId)
        .or("email.is.null,email.eq.");
    }

    const { error: orderError } = await supabase.schema("slicematic").from("orders").insert({
      order_id: uuidOrderId,
      customer_id: effectiveCustomerId,
      order_datetime: now,
      order_status: "Placed",
      payment_method: payload.paymentMode,
      subtotal_amount: totals.subtotal,
      discount_amount: totals.discount,
      tax_amount: totals.gst,
      delivery_charge: pricingConfig.deliveryFee > 0 && totals.subtotal < pricingConfig.freeDeliveryMin ? pricingConfig.deliveryFee : 0,
      final_amount: totals.finalTotal,
      city: "Delhi NCR",
      coupon_code: totals.discount > 0 ? "GROUP-SAVER" : null,
      delivery_address: payload.customer.address,
      delivery_zone: payload.customer.deliveryZone ?? null,
      customer_note: payload.customer.note ?? null,
      razorpay_order_id: paymentMeta.razorpayOrderId ?? null,
      razorpay_payment_id: paymentMeta.razorpayPaymentId ?? null,
      cashfree_order_id: paymentMeta.cashfreeOrderId ?? null,
      cashfree_payment_id: paymentMeta.cashfreePaymentId ?? null,
      payment_status: paymentMeta.paymentStatus ?? "confirmed"
    });
    if (orderError) {
      console.error("Order insert error:", orderError);
      throw new Error("Order insert failed: " + orderError.message);
    }

    for (const line of payload.lines) {
      const orderItemId = randomUUID();
      const pizza = menu.pizzas.find((item) => item.id === line.pizzaId);
      const base = menu.bases.find((item) => item.id === line.baseId);
      const unitPrice = getLineUnitPrice(line, menu);
      const { error: lineError } = await supabase.schema("slicematic").from("order_item").insert({
        order_item_id: orderItemId,
        order_id: uuidOrderId,
        pizza_type_id: line.pizzaId,
        base_id: line.baseId,
        size_id: line.sizeId,
        quantity: line.quantity,
        base_price: base?.price ?? 0,
        pizza_price: pizza?.price ?? 0,
        line_total: unitPrice * line.quantity
      });
      if (lineError) {
        console.error("Order line insert error:", lineError);
        throw new Error("Order line insert failed: " + lineError.message);
      }
      const toppingRows = line.toppingIds.map((toppingId) => {
        const topping = menu.toppings.find((item) => item.id === toppingId);
        return {
          order_item_id: orderItemId,
          topping_id: toppingId,
          topping_price: topping?.price ?? 0
        };
      });
      if (toppingRows.length) {
        const { error: toppingError } = await supabase.schema("slicematic").from("order_item_topping").insert(toppingRows);
        if (toppingError) {
          console.error("Topping insert error:", toppingError);
          throw new Error("Topping insert failed: " + toppingError.message);
        }
      }
    }

    if (payload.recommendationId) {
      await supabase
        .schema("slicematic")
        .from("recommendation_event")
        .update({ action_taken: "Purchased" })
        .eq("recommendation_id", payload.recommendationId);
    }

    return { ...savedOrder, id: uuidOrderId, linkedCustomerId: effectiveCustomerId };
  } catch (err) {
    console.error("saveOrder caught an error:", err);
    return savedOrder;
  }
}

function describeLine(line: CartLine, menu: MenuPayload): SavedOrder["lines"][number] {
  const pizza = menu.pizzas.find((item) => item.id === line.pizzaId);
  const base = menu.bases.find((item) => item.id === line.baseId);
  const size = menu.sizes.find((item) => item.id === line.sizeId);
  const toppings = line.toppingIds
    .map((id) => menu.toppings.find((item) => item.id === id)?.name)
    .filter(Boolean) as string[];
  return {
    pizzaName: pizza?.name ?? "Unknown pizza",
    baseName: base?.name ?? "Unknown base",
    sizeName: size?.name ?? "Regular",
    toppings,
    quantity: line.quantity,
    lineTotal: getLineUnitPrice(line, menu) * line.quantity
  };
}

export async function resolveCustomerId(params: { customerId?: string | null; identifier?: string | null }) {
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) return null;

  const explicitId = (params.customerId ?? "").trim();
  if (explicitId) {
    const byId = await supabase
      .schema("slicematic")
      .from("customer")
      .select("customer_id")
      .eq("customer_id", explicitId)
      .maybeSingle();
    if (byId.data?.customer_id) return String(byId.data.customer_id);
  }

  const identifier = (params.identifier ?? "").trim();
  if (!identifier) return null;

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
  const queryField = isEmail ? "email" : "mobile_number";
  const lookupValue = isEmail ? identifier.toLowerCase() : identifier;

  const { data, error } = await supabase
    .schema("slicematic")
    .from("customer")
    .select("customer_id")
    .eq(queryField, lookupValue)
    .maybeSingle();

  if (error) {
    console.error("Customer lookup error:", error);
    return null;
  }

  return data?.customer_id ? String(data.customer_id) : null;
}

export async function lookupCustomerProfile(identifier: string) {
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) return null;

  const trimmed = identifier.trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed);
  const customerId = await resolveCustomerId(isUuid ? { customerId: trimmed } : { identifier: trimmed });
  if (!customerId) return null;

  const { data, error } = await supabase
    .schema("slicematic")
    .from("customer")
    .select("customer_id, first_name, last_name, mobile_number, email, city")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("Customer profile lookup error:", error);
    return null;
  }

  return {
    customerId: String(data.customer_id),
    name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim(),
    phone: String(data.mobile_number ?? ""),
    email: String(data.email ?? ""),
    city: String(data.city ?? "Delhi NCR")
  };
}

export async function registerCustomer(input: {
  name: string;
  phone: string;
  email: string;
  city: string;
  address?: string;
}): Promise<string | null> {
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) return null;

  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  const [firstName, ...rest] = input.name.trim().split(/\s+/);
  const lastName = rest.join(" ");

  const existingByEmail = email
    ? await supabase.schema("slicematic").from("customer").select("customer_id").eq("email", email).maybeSingle()
    : { data: null, error: null };
  if (existingByEmail.data?.customer_id) return String(existingByEmail.data.customer_id);

  const existingByPhone = await supabase
    .schema("slicematic")
    .from("customer")
    .select("customer_id")
    .eq("mobile_number", phone)
    .maybeSingle();
  if (existingByPhone.data?.customer_id) {
    if (email) {
      await supabase
        .schema("slicematic")
        .from("customer")
        .update({ email })
        .eq("customer_id", existingByPhone.data.customer_id)
        .or("email.is.null,email.eq.");
    }
    return String(existingByPhone.data.customer_id);
  }

  const customerId = randomUUID();
  const { error } = await supabase.schema("slicematic").from("customer").insert({
    customer_id: customerId,
    first_name: firstName,
    last_name: lastName || null,
    mobile_number: phone,
    email: email || null,
    city: input.city.trim() || "Delhi NCR",
    state: "Delhi",
    country: "India",
    registration_date: new Date().toISOString(),
    preferred_contact_channel: "Phone",
    marketing_opt_in: false
  });
  if (error) {
    console.error("registerCustomer insert error:", error);
    return null;
  }
  return customerId;
}

const ORDER_HISTORY_SELECT =
  "order_id, customer_id, order_datetime, order_status, payment_method, subtotal_amount, discount_amount, tax_amount, final_amount";

type OrderHistoryRow = {
  order_id: string;
  order_datetime: string;
  order_status: string;
  payment_method: string;
  subtotal_amount: number;
  discount_amount: number;
  tax_amount: number;
  final_amount: number;
};

/**
 * Order history — flat queries only (no nested PostgREST embeds).
 * Nested joins fail under RLS on hosted Supabase; fetch orders, items, and names separately.
 */
async function fetchOrderHistoryByCustomerId(
  _supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>,
  customerId: string
): Promise<CustomerOrderHistoryItem[]> {
  // Use raw SQL via pg to bypass PostgREST's stale query plan/result cache
  // which causes ORDER BY + LIMIT (and sometimes no-LIMIT) to drop rows.
  try {
    type OrderRow = {
      order_id: string; order_datetime: string; order_status: string;
      payment_method: string; payment_status: string | null;
      subtotal_amount: number; discount_amount: number;
      tax_amount: number; final_amount: number; delivery_zone: string | null;
    };
    type ItemRow = {
      order_id: string; pizza_type_id: number; base_id: number;
      size_id: string; quantity: number; line_total: number;
    };
    type PizzaRow = { pizza_type_id: number; pizza_name: string };
    type BaseRow  = { base_id: number; base_name: string };
    type SizeRow  = { size_id: string; size_name: string };

    const orders = await queryDb<OrderRow>(
      `SELECT order_id, order_datetime, order_status, payment_method, payment_status,
              subtotal_amount, discount_amount, tax_amount, final_amount, delivery_zone
       FROM slicematic.orders
       WHERE customer_id = $1
       ORDER BY order_datetime DESC`,
      [customerId]
    );

    if (!orders.length) return [];

    const orderIds = orders.map((o) => o.order_id);
    const items = await queryDb<ItemRow>(
      `SELECT order_id, pizza_type_id, base_id, size_id, quantity, line_total
       FROM slicematic.order_item
       WHERE order_id = ANY($1)`,
      [orderIds]
    );

    const pizzaIds = [...new Set(items.map((i) => i.pizza_type_id))];
    const baseIds  = [...new Set(items.map((i) => i.base_id))];
    const sizeIds  = [...new Set(items.map((i) => i.size_id))];

    const [pizzas, bases, sizes] = await Promise.all([
      pizzaIds.length
        ? queryDb<PizzaRow>(`SELECT pizza_type_id, pizza_name FROM slicematic.pizza_types WHERE pizza_type_id = ANY($1)`, [pizzaIds])
        : Promise.resolve([] as PizzaRow[]),
      baseIds.length
        ? queryDb<BaseRow>(`SELECT base_id, base_name FROM slicematic.pizza_bases WHERE base_id = ANY($1)`, [baseIds])
        : Promise.resolve([] as BaseRow[]),
      sizeIds.length
        ? queryDb<SizeRow>(`SELECT size_id, size_name FROM slicematic.pizza_sizes WHERE size_id = ANY($1)`, [sizeIds])
        : Promise.resolve([] as SizeRow[]),
    ]);

    const pizzaMap = new Map(pizzas.map((p) => [p.pizza_type_id, p.pizza_name]));
    const baseMap  = new Map(bases.map((b) => [b.base_id, b.base_name]));
    const sizeMap  = new Map(sizes.map((s) => [s.size_id, s.size_name]));

    const itemsByOrder = new Map<string, CustomerOrderHistoryItem["lines"]>();
    for (const item of items) {
      const lines = itemsByOrder.get(item.order_id) ?? [];
      lines.push({
        pizzaName: pizzaMap.get(item.pizza_type_id) ?? "Unknown Pizza",
        baseName:  baseMap.get(item.base_id)        ?? "Unknown Base",
        sizeName:  sizeMap.get(item.size_id)        ?? "Regular",
        quantity:  Number(item.quantity),
        lineTotal: Number(item.line_total),
      });
      itemsByOrder.set(item.order_id, lines);
    }

    return orders.map((o) => ({
      id:          o.order_id,
      createdAt:   o.order_datetime,
      paymentMode: o.payment_method,
      paymentStatus: o.payment_status ?? "confirmed",
      status:      o.order_status,
      subtotal:    Number(o.subtotal_amount),
      discount:    Number(o.discount_amount),
      gst:         Number(o.tax_amount),
      finalTotal:  Number(o.final_amount),
      deliveryZone: o.delivery_zone,
      lines:       itemsByOrder.get(o.order_id) ?? [],
    }));
  } catch (err) {
    console.error("fetchOrderHistoryByCustomerId raw SQL error:", err);
    return [];
  }
}

export async function loadCustomerOrderHistoryByCustomerId(
  customerId: string
): Promise<{ orders: CustomerOrderHistoryItem[]; customer_id: string | null }> {
  const supabase = getSupabaseServerClient();
  const trimmedId = customerId.trim();
  if (!supabase || !trimmedId) {
    console.error("Supabase is not configured for customer order history.");
    return { orders: [], customer_id: null };
  }

  const orders = await fetchOrderHistoryByCustomerId(supabase, trimmedId);
  return { orders, customer_id: trimmedId };
}

export async function loadAdminSummary(): Promise<AdminSummary> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return {
    totalRevenue: 0,
    orderCount: 0,
    avgOrderValue: 0,
    topPizza: "N/A",
    busiestHour: "N/A",
    paymentMix: [],
    hourlyDemand: [],
    recentOrders: [],
    forecast: []
  };

  try {
    const ordersResult = await supabase
      .schema("slicematic")
      .from("orders")
      .select("order_id, order_datetime, order_status, payment_method, subtotal_amount, discount_amount, tax_amount, final_amount, delivery_address, delivery_zone, customer:customer_id(first_name,last_name,mobile_number)")
      .order("order_datetime", { ascending: false });

    if (ordersResult.error) {
      console.error("Error fetching orders:", ordersResult.error);
    }
    const data = ordersResult.data || [];

    const recentOrders: SavedOrder[] = data.map((row) => {
      const customer = Array.isArray(row.customer) ? row.customer[0] : row.customer;
      return {
        id: String(row.order_id),
        createdAt: String(row.order_datetime),
        customerName: `${customer?.first_name ?? "Guest"} ${customer?.last_name ?? ""}`.trim(),
        phone: String(customer?.mobile_number ?? ""),
        address: String(row.delivery_address ?? ""),
        deliveryZone: row.delivery_zone ? String(row.delivery_zone) : undefined,
        paymentMode: String(row.payment_method ?? "UPI") as SavedOrder["paymentMode"],
        status: String(row.order_status ?? "Placed"),
        subtotal: Number(row.subtotal_amount ?? 0),
        discount: Number(row.discount_amount ?? 0),
        gst: Number(row.tax_amount ?? 0),
        finalTotal: Number(row.final_amount ?? 0),
        lines: []
      };
    });

    const totalRevenue = recentOrders.reduce((sum, order) => sum + order.finalTotal, 0);
    const paymentMap = new Map<string, { mode: string; count: number; revenue: number }>();
    const hourMap = new Map<string, { hour: string; orders: number; revenue: number }>();
    for (const order of recentOrders) {
      const payment = paymentMap.get(order.paymentMode) ?? { mode: order.paymentMode, count: 0, revenue: 0 };
      payment.count += 1;
      payment.revenue += order.finalTotal;
      paymentMap.set(order.paymentMode, payment);

      const hour = `${new Date(order.createdAt).getHours().toString().padStart(2, "0")}:00`;
      const current = hourMap.get(hour) ?? { hour, orders: 0, revenue: 0 };
      current.orders += 1;
      current.revenue += order.finalTotal;
      hourMap.set(hour, current);
    }

    const hourlyDemand = [...hourMap.values()].sort((a, b) => a.hour.localeCompare(b.hour));
    const busiestHour = [...hourMap.values()].sort((a, b) => b.orders - a.orders)[0]?.hour ?? "20:00";
    const topPizza = await loadTopSellingPizza();
    const { forecast, topPeaks, forecastMeta } = await getForecastForSummary(
      recentOrders.map((order) => ({ createdAt: order.createdAt, finalTotal: order.finalTotal })),
      recentOrders.length
    );

    return {
      totalRevenue,
      orderCount: recentOrders.length,
      avgOrderValue: totalRevenue / Math.max(recentOrders.length, 1),
      topPizza,
      busiestHour,
      paymentMix: [...paymentMap.values()],
      hourlyDemand,
      recentOrders,
      forecast,
      topPeaks,
      forecastMeta
    };
  } catch (err) {
    console.error("Exception in loadAdminSummary:", err);
    return {
      totalRevenue: 0,
      orderCount: 0,
      avgOrderValue: 0,
      topPizza: "N/A",
      busiestHour: "N/A",
      paymentMix: [],
      hourlyDemand: [],
      recentOrders: [],
      forecast: []
    };
  }
}

async function loadTopSellingPizza() {
  const supabase = getSupabaseServerClient();
  if (!supabase) return buildSeedSummary().topPizza;

  try {
    const linesResult = await supabase
      .schema("slicematic")
      .from("order_item")
      .select("quantity, pizza:pizza_type_id(pizza_name)");
    if (linesResult.error || !linesResult.data?.length) return buildSeedSummary().topPizza;

    const counts = new Map<string, number>();
    for (const row of linesResult.data) {
      const pizza = Array.isArray(row.pizza) ? row.pizza[0] : row.pizza;
      const name = String(pizza?.pizza_name ?? "Unknown pizza");
      counts.set(name, (counts.get(name) ?? 0) + Number(row.quantity ?? 0));
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? buildSeedSummary().topPizza;
  } catch {
    return buildSeedSummary().topPizza;
  }
}
