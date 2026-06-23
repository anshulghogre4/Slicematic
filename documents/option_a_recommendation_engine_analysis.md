# Option A — AI Recommendation Engine: Thorough Analysis & Build Plan

> **Project:** SliceMatic / PizzaFlow · FDE Academy Batch 2487 · Stage 3 (Full-Stack, 50 pts)
> **Feature:** Option A — AI Recommendation Engine (worth 12 pts of the AI-feature rubric)
> **Stack:** FastAPI (Python) backend · Supabase (Postgres) · OpenRouter LLM · frontend = Gradio **or** React/Next.js
> **Date:** 2026-06-23
> **Status:** Research + architecture. Not yet implemented.

---

## 0. The Requirement (verbatim from the brief)

> **Option A — AI Recommendation Engine**
> After the customer enters their name and phone number, query Supabase for their past orders. Send the order history to an LLM via OpenRouter and ask it to recommend a pizza + topping combination with a short explanation. Show this as a personalised suggestion before the menu selection step. Document your system prompt and the model you chose.

**Five non-negotiables decoded from that paragraph:**

| # | Requirement | Where it lands in our build |
|---|---|---|
| 1 | Trigger **after** name+phone, **before** menu selection | A new step in the order flow, between intake and menu |
| 2 | Query **Supabase** for **that customer's** past orders | Lookup keyed on phone → `customer` → `orders` → `order_item` → `order_item_topping` |
| 3 | Send history to an **LLM via OpenRouter** | FastAPI calls OpenRouter; never call the model from the browser (key leak) |
| 4 | Recommend a **pizza + topping combo** + a **short explanation** | Structured JSON out: `{pizza, topping, reason}` |
| 5 | **Document** the system prompt + model chosen | Goes in `README.md` (rubric explicitly checks this) |

**Grading (Stage 3 → "AI feature" = 12 pts):** *"OpenRouter integrated, system prompt documented in README, feature adds real value to UX."* Two-thirds of the marks are documentation + genuine UX value, not just a working API call. The "real value to UX" bar is why this doc pushes a *grounded, explainable, cold-start-safe* design rather than a toy prompt.

**Ownership rule:** *"No two teams may submit the same AI feature implementation. First team to commit a feature on GitHub owns it."* → commit a skeleton of this early to claim Option A.

---

## 1. What the Web/Industry Does (research synthesis)

I researched LLM-based recommenders, classic food/restaurant recommender repos, cold-start handling, OpenRouter model/JSON capabilities, and anti-hallucination prompting. Condensed findings:

### 1.1 Modern LLM recommender architecture
The dominant production pattern is **not** "dump everything into a chat prompt." It is a **multi-stage pipeline** where the LLM sits at the *ranking/explanation* stage on top of a cheaper candidate generator:

1. **Candidate generation** — narrow the full catalog to a handful of plausible items (popularity, similarity, or the customer's own history).
2. **History retrieval / memory** — filter to the *most relevant* past behaviour instead of sending the entire history (context-window discipline).
3. **Prompt assembly** — system prompt (rules) + structured user profile/history + the candidate list.
4. **LLM ranking + explanation** — the model picks from candidates and writes the human-friendly "why."
5. **Feedback logging** — record what was shown vs. what was chosen, to measure and improve.

For our scale (single outlet, small menu: 5 bases × 8 pizzas × 10 toppings), we can **collapse stages 1–2** — the catalog is tiny enough to hand the LLM the whole menu plus a compact history summary. But we keep the *shape* (ground the model in real data, log the outcome) because that's what earns "real UX value."

Sources: [Aman's AI Journal — RecSys/LLM](https://aman.ai/recsys/LLM/) · [Building RecSys with GenAI on AWS (Caylent)](https://caylent.com/blog/building-recommendation-systems-using-genai-and-amazon-personalize) · [Memory-Assisted LLM for Personalized Recommendation (arXiv)](https://arxiv.org/html/2505.03824) · [Rethinking LLM Architectures for RecSys (Medium)](https://medium.com/@web2avi/rethinking-llm-architectures-for-recommendation-system-10b9fea36b88)

### 1.2 Classic food/restaurant recommender repos (for feature ideas)
These are pre-LLM ML systems, but they tell us **which signals matter** and **how they handle cold start**:

| Repo | Approach | What we borrow |
|---|---|---|
| [zyna-b/Food-Recommendation-System](https://github.com/zyna-b/Food-Recommendation-System) | Hybrid: collaborative (SVD) + content-based (TF-IDF) on Food.com | Hybrid mindset; content features from item attributes |
| [prateekmaj21/Restaurant-Recommendation-System](https://github.com/prateekmaj21/Restaurant-Recommendation-System) | Content + collaborative + hybrid; cosine similarity, SVD | Item-attribute similarity as a fallback signal |
| [poolkit/Hybrid-Restaurant-Recommender](https://github.com/poolkit/Hybrid-Restaurant-Recommender) | Feature extraction + TF-IDF over descriptions/facilities | Engineering item features from text |
| [sha-ddie/Restaurant-Recommender-System](https://github.com/sha-ddie/Restaurant-Recommender-System) | Hybrid + DNN, **explicit cold-start fallback to content-based** | Our cold-start strategy (below) |
| [amolratnaparkhe/Foodfinder](https://github.com/amolratnaparkhe/Foodfinder-Recommendation-System) | Multi-user + knowledge-based, cold-start aware | Group/knowledge fallback idea |

**Takeaway:** every serious system has an explicit **cold-start path**. New users (no history) get **content-based or popularity-based** recommendations, not a crash or a blank.

Sources: [food-delivery GitHub topic](https://github.com/topics/food-delivery?l=python) · [Food Recommender Systems survey (arXiv)](https://arxiv.org/pdf/1711.02760)

### 1.3 Cold-start problem (directly relevant — most demo customers will be new)
The brief's grader will likely test a **first-time phone number** (no orders). Industry handles this by:
- Falling back to **most-popular items** (we have `daily_sales_fact` and can aggregate `order_item`).
- Using **content-based** similarity from any signal we do have (city, a single prior view).
- A **knowledge-based** default ("our bestseller") when there is literally nothing.

Sources: [Cold-start comparative review (ScienceDirect)](https://www.sciencedirect.com/science/article/abs/pii/S0306437914001525) · [Solving the cold-start problem (Tredence)](https://www.tredence.com/blog/solving-the-cold-start-problem-in-collaborative-recommender-systems) · [Cold-start practitioner's guide (Medium)](https://medium.com/data-scientists-handbook/cracking-the-cold-start-problem-in-recommender-systems-a-practitioners-guide-069bfda2b800)

### 1.4 Grounding & anti-hallucination (critical — the LLM must not invent menu items)
The menu is swapped by the grader and lives in the DB. If the LLM recommends "Truffle Mushroom Supreme" and that's not on our menu, the feature breaks. Research consensus:
1. **Instruct explicitly:** "ONLY recommend from this list. Do not invent items."
2. **Reference by ID/index**, not free text — model returns `pizza_type_id`, we look up the name.
3. **Low temperature** for determinism.
4. **Post-generation validation** — reject/repair any ID not in the menu we sent. *Prompt instructions alone are not enough; validation is what guarantees grounding.*

Sources: [Controlling LLM hallucinations (Parasoft)](https://www.parasoft.com/blog/controlling-llm-hallucinations-application-level-best-practices/) · [Grounding LLM outputs with structured data (APIClaw)](https://apiclaw.io/en/blog/grounding-llm-outputs-with-structured-real-time-data) · [7 prompt tricks to mitigate hallucination (MLMastery)](https://machinelearningmastery.com/7-prompt-engineering-tricks-to-mitigate-hallucinations-in-llms/)

### 1.5 OpenRouter model & JSON capability
- OpenRouter supports **structured outputs** via `response_format: { type: "json_schema", ... }` on compatible models — responses conform to a JSON Schema and are reliably parseable. ([OpenRouter structured outputs docs](https://openrouter.ai/docs/guides/features/structured-outputs))
- For **cheap + fast structured JSON**, strong 2026 picks: `openai/gpt-oss-20b` (low-latency, native structured output), `google/gemma` family (efficient MoE, structured output), Llama 4 Scout for raw latency. Free tier exists but has **strict daily rate limits + peak-hour latency** — fine for a demo, risky as a hard dependency. ([Free models](https://openrouter.ai/models) · [Best free models 2026 (TeamDay)](https://www.teamday.ai/blog/best-free-ai-models-openrouter-2026))
- Caveat: open models sometimes wrap JSON in prose. **Always validate/parse defensively.** ([Instructor + OpenRouter guide](https://python.useinstructor.com/integrations/openrouter/))

**Model decision for us (documented in README):** default **`openai/gpt-oss-20b`** (or `meta-llama/llama-3.3-70b-instruct` if we want stronger reasoning) — cheap, fast, supports structured output, good enough for a 3-field recommendation. We pin one model in an env var so the demo is reproducible. Rationale to write in README: *low latency for a pre-menu step, native JSON schema support for grounding, low cost per call.*

---

## 2. Our Data — What We Already Have vs. What We Should Save

This is the heart of your question: **what do we save / what could we save in the DB for recommendations.**

### 2.1 Existing schema (from `db/transactions.sql` + `db/master schema & data_entry.sql`)

**Catalog (master, seeded):**
- `slicematic.pizza_bases(base_id, base_name, price)` — 5 rows
- `slicematic.pizza_types(pizza_type_id, pizza_name, price)` — 8 rows
- `slicematic.toppings(topping_id, topping_name, price)` — 10 rows

**Transactional / behavioural (already designed — and notably recsys-aware):**

| Table | Key columns | Role in recommendations |
|---|---|---|
| `customer` | `customer_id`, `mobile_number`, `city`, `birth_date`, `gender` | **Lookup by phone.** Demographics enable content/segment fallback for cold start |
| `orders` | `order_id`, `customer_id`, `order_datetime`, `final_amount`, `payment_method`, `city` | Order history spine; recency, frequency, spend, time-of-day |
| `order_item` | `order_id`, `pizza_type_id`, `base_id`, `quantity` | **What pizzas/bases** the customer actually bought + how often |
| `order_item_topping` | `order_item_id`, `topping_id` | **What toppings** — the attach-rate / pairing signal |
| `customer_activity` | `activity_type` (View/Search/Add/Remove/Purchase), `item_id`, `item_type` | Pre-purchase intent (clickstream). Strong recsys signal if we populate it |
| `customer_preference` | `preferred_base_id`, `preferred_pizza_type_id`, `preferred_topping_id`, `preference_score` | **Pre-computed taste profile** — a fast serving layer (optional for us) |
| `recommendation_event` | `recommended_item_type/id`, `recommendation_score`, `action_taken` (Shown/Clicked/Purchased/Ignored) | **Feedback loop** — log every recommendation + outcome. *This is our "real UX value" + measurability proof* |
| `daily_sales_fact` | `sales_date`, `pizza_type_id`, `total_orders`, `total_quantity`, `revenue` | Popularity aggregates → **cold-start fallback** + admin dashboard |

**Verdict:** our schema is *already* purpose-built for a recommendation engine — `customer_activity`, `customer_preference`, and `recommendation_event` are exactly the three tables a textbook recsys uses (training signal, serving layer, feedback loop). We don't need new tables for a solid Option A. We mainly need to **populate and read** them.

> ⚠️ **Known schema bug to fix first (from project memory):** FKs in `db/transactions.sql` reference `customer(customer_id)` etc. without the `slicematic.` prefix — set `search_path = slicematic` or qualify them, or table creation fails.

### 2.2 What we MUST save for Option A (minimum to satisfy the brief)
The brief only strictly needs **past orders** queryable by phone. That's `customer` + `orders` + `order_item` + `order_item_topping`. If those persist correctly from the normal order flow, the recommendation has data to read.

### 2.3 What we SHOULD save (turns a toy into "real UX value" → more of the 12 pts)
1. **`recommendation_event` on every suggestion** — log `recommended_item_id`, `recommendation_score`, `recommendation_timestamp`, and update `action_taken` when the customer accepts/ignores. This gives us a **CTR / conversion metric** we can show on the admin dashboard and discuss in the demo. Cheap to add, high marginal credit.
2. **`customer_activity` rows** — at minimum log a `Purchase` activity per order; ideally `View`/`Add_To_Cart` from the UI. Even just purchases enrich the history we feed the LLM.

### 2.4 What we COULD save (nice-to-have, only if time allows)
- **`customer_preference` refresh** — a small job/SQL that recomputes top base/pizza/topping per customer after each order. Lets us inject a clean "taste profile" line into the prompt without recomputing on the fly. Optional; the LLM can infer preferences from raw history too.
- **Recommendation context snapshot** — store the exact prompt inputs (or a hash) alongside `recommendation_event` for reproducibility/debugging. Optional.

### 2.5 What we should NOT bother saving
- Embeddings / vector store — overkill for a 23-item menu.
- Full LLM raw responses in the DB long-term — log transiently or to app logs, not a core table.

---

## 3. Features to Feed the Model (the "what features for predictions" question)

We are **not training an ML model** (that's Option C). For Option A the "features" = the **context we put in the prompt**. From our data, the high-value signals:

### 3.1 Per-customer behavioural features (from `orders` / `order_item` / `order_item_topping`)
| Feature | How to compute | Why it helps the recommendation |
|---|---|---|
| **Most-ordered pizza(s)** | `COUNT`/`SUM(quantity)` grouped by `pizza_type_id` | Core taste signal |
| **Most-ordered base** | same on `base_id` | Crust preference |
| **Most-ordered topping(s)** | join `order_item_topping`, count by `topping_id` | Topping affinity / pairing |
| **Recency** | `MAX(order_datetime)` | "Welcome back" framing; avoid recommending the exact last order again |
| **Frequency / order count** | `COUNT(orders)` | Loyalty tier; distinguishes new-ish vs. regular |
| **Avg order value / spend tier** | `AVG(final_amount)` | Premium vs. value steer (e.g. Cheese Burst vs. Thin Crust) |
| **Veg/non-veg lean** | infer from pizza names ordered | Avoid recommending non-veg to an all-veg customer |
| **Last payment method** | `orders.payment_method` | Minor personalization / continuity |

### 3.2 Contextual features (cheap, no history needed)
| Feature | Source | Use |
|---|---|---|
| **Time of day / day of week** | request timestamp | "Late-night cheesy comfort pick" vs. lunch |
| **City** | `customer.city` | Regional default |
| **Current popular items** | `daily_sales_fact` / aggregate `order_item` | Cold-start + social proof ("our bestseller") |

### 3.3 Cold-start tiers (decide which prompt path to take)
```
Has >= 2 past orders        → full personalization (behavioural features)
Has exactly 1 past order     → light personalization + popularity blend
Has 0 orders (new customer)  → popularity / bestseller fallback, demographic hint if present
```
We compute the tier in FastAPI and pick the prompt template accordingly. This is the single most important robustness decision — **most demo customers will be new.**

### 3.4 What we send to the LLM (compact, grounded)
- The **full menu** (IDs + names + prices for bases, pizzas, toppings) — so it can only pick real items, referenced by ID.
- A **compact history summary** (the features above as a short JSON), **not** raw order rows — saves tokens, improves focus.
- The **cold-start tier** so the model knows whether to personalize or default.

---

## 4. Target Architecture (frontend-agnostic)

The recommendation logic lives entirely in **FastAPI**. The frontend (Gradio **or** React/Next.js) only calls one endpoint and renders the result. This keeps us free to use either frontend — the brief recommends React/Next on Vercel for Stage 3, while Gradio is our Stage 2 MVP. **Same backend serves both.**

```
                         ┌─────────────────────────────────────────────┐
                         │                FRONTEND                      │
                         │   Gradio (Stage 2)  OR  React/Next (Stage 3) │
                         │                                              │
                         │  1. Collect name + phone                     │
                         │  6. Render suggestion card  ──► menu step    │
                         └───────────────┬──────────────▲───────────────┘
                                         │ POST /recommend (name, phone) │ {pizza, topping, reason, score}
                                         ▼                              │
                         ┌──────────────────────────────────────────────┐
                         │                 FASTAPI BACKEND               │
                         │                                               │
                         │  2. Look up customer by phone (Supabase)      │
                         │  3. Build features + decide cold-start tier   │
                         │  4. Assemble prompt (menu + history summary)  │
                         │     → call OpenRouter (structured JSON)       │
                         │  5. Validate IDs against menu (anti-halluc.)  │
                         │  7. Log recommendation_event (Shown)          │
                         └───────┬───────────────────────────┬───────────┘
                                 │                           │
                                 ▼                           ▼
                     ┌────────────────────┐      ┌────────────────────────┐
                     │   SUPABASE (PG)    │      │   OPENROUTER (LLM)      │
                     │  customer, orders, │      │  model pinned via env   │
                     │  order_item(_topp),│      │  response_format=json   │
                     │  recommendation_*  │      └────────────────────────┘
                     └────────────────────┘
```

**Why the LLM call is server-side only:** the OpenRouter API key must never reach the browser. React/Gradio call *our* FastAPI, FastAPI calls OpenRouter. (Same security posture as our Razorpay integration — see [razorpay_integration_analysis.md](razorpay_integration_analysis.md).)

---

## 5. End-to-End Steps (mapped to requirements)

| Step | Action | Satisfies |
|---|---|---|
| 1 | Customer enters **name + phone** (validated: 10 digits, starts 6–9) | brief trigger point + Stage 2 validation rules |
| 2 | FastAPI looks up `customer` by `mobile_number`; pulls `orders`→`order_item`→`order_item_topping` | "query Supabase for their past orders" |
| 3 | Compute behavioural features + **cold-start tier** (§3) | robustness / real UX value |
| 4 | Assemble prompt: system rules + menu (from DB) + history summary; call **OpenRouter** with `response_format=json_schema`, low temp | "send order history to an LLM via OpenRouter" |
| 5 | Parse JSON → **validate** `pizza_type_id` & `topping_id` exist in current menu; if invalid or LLM fails → **fallback** to popularity pick | anti-hallucination; never crash |
| 6 | Return `{pizza_name, topping_name, reason, score}`; frontend shows a **suggestion card before menu selection** | "show as personalised suggestion before menu selection step" |
| 7 | Insert `recommendation_event` (`action_taken='Shown'`); update to `Purchased`/`Ignored` later | feedback loop / measurable value |
| 8 | Document system prompt + model + rationale in **README.md** | explicit rubric line |

---

## 6. System Prompt (draft — to be finalized + copied into README)

```
You are SliceMatic's in-app pizza recommendation assistant for a single outlet in Delhi.

GOAL: Recommend exactly ONE pizza + ONE topping the customer is likely to enjoy,
with a short, warm, one-sentence reason.

HARD RULES:
- You may ONLY choose from the MENU provided below. Never invent items.
- Refer to items by their numeric id. We will look up the names.
- If the customer has order history, personalize to it (favourite pizza, base,
  toppings, veg/non-veg lean, spend level).
- If the customer is NEW (no history), recommend a popular crowd-pleaser and say so
  honestly ("a customer favourite to get started").
- Keep the reason under 20 words, friendly, no emojis, no pricing claims.
- Output MUST match the JSON schema exactly. No prose outside the JSON.

MENU:
  Pizzas: {pizza_list_with_ids}
  Bases:  {base_list_with_ids}
  Toppings: {topping_list_with_ids}

CUSTOMER CONTEXT:
  Tier: {new | returning}
  History summary: {compact_json_of_features}    # empty for new customers
  Time: {time_of_day}, City: {city}
```

**Structured output schema** (sent as `response_format`):
```json
{
  "type": "json_schema",
  "json_schema": {
    "name": "pizza_recommendation",
    "strict": true,
    "schema": {
      "type": "object",
      "properties": {
        "pizza_type_id": { "type": "integer" },
        "topping_id":    { "type": "integer" },
        "reason":        { "type": "string", "maxLength": 140 },
        "confidence":    { "type": "number", "minimum": 0, "maximum": 1 }
      },
      "required": ["pizza_type_id", "topping_id", "reason"],
      "additionalProperties": false
    }
  }
}
```

---

## 7. Backend Sketch (FastAPI — illustrative, not final)

```python
# POST /recommend  { "name": str, "phone": str }  -> RecommendationOut
import os, json, httpx
from decimal import Decimal

OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-oss-20b")
OPENROUTER_KEY   = os.getenv("OPENROUTER_API_KEY")  # .env only, never in repo

async def recommend(name: str, phone: str, supabase) -> dict:
    customer = supabase.lookup_customer_by_phone(phone)          # may be None
    history  = supabase.order_history(customer) if customer else []
    features = build_features(history)                            # §3
    tier     = "returning" if len(history) >= 1 else "new"
    menu     = supabase.load_menu()                              # ids+names+prices

    try:
        rec = await call_openrouter(menu, features, tier)        # structured JSON
        rec = validate_against_menu(rec, menu)                   # §1.4 anti-halluc.
    except Exception:
        rec = popularity_fallback(menu, supabase)                # §1.3 cold start

    supabase.log_recommendation_event(customer, rec, action="Shown")
    return {
        "pizza":  menu.pizza_name(rec["pizza_type_id"]),
        "topping": menu.topping_name(rec["topping_id"]),
        "reason": rec["reason"],
        "score":  rec.get("confidence", 0.0),
    }
```

Frontend contract (identical for Gradio and React): `POST /recommend` → render a card, then proceed to the existing menu step.

---

## 8. Frontend Notes (Gradio vs React/Next — keep both viable)

- **Logic is identical** for both; only the rendering differs.
- **Gradio (Stage 2 MVP / fast path):** add a step in the `gr.Blocks` flow; show the suggestion in a `gr.HTML`/card before the menu radio/dropdown. Cannot deploy on Vercel (needs persistent Python server) — host on HuggingFace Spaces / Railway if used for the live demo.
- **React/Next (Stage 3, brief-recommended, Vercel):** fetch `/recommend` after the intake form, render a suggestion card component, then route to menu selection. FastAPI backend deploys separately (Railway/Render/Fly.io). This is the path that scores the Vercel-frontend rubric points.
- **Recommendation:** build the FastAPI `/recommend` endpoint once; wire Gradio first (reuse Stage 2), then React for the graded Stage 3 deployment. No backend rewrite.

---

## 9. Demo-Readiness Checklist (graders can ask anyone to explain/modify)

- [ ] Can explain **why** each prompt rule exists (esp. "only from menu" + ID-based output).
- [ ] Can show the **cold-start fallback** working with a brand-new phone number.
- [ ] Can **modify live** — e.g. change the model env var, or change "1 topping" to "2 toppings" in schema+prompt.
- [ ] Can justify the **`recommendation_event` schema** and show a CTR/conversion query.
- [ ] README has **system prompt + model + rationale** (rubric line).
- [ ] OpenRouter key in **`.env` only**; backend-side call only.
- [ ] Validation rejects an invented item id (can demo by forcing a bad id).

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| LLM invents a menu item | ID-based output + post-validation + fallback (§1.4) |
| New customer / empty history | Cold-start tiers + popularity fallback (§1.3, §3.3) |
| OpenRouter free-tier rate limit / latency mid-demo | Pin a paid-but-cheap model; add a deterministic fallback; cache last good rec |
| JSON wrapped in prose by open model | `response_format=json_schema` + tolerant parser that extracts the JSON block |
| Menu swapped by grader | Menu loaded from DB at request time, never hardcoded; IDs validated dynamically |
| Schema FK bug blocks setup | Fix `slicematic.` prefix / `search_path` before Stage 3 build |
| Key leak | Server-side only; `.env`; never in frontend bundle |

---

## 11. Open Decisions (need team input)

1. **Model:** `openai/gpt-oss-20b` (cheap/fast) vs. `meta-llama/llama-3.3-70b-instruct` (stronger reasoning). Recommend starting cheap, upgrade only if quality is poor.
2. **Recommend 1 topping or a small combo?** Brief says "a pizza + topping combination" → one of each is compliant and simplest. Keep to one unless we want flair.
3. **Populate `customer_activity`?** Minimum = log purchases. Full clickstream is nice but optional.
4. **Refresh `customer_preference`?** Optional serving-layer optimization; skip for v1.
5. **Which frontend gets it first?** Recommend Gradio for speed, then React for the graded Vercel deploy.

---

## 12. Sources

- [Aman's AI Journal — Recommendation Systems / LLM](https://aman.ai/recsys/LLM/)
- [Building Recommendation Systems Using GenAI on AWS (Caylent)](https://caylent.com/blog/building-recommendation-systems-using-genai-and-amazon-personalize)
- [Memory-Assisted LLM for Personalized Recommendation (arXiv)](https://arxiv.org/html/2505.03824)
- [Rethinking LLM Architectures for RecSys (Medium)](https://medium.com/@web2avi/rethinking-llm-architectures-for-recommendation-system-10b9fea36b88)
- [zyna-b/Food-Recommendation-System (GitHub)](https://github.com/zyna-b/Food-Recommendation-System)
- [prateekmaj21/Restaurant-Recommendation-System (GitHub)](https://github.com/prateekmaj21/Restaurant-Recommendation-System)
- [poolkit/Hybrid-Restaurant-Recommender (GitHub)](https://github.com/poolkit/Hybrid-Restaurant-Recommender)
- [sha-ddie/Restaurant-Recommender-System (GitHub)](https://github.com/sha-ddie/Restaurant-Recommender-System)
- [amolratnaparkhe/Foodfinder-Recommendation-System (GitHub)](https://github.com/amolratnaparkhe/Foodfinder-Recommendation-System)
- [Food Recommender Systems survey (arXiv)](https://arxiv.org/pdf/1711.02760)
- [Cold-start comparative review (ScienceDirect)](https://www.sciencedirect.com/science/article/abs/pii/S0306437914001525)
- [Solving the cold-start problem (Tredence)](https://www.tredence.com/blog/solving-the-cold-start-problem-in-collaborative-recommender-systems)
- [Cracking the cold-start problem — practitioner's guide (Medium)](https://medium.com/data-scientists-handbook/cracking-the-cold-start-problem-in-recommender-systems-a-practitioners-guide-069bfda2b800)
- [Controlling LLM hallucinations (Parasoft)](https://www.parasoft.com/blog/controlling-llm-hallucinations-application-level-best-practices/)
- [Grounding LLM outputs with structured data (APIClaw)](https://apiclaw.io/en/blog/grounding-llm-outputs-with-structured-real-time-data)
- [7 prompt tricks to mitigate hallucination (MLMastery)](https://machinelearningmastery.com/7-prompt-engineering-tricks-to-mitigate-hallucinations-in-llms/)
- [OpenRouter — Structured Outputs docs](https://openrouter.ai/docs/guides/features/structured-outputs)
- [OpenRouter — Models](https://openrouter.ai/models)
- [Best Free Models on OpenRouter 2026 (TeamDay)](https://www.teamday.ai/blog/best-free-ai-models-openrouter-2026)
- [Structured outputs with OpenRouter + Instructor](https://python.useinstructor.com/integrations/openrouter/)
