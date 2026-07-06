import { NextResponse } from "next/server";
import { callOpenRouterJson } from "../../../../lib/ai";
import { loadMenu } from "../../../../lib/data-service";
import { BULK_DISCOUNT_QTY, calculateBill, getLineUnitPrice } from "../../../../lib/pricing";
import { PricingConfig, CartLine, CustomerDetails } from "../../../../lib/types";
import { defaultPricingConfig } from "../../../../lib/pricing";

export const dynamic = "force-dynamic";

type CartInsightRequest = {
  customer?: CustomerDetails;
  lines: CartLine[];
  pricingConfig?: PricingConfig;
  isGuest?: boolean;
};

type CartInsight = {
  headline: string;
  message: string;
  nextAction: string;
  suggestedPizzaId?: number;
  suggestedPizzaName?: string;
  suggestedToppingId?: number;
  suggestedToppingName?: string;
  expectedImpact: string;
  confidence: number;
};

const SYSTEM = `You are SliceMatic's AI cart strategist.
Return strict JSON only.
Help the customer make a better pizza order while protecting outlet economics.
Use only the values from the provided pricing_rules context (do not invent numbers).

Rules:
1. If pizzas_to_discount_threshold > 0 and <= 4, suggest adding that exact number of pizzas to unlock the bulk_discount_rate_pct discount.
2. If pizzas_in_cart >= max_order_qty, warn the customer they are near or at the maximum order limit.
3. If delivery_fee > 0 and current_subtotal < free_delivery_min, suggest adding items to save on delivery.
4. If is_guest is true, ALWAYS include a nudge to "Sign in" for benefits like order history and member pricing (this can be combined with other advice).
5. If the cart is already optimal (discount unlocked, free delivery), reassure the customer and suggest proceeding to checkout.

Keep text concise and customer-facing.`;

export async function POST(request: Request) {
  const body = (await request.json()) as CartInsightRequest;
  const menu = await loadMenu();
  const config = body.pricingConfig ?? defaultPricingConfig;
  const totals = calculateBill(body.lines ?? [], menu, config);
  const fallback = fallbackInsight(body.lines ?? [], menu, config, body.isGuest);

  const cart = (body.lines ?? []).map((line) => {
    const pizza = menu.pizzas.find((item) => item.id === line.pizzaId);
    const base = menu.bases.find((item) => item.id === line.baseId);
    const toppings = line.toppingIds.map((id) => menu.toppings.find((item) => item.id === id)?.name).filter(Boolean);
    return {
      pizza_id: line.pizzaId,
      pizza: pizza?.name,
      base: base?.name,
      toppings,
      quantity: line.quantity,
      line_total: getLineUnitPrice(line, menu) * line.quantity
    };
  });

  const pizzasInCart = totals.totalQuantity;
  const pizzasToDiscount = Math.max(0, config.bulkDiscountQty - pizzasInCart);

  const { data, source } = await callOpenRouterJson<CartInsight>({
    system: SYSTEM,
    user: {
      customer: {
        name: body.customer?.name,
        deliveryZone: body.customer?.deliveryZone
      },
      is_guest: body.isGuest,
      cart,
      totals: {
        current_subtotal: totals.subtotal,
        current_gst: totals.gst,
        current_discount_amount: totals.discount,
        current_delivery_charge: totals.deliveryCharge,
        current_total: totals.finalTotal,
        pizzas_in_cart: pizzasInCart,
        pizzas_to_discount_threshold: pizzasToDiscount,
        discount_unlocked: pizzasInCart >= config.bulkDiscountQty
      },
      pricing_rules: {
        gst_rate_pct: config.gstRate * 100,
        bulk_discount_rate_pct: config.bulkDiscountRate * 100,
        bulk_discount_threshold: config.bulkDiscountQty,
        max_order_qty: config.maxOrderQty,
        delivery_fee: config.deliveryFee,
        free_delivery_min: config.freeDeliveryMin
      },
      menu: {
        pizzas: menu.pizzas.filter((item) => item.available).map(({ id, name, price, tags }) => ({ id, name, price, tags })),
        toppings: menu.toppings.filter((item) => item.available).map(({ id, name, price }) => ({ id, name, price }))
      },
      output_schema: {
        headline: "string under 8 words",
        message: "string under 28 words",
        nextAction: "string under 18 words",
        suggestedPizzaId: "number optional",
        suggestedToppingId: "number optional",
        expectedImpact: "string under 18 words",
        confidence: "number 0..1"
      }
    },
    fallback
  });

  return NextResponse.json({ ok: true, insight: normalizeInsight(data, fallback, menu), source });
}

function fallbackInsight(lines: CartLine[], menu: Awaited<ReturnType<typeof loadMenu>>, config: PricingConfig, isGuest?: boolean): CartInsight {
  const totals = calculateBill(lines, menu, config);
  const extraCheese = menu.toppings.find((item) => item.available && item.name.includes("Extra Cheese")) ?? menu.toppings.find((item) => item.available);
  const paneer = menu.pizzas.find((item) => item.available && item.name.includes("Paneer")) ?? menu.pizzas.find((item) => item.available);

  if (!lines.length) {
    return {
      headline: "Start with a bestseller",
      message: `${paneer?.name ?? "Paneer Tikka"} is a reliable first pick for new SliceMatic customers.`,
      nextAction: "Build the suggested combo",
      suggestedPizzaId: paneer?.id,
      suggestedPizzaName: paneer?.name,
      suggestedToppingId: extraCheese?.id,
      suggestedToppingName: extraCheese?.name,
      expectedImpact: "Higher first-order confidence",
      confidence: 0.76
    };
  }

  if (totals.totalQuantity < config.bulkDiscountQty) {
    const needed = config.bulkDiscountQty - totals.totalQuantity;
    const guestNudge = isGuest ? " Sign in for member perks!" : "";
    return {
      headline: "Group value nearby",
      message: `Add ${needed} more pizza${needed === 1 ? "" : "s"} to unlock the ${config.bulkDiscountRate * 100}% quantity discount.${guestNudge}`,
      nextAction: "Consider more pizzas",
      suggestedPizzaId: paneer?.id,
      suggestedPizzaName: paneer?.name,
      suggestedToppingId: extraCheese?.id,
      suggestedToppingName: extraCheese?.name,
      expectedImpact: "Unlocks quantity discount",
      confidence: 0.82
    };
  }

  if (isGuest) {
    return {
      headline: "Unlock Member Perks",
      message: "Sign in to access your order history and pay with cash on delivery. Your discount is already active!",
      nextAction: "Sign in",
      suggestedToppingId: extraCheese?.id,
      suggestedToppingName: extraCheese?.name,
      expectedImpact: "Improved customer retention",
      confidence: 0.85
    };
  }

  return {
    headline: "Cart is discount-ready",
    message: "Your order already unlocks the quantity discount. Extra toppings are optional, not necessary.",
    nextAction: "Proceed to checkout",
    suggestedToppingId: extraCheese?.id,
    suggestedToppingName: extraCheese?.name,
    expectedImpact: "Clear value and faster checkout",
    confidence: 0.86
  };
}

function normalizeInsight(insight: CartInsight, fallback: CartInsight, menu: Awaited<ReturnType<typeof loadMenu>>): CartInsight {
  const pizza = menu.pizzas.find((item) => item.id === Number(insight.suggestedPizzaId) && item.available);
  const topping = menu.toppings.find((item) => item.id === Number(insight.suggestedToppingId) && item.available);
  return {
    headline: String(insight.headline || fallback.headline).slice(0, 80),
    message: String(insight.message || fallback.message).slice(0, 180),
    nextAction: String(insight.nextAction || fallback.nextAction).slice(0, 80),
    suggestedPizzaId: pizza?.id ?? fallback.suggestedPizzaId,
    suggestedPizzaName: pizza?.name ?? fallback.suggestedPizzaName,
    suggestedToppingId: topping?.id ?? fallback.suggestedToppingId,
    suggestedToppingName: topping?.name ?? fallback.suggestedToppingName,
    expectedImpact: String(insight.expectedImpact || fallback.expectedImpact).slice(0, 100),
    confidence: clamp(Number(insight.confidence || fallback.confidence))
  };
}

function clamp(value: number) {
  if (!Number.isFinite(value)) return 0.8;
  return Math.min(0.99, Math.max(0.01, value));
}
