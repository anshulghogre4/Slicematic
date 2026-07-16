# Feature: AI Recommendation Engine

## Overview
The AI Recommendation Engine in SliceMatic provides personalized pizza and topping combination suggestions to customers. It operates via the `/api/recommend` endpoint and leverages an LLM (via OpenRouter) to deliver three distinct, tailored recommendations per user.

## Core Implementation Details

### 1. API Route (`app/api/recommend/route.ts`)
The main entry point for recommendations. It handles data gathering, LLM communication, and deterministic fallbacks.

**Key Steps:**
- **Data Fetching:** Retrieves the customer's past 8 orders from Supabase (or seed data).
- **Customer Profiling:** `buildCustomerProfile()` processes history to determine metrics like:
  - Total order count and average spend.
  - Favourite pizza and topping.
  - `vegLean` and `spicyLean` (ratios of vegetarian or spicy pizzas ordered).
- **Global Popularity:** `getGlobalPopularity()` calculates the most ordered pizzas and toppings across the entire platform.
- **LLM Call:** Sends a comprehensive context object (customer profile, menu signals, popularity, and recent history) to OpenRouter.

### 2. Prompting Strategy (`lib/recommendation-prompt.ts`)
The system prompt strictly enforces the AI's behavior:
- Recommend exactly 3 different pizza + topping combinations.
- No duplicate pizzas.
- Use only valid `pizza_id` and `topping_id` from the menu.
- **Variation Strategy:**
  1. Personal favourite (based on history).
  2. Global popularity (proven crowd-pleaser).
  3. Exploratory pick (something new).

### 3. Fallback Mechanism
If the LLM fails, times out, or if the API key is missing, `buildFallbackRecommendations()` provides a robust deterministic fallback:
- **First Pick:** The user's favourite (if returning) or the platform's most popular.
- **Second Pick:** The platform's second most popular.
- **Third Pick:** An exploratory pick (a different, un-recommended pizza).

### 4. Logging and Analytics
Each recommendation is assigned a unique `recommendationId` (UUID) and logged to the `recommendation_event` table in Supabase. This tracks which items were recommended, the confidence score, and the action taken (e.g., "Shown"), which is crucial for A/B testing and performance monitoring.

## Possible Interview Questions & Talking Points

- **How do you handle LLM hallucinations?**
  *We enforce strict JSON output and validate that the `pizza_id` and `topping_id` returned by the LLM exist and are `available` in our database. If invalid, the item is dropped or the fallback is used.*
- **What happens if the third-party AI API goes down?**
  *The system gracefully degrades to `buildFallbackRecommendations()`, a deterministic algorithm that uses local database statistics (popularity and personal history) to generate the same output schema.*
- **How is the prompt structured for personalization?**
  *We inject a calculated `customer_profile` (veg/spicy preferences, average spend) directly into the prompt context, allowing the LLM to understand the user's taste without needing to process raw order logs itself.*
