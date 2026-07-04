import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { loadMenu } from "../../../lib/data-service";
import { seedOrders } from "../../../lib/seed-data";
import { getSupabaseServerClient } from "../../../lib/supabase";
import { MenuPayload, Recommendation } from "../../../lib/types";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are SliceMatic's in-app pizza recommendation assistant for a single outlet in Delhi.
Recommend exactly one pizza and one topping the customer is likely to enjoy.
Hard rules:
- Only choose from the menu IDs provided. Never invent menu items.
- Return strict JSON only.
- If history exists, personalize using favourite pizza, topping, spend, veg/non-veg lean, spicy lean, quantity pattern, and recency.
- If the customer is new, prefer the most-ordered items from the popularity data provided — these are proven crowd-pleasers based on real order history. Say it is a popular pick.
- Prefer combinations that improve customer fit and contribution margin without pushing unnecessary discounts.
- Keep the reason under 20 words, friendly, and without emojis.`;

type RecommendRequest = {
  name: string;
  phone: string;
};

type HistoryLine = {
  pizzaId?: number;
  pizzaName: string;
  toppingIds: number[];
  toppingNames: string[];
  quantity: number;
  orderedAt?: string;
  finalAmount?: number;
};

export async function POST(request: Request) {
  const body = (await request.json()) as RecommendRequest;
  const menu = await loadMenu();
  const history = await getCustomerHistory(body.phone, menu);
  const customerTier = history.length ? "returning" : "new";
  const customerProfile = buildCustomerProfile(history, menu);
  const popularity = await getGlobalPopularity(menu);
  const menuSignals = buildMenuSignals(menu, popularity);

  const fallback = buildFallbackRecommendation(menu, customerTier, customerProfile, popularity);

  if (!process.env.OPENROUTER_API_KEY) {
    const logged = await logRecommendation(body.phone, fallback);
    return NextResponse.json({ ...fallback, recommendationId: logged ?? fallback.recommendationId });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "http-referer": "https://slicematic.vercel.app",
        "x-title": "SliceMatic PizzaFlow"
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL ?? "openai/gpt-oss-20b",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              customer: { name: body.name, phone: body.phone, tier: customerTier },
              customer_profile: customerProfile,
              menu_signals: menuSignals,
              menu: {
                pizzas: menu.pizzas.filter((item) => item.available).map(({ id, name, tags, price }) => ({ id, name, tags, price })),
                toppings: menu.toppings.filter((item) => item.available).map(({ id, name, price }) => ({ id, name, price }))
              },
              recent_history: history.slice(0, 8),
              output_schema: {
                pizza_id: "number",
                topping_id: "number",
                reason: "string",
                confidence: "number 0..1"
              }
            })
          }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("OpenRouter API error:", response.status, errText.slice(0, 300));
      throw new Error(`OpenRouter request failed (${response.status})`);
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(stripJsonFence(content));
    const pizza = menu.pizzas.find((item) => item.id === Number(parsed.pizza_id) && item.available);
    const topping = menu.toppings.find((item) => item.id === Number(parsed.topping_id) && item.available);
    if (!pizza || !topping) {
      console.error("Ungrounded recommendation:", { parsedPizzaId: parsed.pizza_id, parsedToppingId: parsed.topping_id, availablePizzaIds: menu.pizzas.filter(p => p.available).map(p => p.id), availableToppingIds: menu.toppings.filter(t => t.available).map(t => t.id) });
      throw new Error("Ungrounded recommendation");
    }

    const recommendation: Recommendation = {
      recommendationId: randomUUID(),
      pizzaId: pizza.id,
      toppingId: topping.id,
      pizzaName: pizza.name,
      toppingName: topping.name,
      reason: String(parsed.reason ?? fallback.reason).slice(0, 140),
      confidence: clampConfidence(Number(parsed.confidence ?? 0.82)),
      source: "openrouter",
      customerTier
    };
    const logged = await logRecommendation(body.phone, recommendation);
    return NextResponse.json({ ...recommendation, recommendationId: logged ?? recommendation.recommendationId });
  } catch {
    const logged = await logRecommendation(body.phone, fallback);
    return NextResponse.json({ ...fallback, recommendationId: logged ?? fallback.recommendationId });
  }
}

async function getCustomerHistory(phone: string, menu: MenuPayload): Promise<HistoryLine[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return seedOrders
      .filter((order) => order.phone === phone)
      .flatMap((order) => order.lines.map((line) => {
        const pizza = menu.pizzas.find((item) => item.name === line.pizzaName);
        const toppingIds = line.toppings
          .map((name) => menu.toppings.find((item) => item.name === name)?.id)
          .filter((id): id is number => id !== undefined);
        return {
          pizzaId: pizza?.id,
          pizzaName: line.pizzaName,
          toppingIds,
          toppingNames: line.toppings,
          quantity: line.quantity,
          orderedAt: order.createdAt,
          finalAmount: order.finalTotal
        };
      }));
  }

  try {
    const customer = await supabase
      .schema("slicematic")
      .from("customer")
      .select("customer_id")
      .eq("mobile_number", phone)
      .maybeSingle();
    if (!customer.data?.customer_id) return [];

    // Fetch orders without nested joins (same RLS fix as customer orders API)
    const orders = await supabase
      .schema("slicematic")
      .from("orders")
      .select("order_id, order_datetime, final_amount")
      .eq("customer_id", customer.data.customer_id)
      .order("order_datetime", { ascending: false })
      .limit(8);

    if (!orders.data?.length) return [];

    // Fetch order items separately
    const orderIds = orders.data.map((o: any) => o.order_id);
    const { data: itemsData } = await supabase
      .schema("slicematic")
      .from("order_item")
      .select("order_item_id, order_id, pizza_type_id, quantity")
      .in("order_id", orderIds);

    if (!itemsData?.length) return [];

    // Fetch toppings for those order items separately
    const orderItemIds = itemsData.map((i: any) => i.order_item_id);
    const { data: toppingsData } = await supabase
      .schema("slicematic")
      .from("order_item_topping")
      .select("order_item_id, topping_id")
      .in("order_item_id", orderItemIds);

    // Build topping lookup by order_item_id
    const toppingsByItem = new Map<string, number[]>();
    for (const t of (toppingsData || [])) {
      const arr = toppingsByItem.get(t.order_item_id) || [];
      arr.push(Number(t.topping_id));
      toppingsByItem.set(t.order_item_id, arr);
    }

    // Build order lookup for datetime/amount
    const orderMap = new Map(orders.data.map((o: any) => [o.order_id, o]));

    return itemsData.map((item: any) => {
      const order = orderMap.get(item.order_id);
      const pizza = menu.pizzas.find((entry) => entry.id === Number(item.pizza_type_id));
      const toppingIds = (toppingsByItem.get(item.order_item_id) || []).filter((id) => Number.isFinite(id));
      return {
        pizzaId: pizza?.id,
        pizzaName: pizza?.name ?? "Unknown pizza",
        toppingIds,
        toppingNames: toppingIds.map((id) => menu.toppings.find((entry) => entry.id === id)?.name ?? `Topping ${id}`),
        quantity: Number(item.quantity ?? 1),
        orderedAt: String(order?.order_datetime ?? ""),
        finalAmount: Number(order?.final_amount ?? 0)
      };
    });
  } catch {
    return [];
  }
}

type PopularityData = {
  topPizzas: { id: number; name: string; totalOrdered: number }[];
  topToppings: { id: number; name: string; totalOrdered: number }[];
};

async function getGlobalPopularity(menu: MenuPayload): Promise<PopularityData> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return buildPopularityFromSeed(menu);

  try {
    const items = await supabase
      .schema("slicematic")
      .from("order_item")
      .select("pizza_type_id, quantity");
    const toppingRows = await supabase
      .schema("slicematic")
      .from("order_item_topping")
      .select("topping_id");

    if (!items.data?.length) return buildPopularityFromSeed(menu);

    const pizzaCounts = new Map<number, number>();
    for (const row of items.data) {
      const id = Number(row.pizza_type_id);
      pizzaCounts.set(id, (pizzaCounts.get(id) ?? 0) + Number(row.quantity ?? 1));
    }
    const topPizzas = [...pizzaCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, total]) => ({
        id,
        name: menu.pizzas.find((p) => p.id === id)?.name ?? `Pizza ${id}`,
        totalOrdered: total
      }));

    const toppingCounts = new Map<number, number>();
    for (const row of (toppingRows.data ?? [])) {
      const id = Number(row.topping_id);
      toppingCounts.set(id, (toppingCounts.get(id) ?? 0) + 1);
    }
    const topToppings = [...toppingCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, total]) => ({
        id,
        name: menu.toppings.find((t) => t.id === id)?.name ?? `Topping ${id}`,
        totalOrdered: total
      }));

    return { topPizzas, topToppings };
  } catch {
    return buildPopularityFromSeed(menu);
  }
}

function buildPopularityFromSeed(menu: MenuPayload): PopularityData {
  const pizzaCounts = new Map<string, number>();
  const toppingCounts = new Map<string, number>();
  for (const order of seedOrders) {
    for (const line of order.lines) {
      pizzaCounts.set(line.pizzaName, (pizzaCounts.get(line.pizzaName) ?? 0) + line.quantity);
      for (const t of line.toppings) {
        toppingCounts.set(t, (toppingCounts.get(t) ?? 0) + 1);
      }
    }
  }
  const topPizzas = [...pizzaCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, total]) => ({
      id: menu.pizzas.find((p) => p.name === name)?.id ?? 0,
      name,
      totalOrdered: total
    }))
    .filter((p) => p.id > 0);
  const topToppings = [...toppingCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, total]) => ({
      id: menu.toppings.find((t) => t.name === name)?.id ?? 0,
      name,
      totalOrdered: total
    }))
    .filter((t) => t.id > 0);
  return { topPizzas, topToppings };
}

function buildCustomerProfile(history: HistoryLine[], menu: MenuPayload) {
  if (!history.length) {
    return {
      orderCount: 0,
      favouritePizzaId: null,
      favouritePizzaName: null,
      favouriteToppingId: null,
      favouriteToppingName: null,
      avgQuantity: 0,
      avgSpend: 0,
      vegLean: 0,
      spicyLean: 0,
      lastOrderedAt: null
    };
  }

  const pizzaCounts = new Map<number, number>();
  const toppingCounts = new Map<number, number>();
  let totalQuantity = 0;
  let totalSpend = 0;
  let vegHits = 0;
  let spicyHits = 0;

  for (const line of history) {
    totalQuantity += line.quantity;
    totalSpend += line.finalAmount ?? 0;
    if (line.pizzaId) pizzaCounts.set(line.pizzaId, (pizzaCounts.get(line.pizzaId) ?? 0) + line.quantity);
    for (const toppingId of line.toppingIds) {
      toppingCounts.set(toppingId, (toppingCounts.get(toppingId) ?? 0) + line.quantity);
    }
    const pizza = menu.pizzas.find((item) => item.id === line.pizzaId);
    const tags = pizza?.tags ?? [];
    if (tags.includes("Veg")) vegHits += line.quantity;
    if (tags.includes("Spicy")) spicyHits += line.quantity;
  }

  const favouritePizzaId = [...pizzaCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const favouriteToppingId = [...toppingCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return {
    orderCount: history.length,
    favouritePizzaId,
    favouritePizzaName: menu.pizzas.find((item) => item.id === favouritePizzaId)?.name ?? null,
    favouriteToppingId,
    favouriteToppingName: menu.toppings.find((item) => item.id === favouriteToppingId)?.name ?? null,
    avgQuantity: Number((totalQuantity / history.length).toFixed(2)),
    avgSpend: Number((totalSpend / history.length).toFixed(2)),
    vegLean: Number((vegHits / Math.max(totalQuantity, 1)).toFixed(2)),
    spicyLean: Number((spicyHits / Math.max(totalQuantity, 1)).toFixed(2)),
    lastOrderedAt: history[0]?.orderedAt ?? null
  };
}

function buildMenuSignals(menu: MenuPayload, popularity: PopularityData) {
  const availablePizzas = menu.pizzas.filter((item) => item.available);
  const availableToppings = menu.toppings.filter((item) => item.available);
  return {
    highMarginToppingIds: availableToppings
      .slice()
      .sort((a, b) => b.price - a.price)
      .slice(0, 3)
      .map((item) => ({ id: item.id, name: item.name, price: item.price })),
    topPizzas: popularity.topPizzas,
    topToppings: popularity.topToppings,
    safeDefaultPizzaId: popularity.topPizzas[0]?.id ?? availablePizzas[0]?.id
  };
}

function buildFallbackRecommendation(menu: MenuPayload, customerTier: Recommendation["customerTier"], profile: ReturnType<typeof buildCustomerProfile>, popularity: PopularityData): Recommendation {
  const pizza = (profile.favouritePizzaId ? menu.pizzas.find((item) => item.id === profile.favouritePizzaId && item.available) : null)
    ?? (popularity.topPizzas[0] ? menu.pizzas.find((item) => item.id === popularity.topPizzas[0].id && item.available) : null)
    ?? menu.pizzas.find((item) => item.available)
    ?? menu.pizzas[0];
  const topping = (profile.favouriteToppingId ? menu.toppings.find((item) => item.id === profile.favouriteToppingId && item.available) : null)
    ?? (popularity.topToppings[0] ? menu.toppings.find((item) => item.id === popularity.topToppings[0].id && item.available) : null)
    ?? menu.toppings.find((item) => item.available)
    ?? menu.toppings[0];
  return {
    recommendationId: randomUUID(),
    pizzaId: pizza.id,
    toppingId: topping.id,
    pizzaName: pizza.name,
    toppingName: topping.name,
    reason: customerTier === "returning"
      ? "Built from your previous SliceMatic favourites and high-repeat add-ons."
      : `Our most popular combo — loved by ${popularity.topPizzas[0]?.totalOrdered ?? "many"} customers.`,
    confidence: customerTier === "returning" ? 0.86 : 0.76,
    source: "fallback",
    customerTier
  };
}

function stripJsonFence(content: string) {
  return String(content).trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
}

function clampConfidence(value: number) {
  if (!Number.isFinite(value)) return 0.82;
  return Math.min(0.99, Math.max(0.01, value));
}

async function logRecommendation(phone: string, recommendation: Recommendation) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return recommendation.recommendationId;
  try {
    const customer = await supabase
      .schema("slicematic")
      .from("customer")
      .select("customer_id")
      .eq("mobile_number", phone)
      .maybeSingle();
    const id = recommendation.recommendationId ?? randomUUID();
    await supabase.schema("slicematic").from("recommendation_event").insert({
      recommendation_id: id,
      customer_id: customer.data?.customer_id ?? null,
      recommended_item_type: "PIZZA_TOPPING_COMBO",
      recommended_item_id: recommendation.pizzaId,
      recommended_topping_id: recommendation.toppingId,
      recommendation_score: recommendation.confidence,
      recommendation_timestamp: new Date().toISOString(),
      action_taken: "Shown"
    });
    return id;
  } catch {
    return recommendation.recommendationId;
  }
}
