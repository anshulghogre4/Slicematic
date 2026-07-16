# Feature: AI Cart Strategist

## Overview
The AI Cart Strategist acts as an in-app assistant that analyzes the customer's current cart and provides actionable insights. It aims to increase the average order value (AOV), protect outlet economics, and guide users to unlock perks like bulk discounts or free delivery.

## Core Implementation Details

### 1. API Route (`app/api/ai/cart-insight/route.ts`)
This endpoint accepts the current state of the customer's cart, pricing configuration, and guest status, returning a single, high-impact suggestion.

**Inputs:**
- Current `lines` (items in the cart).
- `pricingConfig` (e.g., `bulkDiscountQty`, `bulkDiscountRate`, `freeDeliveryMin`).
- `isGuest` boolean.

**Logic Flow:**
1. **Bill Calculation:** Calculates the current subtotal, GST, discount, and delivery charge using standard pricing utilities (`calculateBill`).
2. **Context Assembly:** Prepares a state object detailing how far the user is from the bulk discount threshold or free delivery limit.
3. **LLM Invocation:** Calls the OpenRouter AI with the `SYSTEM` prompt.

### 2. Strategic Rules
The `SYSTEM` prompt dictates strict economic rules the LLM must follow:
- **Bulk Discount:** If the user is 1-4 pizzas away from `bulk_discount_threshold`, suggest adding exact pizzas to unlock the discount.
- **Max Quantity:** Warn if the cart approaches or hits `max_order_qty`.
- **Delivery Fee:** If `delivery_fee > 0` and `subtotal < free_delivery_min`, suggest adding items to save on delivery.
- **Guest Nudge:** If `is_guest` is true, incorporate a nudge to sign in for member perks and order history.
- **Optimal Cart:** If discounts and free delivery are already unlocked, reassure the user and suggest proceeding to checkout.

### 3. Output Schema
The response is strictly formatted to populate the UI component (`RecommendationAIPanel`):
- `headline`: Short catchy title (e.g., "Group value nearby").
- `message`: Detailed reasoning (e.g., "Add 1 more pizza to unlock the 15% discount").
- `nextAction`: CTA button text.
- `suggestedPizzaId` / `suggestedToppingId`: Optional IDs for a one-click add to cart.
- `expectedImpact`: Short description of the benefit (e.g., "Unlocks quantity discount").
- `confidence`: AI confidence score.

### 4. Deterministic Fallback
The `fallbackInsight()` function provides hardcoded logic matching the LLM's rules if the API fails:
- Empty cart: Suggests a bestseller (e.g., Paneer Tikka).
- Near discount: Calculates the gap and suggests adding pizzas.
- Guest user: Prompts sign-in.
- Optimal cart: Reassures and prompts checkout.

## Possible Interview Questions & Talking Points

- **Why use an LLM for cart insights instead of just hardcoded rules?**
  *While hardcoded rules work for basic triggers, an LLM can synthesize multiple conditions simultaneously (e.g., a guest user who is also 1 pizza away from a discount) and generate natural, contextual copy that feels like a concierge rather than a generic popup.*
- **How do you ensure the AI doesn't give bad pricing advice?**
  *The prompt explicitly forbids inventing numbers. We pass the exact pricing parameters (`pricing_rules`) and current totals into the context, forcing the LLM to base its math and logic on ground-truth backend configurations.*
