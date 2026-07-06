# AI Recommendation Engine — Technical Documentation

**Stage 3 · Option A — AI Recommendation Engine**
SliceMatic Full-Stack App · FDE Academy Batch 2487

---

## 1. Assignment Requirement vs Implementation

### What the brief says (Page 7)

> *After the customer enters their name and phone number, query Supabase for their past orders.
> Send the order history to an LLM via OpenRouter and ask it to recommend a pizza + topping
> combination with a short explanation. Show this as a personalised suggestion before the menu
> selection step. Document your system prompt and the model you chose.*

### Compliance checklist

| Requirement | Status | How we meet it |
|---|---|---|
| Trigger after name + phone entry | Done | `submitCustomer()` in `SliceMaticStage3.tsx:420` fires after customer validation passes |
| Query Supabase for past orders | Done | `getCustomerHistory()` in `recommend/route.ts:157` queries `slicematic.customer` → `slicematic.orders` → `slicematic.order_item` → `slicematic.order_item_topping` |
| Send order history to LLM via OpenRouter | Done | POST to `https://openrouter.ai/api/v1/chat/completions` at `route.ts:62` with `recent_history` (last 8 orders) and computed `customer_profile` |
| Recommend pizza + topping combo | Done | AI returns `pizza_id` + `topping_id` + `reason` + `confidence`; validated against live menu before display |
| Short explanation | Done | System prompt enforces `reason` under 20 words |
| Show before menu selection step | Done | Recommendation screen (`step === "recommendation"`) appears after Customer Details and before Menu in the tab flow |
| Document system prompt | Done | Full prompt in Section 3 below |
| Document model choice | Done | `openai/gpt-oss-20b` — see Section 4 |

### Add-on beyond the brief

We go beyond the required single recommendation:

- **3 recommendations** (not just 1) — personal favourite, global popularity pick, and an exploratory option
- **Data-driven new-customer experience** — for first-time customers with no history, we query ALL orders in the DB to find the genuinely most-ordered pizza and topping, rather than hardcoding a default
- **Global popularity signals** sent to the AI — `topPizzas` and `topToppings` ranked by actual order volume across all customers
- **Recommendation event logging** — every recommendation shown is recorded in `slicematic.recommendation_event` with the action updated to `"Purchased"` if the customer buys it (closed-loop tracking)

---

## 2. Architecture — Data Flow

```
Customer enters name + phone
        │
        ▼
┌─────────────────────────┐
│  POST /api/recommend    │
│  (route.ts)             │
└─────────┬───────────────┘
          │
          ├──► getCustomerHistory(phone)
          │    ├── Supabase: customer → orders → order_item → order_item_topping
          │    └── Fallback: seedOrders (in-memory demo data)
          │
          ├──► getGlobalPopularity(menu)
          │    ├── Supabase: order_item (GROUP BY pizza_type_id, SUM quantity)
          │    ├── Supabase: order_item_topping (GROUP BY topping_id, COUNT)
          │    └── Fallback: buildPopularityFromSeed()
          │
          ├──► buildCustomerProfile(history)
          │    Returns: orderCount, favouritePizzaId/Name, favouriteToppingId/Name,
          │             avgQuantity, avgSpend, vegLean, spicyLean, lastOrderedAt
          │
          ├──► buildMenuSignals(menu, popularity)
          │    Returns: highMarginToppingIds, topPizzas, topToppings, safeDefaultPizzaId
          │
          ▼
┌─────────────────────────────────────────────┐
│  OpenRouter API                             │
│  POST openrouter.ai/api/v1/chat/completions │
│  Model: openai/gpt-oss-20b                 │
│  temperature: 0.2                           │
│  response_format: json_object               │
│                                             │
│  Input:  customer tier, profile, menu,      │
│          popularity signals, recent history  │
│  Output: 3x {pizza_id, topping_id,          │
│              reason, confidence}             │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
          Validate each recommendation:
          - pizza_id must match an available menu item
          - topping_id must match an available menu item
          - No duplicate pizzas across the 3 picks
          - Ungrounded IDs → discard that pick
                   │
                   ▼
          logRecommendation() → slicematic.recommendation_event
                   │
                   ▼
          Return JSON to frontend → display recommendation cards
```

### Fallback chain (3 levels)

1. **OpenRouter succeeds** → validated AI picks displayed (source: `"openrouter"`)
2. **OpenRouter fails / no API key** → `buildFallbackRecommendations()` uses DB popularity data (source: `"fallback"`)
3. **Frontend network error** (API route itself unreachable) → generic "Browse our menu" prompt with no specific pizza

---

## 3. System Prompt (Exact)

**File:** `FullStack/app/api/recommend/route.ts` lines 10–20

```
You are SliceMatic's in-app pizza recommendation assistant for a single outlet in Delhi.
Recommend exactly 3 different pizza + topping combinations the customer is likely to enjoy.
Hard rules:
- Only choose from the menu IDs provided. Never invent menu items.
- Return strict JSON only.
- Each recommendation must be a DIFFERENT pizza (no duplicates).
- If history exists, personalize using favourite pizza, topping, spend, veg/non-veg lean,
  spicy lean, quantity pattern, and recency.
- If the customer is new, use the popularity data provided — these are proven crowd-pleasers
  based on real order history from ALL customers.
- Vary the recommendations: one based on personal history (if returning), one based on
  global popularity, and one exploratory/different pick.
- Prefer combinations that improve customer fit and contribution margin without pushing
  unnecessary discounts.
- Keep each reason under 20 words, friendly, and without emojis.
```

### What the AI receives (user message payload)

```json
{
  "customer": {
    "name": "Aarav Sharma",
    "phone": "9876543210",
    "tier": "returning"           // or "new"
  },
  "customer_profile": {
    "orderCount": 3,
    "favouritePizzaId": 3,
    "favouritePizzaName": "Greek Mediterranean",
    "favouriteToppingId": 1,
    "favouriteToppingName": "Black Olives",
    "avgQuantity": 2.5,
    "avgSpend": 1842.29,
    "vegLean": 0.75,
    "spicyLean": 0.25,
    "lastOrderedAt": "2026-07-03T14:22:00Z"
  },
  "menu_signals": {
    "highMarginToppingIds": [
      {"id": 2, "name": "Extra Cheese", "price": 69},
      {"id": 6, "name": "Sun-Dried Tomatoes", "price": 59},
      {"id": 7, "name": "Caramelised Onions", "price": 55}
    ],
    "topPizzas": [
      {"id": 3, "name": "Greek Mediterranean", "totalOrdered": 11},
      {"id": 2, "name": "Chicago Deep Dish", "totalOrdered": 9},
      {"id": 1, "name": "Margherita", "totalOrdered": 8}
    ],
    "topToppings": [
      {"id": 1, "name": "Black Olives", "totalOrdered": 6},
      {"id": 2, "name": "Extra Cheese", "totalOrdered": 4}
    ],
    "safeDefaultPizzaId": 3
  },
  "menu": {
    "pizzas": [
      {"id": 1, "name": "Margherita", "tags": ["Veg","Cheese","Classic"], "price": 299},
      {"id": 2, "name": "Chicago Deep Dish", "tags": ["Veg","Cheese"], "price": 349},
      ...
    ],
    "toppings": [
      {"id": 1, "name": "Black Olives", "price": 39},
      {"id": 2, "name": "Extra Cheese", "price": 69},
      ...
    ]
  },
  "recent_history": [
    {
      "pizzaId": 3,
      "pizzaName": "Greek Mediterranean",
      "toppingIds": [1, 4],
      "toppingNames": ["Black Olives", "Green Peppers"],
      "quantity": 2,
      "orderedAt": "2026-07-03T14:22:00Z",
      "finalAmount": 1842.29
    }
  ],
  "output_schema": {
    "recommendations": "array of 3 objects, each with: pizza_id (number), topping_id (number), reason (string under 20 words), confidence (number 0..1)"
  }
}
```

### Expected AI output

```json
{
  "recommendations": [
    {
      "pizza_id": 3,
      "topping_id": 1,
      "reason": "Your go-to Greek Mediterranean with Black Olives — proven favourite.",
      "confidence": 0.93
    },
    {
      "pizza_id": 2,
      "topping_id": 2,
      "reason": "Chicago Deep Dish with Extra Cheese is a top seller this week.",
      "confidence": 0.85
    },
    {
      "pizza_id": 5,
      "topping_id": 6,
      "reason": "Try Farm House with Sun-Dried Tomatoes for a fresh change.",
      "confidence": 0.72
    }
  ]
}
```

---

## 4. Model Choice

| Setting | Value |
|---|---|
| Model ID | `openai/gpt-oss-20b` |
| Provider | OpenRouter (routes to OpenAI's GPT OSS 20B) |
| Temperature | `0.2` (low — consistent, repeatable picks) |
| Response format | `json_object` (structured output, no prose) |
| Env var override | `OPENROUTER_MODEL` in `.env` |

**Why this model:**
- Cost-effective for a structured JSON task (recommend from a fixed menu of ~8 pizzas and ~10 toppings)
- The task is constrained (pick valid IDs from a provided list) — doesn't need frontier reasoning
- Low temperature ensures consistency: same customer profile yields similar recommendations
- JSON mode avoids parsing issues from free-form text

---

## 5. Supabase Queries — What Data Feeds the AI

### 5a. Customer history lookup (`getCustomerHistory`)

Three sequential queries (avoiding nested joins for RLS compatibility):

```sql
-- Step 1: Find customer by phone
SELECT customer_id FROM slicematic.customer
WHERE mobile_number = $phone LIMIT 1;

-- Step 2: Get their last 8 orders
SELECT order_id, order_datetime, final_amount
FROM slicematic.orders
WHERE customer_id = $customerId
ORDER BY order_datetime DESC LIMIT 8;

-- Step 3a: Get order items
SELECT order_item_id, order_id, pizza_type_id, quantity
FROM slicematic.order_item
WHERE order_id IN ($orderIds);

-- Step 3b: Get toppings per item
SELECT order_item_id, topping_id
FROM slicematic.order_item_topping
WHERE order_item_id IN ($orderItemIds);
```

These are assembled into a `HistoryLine[]` array with: `pizzaId`, `pizzaName`, `toppingIds`, `toppingNames`, `quantity`, `orderedAt`, `finalAmount`.

### 5b. Global popularity (`getGlobalPopularity`)

```sql
-- All pizza orders across all customers
SELECT pizza_type_id, quantity FROM slicematic.order_item;

-- All topping usage across all customers
SELECT topping_id FROM slicematic.order_item_topping;
```

Aggregated in-memory to produce ranked `topPizzas` (by total quantity) and `topToppings` (by frequency), top 5 each.

### 5c. Recommendation event logging (`logRecommendation`)

```sql
INSERT INTO slicematic.recommendation_event (
  recommendation_id, customer_id, recommended_item_type,
  recommended_item_id, recommended_topping_id,
  recommendation_score, recommendation_timestamp, action_taken
) VALUES ($uuid, $customerId, 'PIZZA_TOPPING_COMBO',
  $pizzaId, $toppingId, $confidence, NOW(), 'Shown');
```

On purchase, updated by `saveOrder()` in `data-service.ts`:

```sql
UPDATE slicematic.recommendation_event
SET action_taken = 'Purchased'
WHERE recommendation_id = $recommendationId;
```

---

## 6. Customer Profile Computation

**File:** `recommend/route.ts` → `buildCustomerProfile()`

From the customer's last 8 orders, we compute:

| Signal | How computed | Purpose in AI prompt |
|---|---|---|
| `orderCount` | Count of history lines | Indicates engagement level |
| `favouritePizzaId` / `Name` | Pizza with highest total quantity | Personalisation anchor |
| `favouriteToppingId` / `Name` | Topping with highest total quantity | Personalisation anchor |
| `avgQuantity` | Total quantity / order count | Spending pattern |
| `avgSpend` | Total spend / order count | Price sensitivity signal |
| `vegLean` | Veg-tagged pizza qty / total qty (0.0–1.0) | Dietary preference |
| `spicyLean` | Spicy-tagged pizza qty / total qty (0.0–1.0) | Flavour preference |
| `lastOrderedAt` | Most recent order timestamp | Recency signal |

For **new customers** (no history), all fields are `null` / `0` — the AI relies on `topPizzas` and `topToppings` from global order data instead.

---

## 7. New vs Returning Customer Behaviour

### Returning customer (has order history)

```
customer.tier = "returning"
customer_profile = { orderCount: N, favouritePizzaId: X, vegLean: 0.8, ... }
recent_history = [ ... last 8 order lines ... ]
```

The AI personalises: favourite pizza first, global popular second, exploratory third.

### New customer (no history in DB)

```
customer.tier = "new"
customer_profile = { orderCount: 0, all nulls/zeros }
recent_history = []
menu_signals.topPizzas = [ ranked by real order volume from ALL customers ]
```

The system prompt instructs: *"If the customer is new, use the popularity data provided — these are proven crowd-pleasers based on real order history from ALL customers."*

The fallback (no OpenRouter) uses `getGlobalPopularity()` which queries actual `order_item` data:
- **#1 most ordered pizza** (currently: Greek Mediterranean, 11 orders)
- **#1 most ordered topping** (currently: Black Olives, 6 orders)

This replaces the previous hardcoded "Paneer Tikka + Extra Cheese" default.

---

## 8. Validation and Safety

| Check | Location | What happens on failure |
|---|---|---|
| `OPENROUTER_API_KEY` missing | `route.ts:49` | Returns data-driven fallback recommendations (no AI call) |
| OpenRouter returns non-200 | `route.ts:96` | Logs error, returns fallback |
| AI returns invalid JSON | `route.ts:103` catch | Returns fallback |
| `pizza_id` not in available menu | `route.ts:112` | That recommendation is skipped |
| `topping_id` not in available menu | `route.ts:113` | That recommendation is skipped |
| Duplicate pizza across recommendations | `route.ts:114` | Second instance skipped |
| All 3 picks fail validation | `route.ts:129` | Throws "Ungrounded recommendation" → fallback |
| Frontend can't reach `/api/recommend` | `SliceMaticStage3.tsx:446` | Shows "Browse our menu" with no specific pizza |
| Supabase unavailable | `getCustomerHistory` catch | Returns `[]` (treated as new customer) |
| Supabase unavailable for popularity | `getGlobalPopularity` catch | Falls back to `buildPopularityFromSeed()` |

---

## 9. Frontend Integration

### Trigger point

**File:** `SliceMaticStage3.tsx:420` — `submitCustomer()` function

```
Customer fills name + phone + address + delivery zone
  → clicks "Get AI recommendation" button
  → validateCustomer() runs (Stage 2 rules preserved)
  → if valid: step changes to "recommendation", POST /api/recommend fires
```

### Display

The recommendation screen (`step === "recommendation"`) shows:

- **Single recommendation:** heading = "Pizza Name + Topping Name", reason, confidence %, source tag
- **Multiple recommendations (3 picks):** heading = "3 picks for you", each rendered as a card with rank (#1, #2, #3), combo name, confidence, reason, and individual "Build this combo" button
- **Browse menu** button always available as alternative

### Actions

- **"Build this combo"** → opens the pizza builder with the recommended pizza pre-selected and the recommended topping pre-added
- **"Browse menu"** → navigates to the full menu grid (user ignores recommendation)

### Tab order in the UI

```
Menu | Recommendation | Checkout | Tracking | Customer Details
```

Recommendation sits between Menu and Checkout — shown **before** menu selection as the brief requires.

---

## 10. Recommendation Event Tracking (Closed-Loop)

### Schema: `slicematic.recommendation_event`

| Column | Type | Description |
|---|---|---|
| `recommendation_id` | `uuid` PK | Unique ID per recommendation shown |
| `customer_id` | `uuid` FK → customer | Links to the customer (null if new/unknown) |
| `recommended_item_type` | `text` | Always `"PIZZA_TOPPING_COMBO"` |
| `recommended_item_id` | `integer` FK → pizza_types | The pizza that was recommended |
| `recommended_topping_id` | `integer` FK → toppings | The topping that was recommended |
| `recommendation_score` | `numeric(5,4)` | AI confidence (0.00–1.00) |
| `recommendation_timestamp` | `timestamptz` | When the recommendation was shown |
| `action_taken` | `text` | `"Shown"` → updated to `"Purchased"` on order |
| `model_name` | `text` | Default `"openai/gpt-oss-20b"` |
| `prompt_version` | `text` | Default `"stage3-v1"` |

### Lifecycle

1. **Shown** — logged immediately when the recommendation is displayed
2. **Purchased** — `saveOrder()` in `data-service.ts` updates `action_taken` if the order includes the `recommendationId`

This enables future analysis: conversion rate, which recommendations lead to purchases, model accuracy over time.

---

## 11. Additional AI Features (Bonus Points)

Beyond Option A, we implement **3 more AI-powered endpoints** — all using the same OpenRouter infrastructure via the shared `callOpenRouterJson<T>()` utility in `lib/ai.ts`.

### 11a. AI Cart Strategist (`/api/ai/cart-insight`)

**Purpose:** In-cart upsell/reassurance suggestions while the customer is building their order.

**System prompt:**
```
You are SliceMatic's AI cart strategist.
Return strict JSON only.
Help the customer make a better pizza order while protecting outlet economics.
Use the current cart, menu, discount threshold, GST rules, and delivery context.
Do not invent menu items. Recommend only provided menu IDs.
Avoid pushy upsells; suggest one useful improvement or reassure the customer
if the cart is already strong.
Keep text concise and customer-facing.
```

**Input:** Current cart contents, pricing totals, discount threshold, full menu.
**Output:** `headline`, `message`, `nextAction`, optional `suggestedPizzaId`/`suggestedToppingId`, `expectedImpact`, `confidence`.

**UX value:** Nudges customers toward the quantity discount (5+ pizzas = 10% off) without being pushy. Shows in the sidebar cart panel.

### 11b. AI Ops Briefing (`/api/ai/ops-briefing`)

**Purpose:** Admin-facing shift briefing generated from order data.

**System prompt:**
```
You are SliceMatic's AI operations analyst for a single pizza outlet.
Return strict JSON only.
Use order summary, payment mix, hourly demand, forecast, top pizza, busiest hour,
and revenue to create a practical shift briefing.
Think like a QSR operator: staffing, prep batching, rider readiness, discount leakage,
top item availability, and peak-hour readiness.
Keep advice specific and executable.
```

**Input:** Full admin summary (revenue, order count, AOV, payment mix, busiest hour, forecast, top pizza).
**Output:** `briefing`, `staffing`, `prepList` (3 items), `revenueWatch`, `actions` (3 prioritized items).

**UX value:** Admin dashboard shows an AI-generated ops brief — practical shift guidance, not just raw numbers.

### 11c. AI Menu Copy Generator (`/api/ai/menu-copy`)

**Purpose:** Auto-generate customer-facing descriptions, badges, and tags when an admin adds a new menu item.

**System prompt:**
```
You are SliceMatic's menu engineering assistant for a single pizza outlet
in New Ashok Nagar, Delhi.
Return strict JSON only.
Create premium but concise customer-facing menu copy.
Keep claims realistic for delivery food.
```

**Input:** Item name, section (pizza/base/topping), price, optional seed tags.
**Output:** `description`, `badge`, `tags[]`, `prepMinutes`, `merchandisingNote`.

**UX value:** Admin types "Paneer Tikka" and gets instant marketing copy, category tags, and prep time estimates — no copywriting needed.

---

## 12. Shared AI Infrastructure

### `lib/ai.ts` — Reusable OpenRouter client

```typescript
callOpenRouterJson<T>({
  system: string,       // system prompt
  user: unknown,        // structured user message (auto-serialized to JSON)
  fallback: T,          // returned if API fails or key missing
  temperature?: number  // default 0.25
}): Promise<{ data: T; source: "openrouter" | "fallback" }>
```

Used by: cart-insight, ops-briefing, menu-copy.
The recommend route uses its own inline fetch (predates the shared utility) but follows the same pattern.

### Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `OPENROUTER_API_KEY` | Authentication for OpenRouter API | Required for AI features |
| `OPENROUTER_MODEL` | Model to use for all AI calls | `openai/gpt-oss-20b` |

---

## 13. Key Files Reference

| File | Purpose |
|---|---|
| `app/api/recommend/route.ts` | Primary recommendation API — orchestrates history, profile, popularity, OpenRouter call, validation, fallback, logging |
| `lib/ai.ts` | Shared `callOpenRouterJson<T>()` utility for all AI endpoints |
| `app/api/ai/cart-insight/route.ts` | AI cart strategist (in-cart suggestions) |
| `app/api/ai/ops-briefing/route.ts` | AI ops briefing for admin dashboard |
| `app/api/ai/menu-copy/route.ts` | AI menu copy generator for admin |
| `components/SliceMaticStage3.tsx` | Frontend — triggers recommendation, displays cards, handles actions |
| `lib/types.ts` | `Recommendation` type definition |
| `lib/data-service.ts` | `saveOrder()` updates recommendation event to "Purchased" |
| `lib/seed-data.ts` | Offline fallback data (3 seed orders) |
| `supabase/schema.sql` | `recommendation_event` table schema |
