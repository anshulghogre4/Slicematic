import { randomUUID } from "crypto";
import { calculateBill, getLineUnitPrice, sanitizePricingConfig } from "./pricing";
import { buildSeedSummary, seedMenu, seedOrders } from "./seed-data";
import { getSupabaseServerClient } from "./supabase";
import { AdminSummary, CartLine, MenuItem, MenuPayload, OrderPayload, PaymentMeta, SavedOrder } from "./types";

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

  const supabase = getSupabaseServerClient();
  if (!supabase) return savedOrder;

  try {
    const customerId = randomUUID();
    const uuidOrderId = randomUUID();
    const [firstName, ...rest] = payload.customer.name.trim().split(/\s+/);
    const lastName = rest.join(" ");

    const existingCustomer = await supabase
      .schema("slicematic")
      .from("customer")
      .select("customer_id")
      .eq("mobile_number", payload.customer.phone.trim())
      .maybeSingle();

    const effectiveCustomerId = existingCustomer.data?.customer_id ?? customerId;

    if (!existingCustomer.data) {
      const { error: customerError } = await supabase.schema("slicematic").from("customer").insert({
        customer_id: effectiveCustomerId,
        first_name: firstName,
        last_name: lastName,
        mobile_number: payload.customer.phone.trim(),
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

    return { ...savedOrder, id: uuidOrderId };
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

export async function loadAdminSummary(): Promise<AdminSummary> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return buildSeedSummary();

  try {
    const ordersResult = await supabase
      .schema("slicematic")
      .from("orders")
      .select("order_id, order_datetime, order_status, payment_method, subtotal_amount, discount_amount, tax_amount, final_amount, delivery_address, delivery_zone, customer:customer_id(first_name,last_name,mobile_number)")
      .order("order_datetime", { ascending: false });

    if (ordersResult.error || !ordersResult.data?.length) return buildSeedSummary();

    const recentOrders: SavedOrder[] = ordersResult.data.map((row) => {
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

    return {
      totalRevenue,
      orderCount: recentOrders.length,
      avgOrderValue: totalRevenue / Math.max(recentOrders.length, 1),
      topPizza,
      busiestHour,
      paymentMix: [...paymentMap.values()],
      hourlyDemand,
      recentOrders,
      forecast: forecastFromHourlyDemand(hourlyDemand)
    };
  } catch {
    return buildSeedSummary();
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

function forecastFromHourlyDemand(hourlyDemand: Array<{ hour: string; orders: number }>) {
  if (!hourlyDemand.length) return buildSeedSummary().forecast;
  const mean = hourlyDemand.reduce((sum, item) => sum + item.orders, 0) / hourlyDemand.length;
  return ["Fri 19:00", "Sat 20:00", "Sun 13:00", "Mon 20:00", "Tue 19:00", "Wed 21:00", "Thu 20:00"].map((label, index) => ({
    label,
    predictedOrders: Math.max(1, Math.round(mean * (1 + Math.sin(index + 1) * 0.22 + (index < 2 ? 0.35 : 0)))),
    confidence: Number((0.78 + Math.max(0, 4 - index) * 0.03).toFixed(2))
  }));
}
