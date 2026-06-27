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
- If the customer is new, recommend a popular crowd-pleaser and say it is a safe first pick.
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
  const menuSignals = buildMenuSignals(menu);

  const fallback = buildFallbackRecommendation(menu, customerTier, customerProfile);

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

    if (!response.ok) throw new Error("OpenRouter request failed");
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(stripJsonFence(content));
    const pizza = menu.pizzas.find((item) => item.id === Number(parsed.pizza_id) && item.available);
    const topping = menu.toppings.find((item) => item.id === Number(parsed.topping_id) && item.available);
    if (!pizza || !topping) throw new Error("Ungrounded recommendation");

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

    const orders = await supabase
      .schema("slicematic")
      .from("orders")
      .select("order_id, order_datetime, final_amount, order_item(pizza_type_id, base_id, quantity, order_item_topping(topping_id))")
      .eq("customer_id", customer.data.customer_id)
      .order("order_datetime", { ascending: false })
      .limit(8);

    return ((orders.data ?? []) as Array<Record<string, any>>).flatMap((order) => {
      const items = Array.isArray(order.order_item) ? order.order_item : [];
      return items.map((item) => {
        const pizza = menu.pizzas.find((entry) => entry.id === Number(item.pizza_type_id));
        const toppingRows = (Array.isArray(item.order_item_topping) ? item.order_item_topping : []) as Array<{ topping_id: number | string }>;
        const toppingIds = toppingRows
          .map((row) => Number(row.topping_id))
          .filter((id) => Number.isFinite(id));
        return {
          pizzaId: pizza?.id,
          pizzaName: pizza?.name ?? "Unknown pizza",
          toppingIds,
          toppingNames: toppingIds.map((id) => menu.toppings.find((entry) => entry.id === id)?.name ?? `Topping ${id}`),
          quantity: Number(item.quantity ?? 1),
          orderedAt: String(order.order_datetime ?? ""),
          finalAmount: Number(order.final_amount ?? 0)
        };
      });
    });
  } catch {
    return [];
  }
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

function buildMenuSignals(menu: MenuPayload) {
  const availablePizzas = menu.pizzas.filter((item) => item.available);
  const availableToppings = menu.toppings.filter((item) => item.available);
  return {
    highMarginToppingIds: availableToppings
      .slice()
      .sort((a, b) => b.price - a.price)
      .slice(0, 3)
      .map((item) => ({ id: item.id, name: item.name, price: item.price })),
    localFavourites: availablePizzas
      .filter((item) => item.tags?.some((tag) => ["Paneer", "Spicy", "Cheese", "Chicken"].includes(tag)))
      .map((item) => ({ id: item.id, name: item.name, tags: item.tags, price: item.price })),
    safeDefaultPizzaId: availablePizzas.find((item) => item.name.includes("Paneer"))?.id ?? availablePizzas[0]?.id
  };
}

function buildFallbackRecommendation(menu: MenuPayload, customerTier: Recommendation["customerTier"], profile: ReturnType<typeof buildCustomerProfile>): Recommendation {
  const pizza = (profile.favouritePizzaId ? menu.pizzas.find((item) => item.id === profile.favouritePizzaId && item.available) : null)
    ?? menu.pizzas.find((item) => item.name.includes("Paneer") && item.available)
    ?? menu.pizzas.find((item) => item.available)
    ?? menu.pizzas[0];
  const topping = (profile.favouriteToppingId ? menu.toppings.find((item) => item.id === profile.favouriteToppingId && item.available) : null)
    ?? menu.toppings.find((item) => item.name.includes("Extra Cheese") && item.available)
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
      : "A reliable first pick with strong repeat-order appeal.",
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
