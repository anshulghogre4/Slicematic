# Razorpay Payment Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add test-mode Razorpay online payment (Card/UPI) to the FullStack Next.js checkout, with server-side HMAC signature verification, persisting the order to Supabase only after the signature is verified; Cash path unchanged.

**Architecture:** A server-only `lib/razorpay.ts` (paise conversion, HMAC verify, Orders API call) backs two new Next.js route handlers — `POST /api/payments/create-order` (validates + recomputes the bill server-side, creates a Razorpay order) and `POST /api/payments/verify` (verifies signature + amount, then calls the existing `saveOrder`). The customer component opens Razorpay's `checkout.js` modal in-browser for Card/UPI and routes Cash through the existing `/api/orders` path.

**Tech Stack:** Next.js 14 (App Router) · TypeScript · Supabase JS · Razorpay Orders REST API + checkout.js · Vitest (new) · Node `crypto`.

## Global Constraints

- All work is in `FullStack/` (run commands from inside `FullStack/`). Do not touch the Gradio MVPs.
- Razorpay **test mode only** — `rzp_test_` keys; no real charges. Secret (`RAZORPAY_KEY_SECRET`) is server-only and must never be sent to the browser or logged.
- Card/UPI **require** real Razorpay keys; when keys are missing, `create-order` returns HTTP 503 with a friendly message (no simulated success).
- Order persists **only after** signature verified for Card/UPI; Cash persists immediately (unchanged).
- No unhandled exception may reach the customer — every route wrapped in try/catch returning a friendly `{ ok:false, errors }` body.
- Phone may be sent to Razorpay as `prefill.contact` but must not be rendered on bill/payment/receipt screens.
- Business rules stay in `lib/pricing.ts`: GST 18% after discount, 10% at qty ≥ 5, max qty, name/phone validation, payment ∈ {Cash,Card,UPI}. Amount is always recomputed server-side; never trust client amount as the charge basis.
- Money→paise: `Math.round(finalTotal * 100)`, minimum 100 paise enforced in the route.
- UI additions follow existing tokens (accent `#d33f2f`), real `<button>`s, `:focus-visible`, `aria-busy` on the in-flight button, `role="status"`/`aria-live="polite"` for payment status, `prefers-reduced-motion` respected.

---

### Task 1: Vitest harness + `toPaise`

**Files:**
- Modify: `FullStack/package.json` (add devDeps + scripts)
- Create: `FullStack/vitest.config.ts`
- Create: `FullStack/lib/razorpay.ts`
- Test: `FullStack/lib/razorpay.test.ts`

**Interfaces:**
- Produces: `toPaise(finalTotal: number): number`

- [ ] **Step 1: Add Vitest to package.json**

In `FullStack/package.json`, add to `scripts`:
```json
"test": "vitest run",
"test:watch": "vitest"
```
Add to `devDependencies`:
```json
"vitest": "^2.1.0"
```

- [ ] **Step 2: Create vitest config**

Create `FullStack/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "app/**/*.test.ts"]
  }
});
```

- [ ] **Step 3: Install**

Run (from `FullStack/`): `npm install`
Expected: vitest added to `node_modules`, no errors.

- [ ] **Step 4: Write the failing test**

Create `FullStack/lib/razorpay.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { toPaise } from "./razorpay";

describe("toPaise", () => {
  it("converts rupees to integer paise", () => {
    expect(toPaise(850.34)).toBe(85034);
    expect(toPaise(936.92)).toBe(93692);
    expect(toPaise(2529.68)).toBe(252968);
  });

  it("rounds half up and handles sub-rupee values", () => {
    expect(toPaise(0.5)).toBe(50);
    expect(toPaise(1)).toBe(100);
  });
});
```

- [ ] **Step 5: Run test, verify it fails**

Run (from `FullStack/`): `npm test -- lib/razorpay.test.ts`
Expected: FAIL — `toPaise` is not exported / module has no export.

- [ ] **Step 6: Implement `toPaise`**

Create `FullStack/lib/razorpay.ts`:
```ts
export function toPaise(finalTotal: number): number {
  return Math.round(finalTotal * 100);
}
```

- [ ] **Step 7: Run test, verify it passes**

Run: `npm test -- lib/razorpay.test.ts`
Expected: PASS (5 assertions).

- [ ] **Step 8: Commit**

```bash
git add FullStack/package.json FullStack/package-lock.json FullStack/vitest.config.ts FullStack/lib/razorpay.ts FullStack/lib/razorpay.test.ts
git commit -m "feat(payments): add vitest + toPaise rupee-to-paise conversion"
```

---

### Task 2: `verifySignature` + `hasRazorpayEnv`

**Files:**
- Modify: `FullStack/lib/razorpay.ts`
- Test: `FullStack/lib/razorpay.test.ts`

**Interfaces:**
- Consumes: `toPaise` (Task 1)
- Produces:
  - `verifySignature(orderId: string, paymentId: string, signature: string, secret?: string): boolean`
  - `hasRazorpayEnv(): boolean`

- [ ] **Step 1: Write the failing tests**

Append to `FullStack/lib/razorpay.test.ts`:
```ts
import crypto from "crypto";
import { verifySignature, hasRazorpayEnv } from "./razorpay";

describe("verifySignature", () => {
  const secret = "test_secret_key";
  const orderId = "order_TEST123";
  const paymentId = "pay_TEST456";
  const valid = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");

  it("accepts a correctly signed payment", () => {
    expect(verifySignature(orderId, paymentId, valid, secret)).toBe(true);
  });

  it("rejects a tampered signature", () => {
    const tampered = valid.slice(0, -1) + (valid.endsWith("a") ? "b" : "a");
    expect(verifySignature(orderId, paymentId, tampered, secret)).toBe(false);
  });

  it("rejects a length-mismatched signature without throwing", () => {
    expect(verifySignature(orderId, paymentId, "short", secret)).toBe(false);
  });

  it("rejects when no secret is available", () => {
    expect(verifySignature(orderId, paymentId, valid, "")).toBe(false);
  });
});

describe("hasRazorpayEnv", () => {
  it("is false when keys are unset", () => {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    expect(hasRazorpayEnv()).toBe(false);
  });

  it("is true when both keys are set", () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_x";
    process.env.RAZORPAY_KEY_SECRET = "secret_x";
    expect(hasRazorpayEnv()).toBe(true);
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test -- lib/razorpay.test.ts`
Expected: FAIL — `verifySignature` / `hasRazorpayEnv` not exported.

- [ ] **Step 3: Implement both functions**

Append to `FullStack/lib/razorpay.ts`:
```ts
import crypto from "crypto";

export function hasRazorpayEnv(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string = process.env.RAZORPAY_KEY_SECRET ?? ""
): boolean {
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const signatureBuf = Buffer.from(String(signature), "utf8");
  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}
```
Note: move the `import crypto from "crypto";` line to the top of the file with the other imports.

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm test -- lib/razorpay.test.ts`
Expected: PASS (all describe blocks green).

- [ ] **Step 5: Commit**

```bash
git add FullStack/lib/razorpay.ts FullStack/lib/razorpay.test.ts
git commit -m "feat(payments): add HMAC signature verification and env guard"
```

---

### Task 3: Types, schema columns, and `saveOrder` payment meta

**Files:**
- Modify: `FullStack/lib/types.ts`
- Modify: `FullStack/lib/data-service.ts:92-207` (`saveOrder`)
- Modify: `FullStack/supabase/schema.sql`

**Interfaces:**
- Produces:
  - `PaymentMeta` type: `{ razorpayOrderId?: string; razorpayPaymentId?: string; paymentStatus?: "paid" | "confirmed" | "failed" }`
  - `saveOrder(payload: OrderPayload, paymentMeta?: PaymentMeta): Promise<SavedOrder>`
  - `SavedOrder` gains optional `razorpayOrderId?`, `razorpayPaymentId?`, `paymentStatus?`

- [ ] **Step 1: Add types**

In `FullStack/lib/types.ts`, add after the `SavedOrder` type:
```ts
export type PaymentMeta = {
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paymentStatus?: "paid" | "confirmed" | "failed";
};
```
And add three optional fields to the `SavedOrder` type (alongside `status`):
```ts
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paymentStatus?: "paid" | "confirmed" | "failed";
```

- [ ] **Step 2: Thread `paymentMeta` through `saveOrder`**

In `FullStack/lib/data-service.ts`, change the signature and the in-memory object. Replace the function header line:
```ts
export async function saveOrder(payload: OrderPayload): Promise<SavedOrder> {
```
with:
```ts
export async function saveOrder(payload: OrderPayload, paymentMeta: PaymentMeta = {}): Promise<SavedOrder> {
```
Import `PaymentMeta` by adding it to the existing types import at the top of the file:
```ts
import { AdminSummary, CartLine, MenuItem, MenuPayload, OrderPayload, PaymentMeta, SavedOrder } from "./types";
```
In the `savedOrder` object literal (the `const savedOrder: SavedOrder = { ... }`), change `status: "Placed",` to also carry payment meta:
```ts
    status: "Placed",
    razorpayOrderId: paymentMeta.razorpayOrderId,
    razorpayPaymentId: paymentMeta.razorpayPaymentId,
    paymentStatus: paymentMeta.paymentStatus ?? "confirmed",
```

- [ ] **Step 3: Persist payment columns in the Supabase insert**

In the `supabase.schema("slicematic").from("orders").insert({ ... })` call inside `saveOrder`, add three fields (after `customer_note`):
```ts
      razorpay_order_id: paymentMeta.razorpayOrderId ?? null,
      razorpay_payment_id: paymentMeta.razorpayPaymentId ?? null,
      payment_status: paymentMeta.paymentStatus ?? "confirmed"
```

- [ ] **Step 4: Add schema columns**

Append to `FullStack/supabase/schema.sql` (after the `orders` table block, before the views):
```sql
alter table slicematic.orders add column if not exists razorpay_order_id text;
alter table slicematic.orders add column if not exists razorpay_payment_id text;
alter table slicematic.orders add column if not exists payment_status text not null default 'confirmed'
  check (payment_status in ('paid', 'confirmed', 'failed'));
create index if not exists idx_orders_razorpay_order_id on slicematic.orders(razorpay_order_id);
```

- [ ] **Step 5: Typecheck**

Run (from `FullStack/`): `npx tsc --noEmit`
Expected: no type errors.

- [ ] **Step 6: Commit**

```bash
git add FullStack/lib/types.ts FullStack/lib/data-service.ts FullStack/supabase/schema.sql
git commit -m "feat(payments): thread payment meta through saveOrder and schema"
```

---

### Task 4: `createRazorpayOrder` helper

**Files:**
- Modify: `FullStack/lib/razorpay.ts`

**Interfaces:**
- Consumes: env `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- Produces: `createRazorpayOrder(params: { amountPaise: number; receipt: string; notes?: Record<string, string> }): Promise<{ id: string }>`

> No unit test: this performs a live network call to Razorpay and is exercised in the Task 9 manual end-to-end. Keep it minimal.

- [ ] **Step 1: Implement the helper**

Append to `FullStack/lib/razorpay.ts`:
```ts
export async function createRazorpayOrder(params: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ id: string }> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("RAZORPAY_NOT_CONFIGURED");

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Basic ${auth}`
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: "INR",
      receipt: params.receipt,
      notes: params.notes ?? {}
    })
  });
  if (!response.ok) throw new Error("RAZORPAY_ORDER_FAILED");
  const data = (await response.json()) as { id?: string };
  if (!data.id) throw new Error("RAZORPAY_ORDER_FAILED");
  return { id: String(data.id) };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add FullStack/lib/razorpay.ts
git commit -m "feat(payments): add createRazorpayOrder Orders API helper"
```

---

### Task 5: `POST /api/payments/create-order`

**Files:**
- Create: `FullStack/app/api/payments/create-order/route.ts`
- Test: `FullStack/app/api/payments/create-order/route.test.ts`

**Interfaces:**
- Consumes: `hasRazorpayEnv`, `toPaise`, `createRazorpayOrder` (Tasks 1,2,4); `loadMenu` (data-service); `sanitizePricingConfig`, `validateCustomer`, `validateOrderLines`, `calculateBill` (pricing)
- Produces: JSON `{ ok: true, razorpayOrderId, amountPaise, keyId, prefillName, prefillPhone }` or `{ ok:false, errors }`

- [ ] **Step 1: Write the failing test (no-keys → 503)**

Create `FullStack/app/api/payments/create-order/route.test.ts`:
```ts
import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/payments/create-order", () => {
  beforeEach(() => {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
  });

  it("returns 503 when Razorpay keys are not configured", async () => {
    const request = new Request("http://localhost/api/payments/create-order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ customer: { name: "Aarav", phone: "9876543210" }, lines: [], paymentMode: "Card" })
    });
    const response = await POST(request);
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.errors.payment).toMatch(/not configured/i);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- app/api/payments/create-order/route.test.ts`
Expected: FAIL — `./route` has no `POST` export.

- [ ] **Step 3: Implement the route**

Create `FullStack/app/api/payments/create-order/route.ts`:
```ts
import { NextResponse } from "next/server";
import { loadMenu } from "../../../../lib/data-service";
import { calculateBill, sanitizePricingConfig, validateCustomer, validateOrderLines } from "../../../../lib/pricing";
import { createRazorpayOrder, hasRazorpayEnv, toPaise } from "../../../../lib/razorpay";
import { OrderPayload } from "../../../../lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!hasRazorpayEnv()) {
      return NextResponse.json(
        { ok: false, errors: { payment: "Online payment is not configured. Add Razorpay test keys to enable Card/UPI." } },
        { status: 503 }
      );
    }

    const payload = (await request.json()) as OrderPayload;
    const menu = await loadMenu();
    const pricingConfig = sanitizePricingConfig(payload.pricingConfig);

    const errors = validateCustomer(
      payload.customer?.name ?? "",
      payload.customer?.phone ?? "",
      payload.customer?.address ?? "",
      payload.customer?.deliveryZone,
      pricingConfig
    );
    if (Object.keys(errors).length) {
      return NextResponse.json({ ok: false, errors }, { status: 400 });
    }

    const lineErrors = validateOrderLines(payload.lines, menu, pricingConfig);
    if (Object.keys(lineErrors).length) {
      return NextResponse.json({ ok: false, errors: lineErrors }, { status: 400 });
    }

    if (!["Card", "UPI"].includes(payload.paymentMode)) {
      return NextResponse.json({ ok: false, errors: { payment: "Online payment supports Card or UPI only." } }, { status: 400 });
    }

    const totals = calculateBill(payload.lines, menu, pricingConfig);
    const amountPaise = toPaise(totals.finalTotal);
    if (amountPaise < 100) {
      return NextResponse.json({ ok: false, errors: { payment: "Order amount must be at least Rs. 1." } }, { status: 400 });
    }

    const razorpayOrder = await createRazorpayOrder({
      amountPaise,
      receipt: `sm_${payload.customer.phone}_${Date.now()}`.slice(0, 40),
      notes: { customer_name: payload.customer.name, phone: payload.customer.phone, payment_method: payload.paymentMode }
    });

    return NextResponse.json({
      ok: true,
      razorpayOrderId: razorpayOrder.id,
      amountPaise,
      keyId: process.env.RAZORPAY_KEY_ID,
      prefillName: payload.customer.name,
      prefillPhone: payload.customer.phone
    });
  } catch {
    return NextResponse.json({ ok: false, errors: { payment: "Could not start payment. Please retry." } }, { status: 502 });
  }
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test -- app/api/payments/create-order/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add FullStack/app/api/payments/create-order/route.ts FullStack/app/api/payments/create-order/route.test.ts
git commit -m "feat(payments): add create-order route with server-side bill recompute"
```

---

### Task 6: `POST /api/payments/verify`

**Files:**
- Create: `FullStack/app/api/payments/verify/route.ts`

**Interfaces:**
- Consumes: `verifySignature`, `toPaise` (Tasks 1,2); `loadMenu`, `saveOrder` (data-service); `sanitizePricingConfig`, `validateCustomer`, `validateOrderLines`, `calculateBill` (pricing); `PaymentMeta`, `OrderPayload` (types)
- Produces: JSON `{ ok: true, order: SavedOrder }` or `{ ok:false, errors }`

> No unit test: the happy path requires a valid live signature (covered in Task 9 manual e2e); the signature-rejection logic is already unit-tested in Task 2 via `verifySignature`.

- [ ] **Step 1: Implement the route**

Create `FullStack/app/api/payments/verify/route.ts`:
```ts
import { NextResponse } from "next/server";
import { loadMenu, saveOrder } from "../../../../lib/data-service";
import { calculateBill, sanitizePricingConfig, validateCustomer, validateOrderLines } from "../../../../lib/pricing";
import { toPaise, verifySignature } from "../../../../lib/razorpay";
import { OrderPayload } from "../../../../lib/types";

export const dynamic = "force-dynamic";

type VerifyBody = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  amountPaise: number;
  payload: OrderPayload;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyBody;

    if (!verifySignature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature)) {
      return NextResponse.json({ ok: false, errors: { payment: "Payment verification failed." } }, { status: 400 });
    }

    const menu = await loadMenu();
    const pricingConfig = sanitizePricingConfig(body.payload?.pricingConfig);

    const customerErrors = validateCustomer(
      body.payload.customer?.name ?? "",
      body.payload.customer?.phone ?? "",
      body.payload.customer?.address ?? "",
      body.payload.customer?.deliveryZone,
      pricingConfig
    );
    const lineErrors = validateOrderLines(body.payload.lines, menu, pricingConfig);
    if (Object.keys(customerErrors).length || Object.keys(lineErrors).length) {
      return NextResponse.json({ ok: false, errors: { ...customerErrors, ...lineErrors } }, { status: 400 });
    }

    const totals = calculateBill(body.payload.lines, menu, pricingConfig);
    if (toPaise(totals.finalTotal) !== Number(body.amountPaise)) {
      return NextResponse.json({ ok: false, errors: { payment: "Payment amount mismatch. Please retry." } }, { status: 400 });
    }

    const order = await saveOrder(
      { ...body.payload, pricingConfig },
      { razorpayOrderId: body.razorpay_order_id, razorpayPaymentId: body.razorpay_payment_id, paymentStatus: "paid" }
    );

    return NextResponse.json({ ok: true, order });
  } catch {
    return NextResponse.json({ ok: false, errors: { payment: "Could not confirm payment. Please retry." } }, { status: 500 });
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add FullStack/app/api/payments/verify/route.ts
git commit -m "feat(payments): add verify route (signature + amount, then saveOrder)"
```

---

### Task 7: Wire the checkout component (Cash vs Card/UPI)

**Files:**
- Modify: `FullStack/components/SliceMaticStage3.tsx` (state near line 122-124; `placeOrder` at 386-420; checkout UI at 1512-1531)

**Interfaces:**
- Consumes: `/api/payments/create-order`, `/api/payments/verify` (Tasks 5,6); existing `/api/orders` for Cash
- Produces: branching `placeOrder` + `loadRazorpayScript`, `placeOnlineOrder`, `verifyAndFinish` helpers + new UI state `placingOrder`, `paymentStatusMessage`

- [ ] **Step 1: Add UI state**

In `FullStack/components/SliceMaticStage3.tsx`, after the `const [paymentMode, ...]` line (~122), add:
```ts
  const [placingOrder, setPlacingOrder] = useState(false);
  const [paymentStatusMessage, setPaymentStatusMessage] = useState("");
```

- [ ] **Step 2: Add the Razorpay script loader**

Add this helper inside the component (next to `placeOrder`):
```ts
  function loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(new Error("no window"));
        return;
      }
      if ((window as unknown as { Razorpay?: unknown }).Razorpay) {
        resolve();
        return;
      }
      const existing = document.getElementById("razorpay-checkout-js");
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("load failed")));
        return;
      }
      const script = document.createElement("script");
      script.id = "razorpay-checkout-js";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("load failed"));
      document.body.appendChild(script);
    });
  }
```

- [ ] **Step 3: Split `placeOrder` into Cash and online paths**

Replace the existing `async function placeOrder() { ... }` (lines ~386-420) with:
```ts
  async function placeOrder() {
    if (!ensureCustomerReady()) return;
    if (!cart.length) {
      showToast("Add at least one pizza before checkout.");
      return;
    }
    if (!customerLoggedIn && !pricingConfig.guestCashAllowed && paymentMode === "Cash") {
      setPaymentMode("UPI");
      showToast("Guest checkout is online payment only. Sign in to use Cash.");
      return;
    }
    if (paymentMode === "Cash") {
      await placeCashOrder();
      return;
    }
    await placeOnlineOrder();
  }

  async function placeCashOrder() {
    setPlacingOrder(true);
    setPaymentStatusMessage("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customer,
          lines: cart,
          paymentMode,
          customerMode: customerLoggedIn ? "member" : "guest",
          customerAccountEmail: customerLoggedIn ? customerSessionEmail : null,
          pricingConfig,
          recommendationId: recommendation?.recommendationId ?? null
        })
      });
      const result = await response.json();
      if (!result.ok) {
        showToast(Object.values(result.errors ?? { server: "Could not place order." })[0] as string);
        return;
      }
      setLastOrder(result.order);
      setCart([]);
      setStep("tracking");
      refreshAdminSummary();
      showToast(paymentConfirmation(result.order.paymentMode));
    } catch {
      showToast("Could not place order. Please retry.");
    } finally {
      setPlacingOrder(false);
    }
  }

  async function placeOnlineOrder() {
    setPlacingOrder(true);
    setPaymentStatusMessage("");
    const orderPayload = {
      customer,
      lines: cart,
      paymentMode,
      customerMode: customerLoggedIn ? "member" : "guest",
      customerAccountEmail: customerLoggedIn ? customerSessionEmail : null,
      pricingConfig,
      recommendationId: recommendation?.recommendationId ?? null
    };
    try {
      const createRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(orderPayload)
      });
      const created = await createRes.json();
      if (!created.ok) {
        const message = Object.values(created.errors ?? { payment: "Could not start payment." })[0] as string;
        setPaymentStatusMessage(message);
        showToast(message);
        setPlacingOrder(false);
        return;
      }

      await loadRazorpayScript();
      const RazorpayCtor = (window as unknown as { Razorpay?: new (options: unknown) => { open: () => void; on: (event: string, handler: () => void) => void } }).Razorpay;
      if (!RazorpayCtor) {
        showToast("Payment module failed to load. Please retry.");
        setPlacingOrder(false);
        return;
      }

      const rzp = new RazorpayCtor({
        key: created.keyId,
        amount: String(created.amountPaise),
        currency: "INR",
        name: brand.name,
        description: "SliceMatic pizza order",
        order_id: created.razorpayOrderId,
        prefill: { name: created.prefillName, contact: created.prefillPhone },
        theme: { color: "#d33f2f" },
        handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          void verifyAndFinish(response, created.amountPaise, orderPayload);
        },
        modal: {
          ondismiss: () => {
            setPlacingOrder(false);
            setPaymentStatusMessage("Payment cancelled — no order was placed.");
          }
        }
      });
      rzp.on("payment.failed", () => {
        setPlacingOrder(false);
        setPaymentStatusMessage("Payment failed — no order was placed. You can retry.");
      });
      rzp.open();
    } catch {
      setPaymentStatusMessage("Could not start payment. Please retry.");
      showToast("Could not start payment. Please retry.");
      setPlacingOrder(false);
    }
  }

  async function verifyAndFinish(
    response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
    amountPaise: number,
    orderPayload: unknown
  ) {
    try {
      const verifyRes = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          amountPaise,
          payload: orderPayload
        })
      });
      const result = await verifyRes.json();
      if (!result.ok) {
        setPaymentStatusMessage(Object.values(result.errors ?? { payment: "Payment verification failed." })[0] as string);
        return;
      }
      setLastOrder(result.order);
      setCart([]);
      setStep("tracking");
      refreshAdminSummary();
      showToast(paymentConfirmation(result.order.paymentMode));
    } catch {
      setPaymentStatusMessage("Payment captured but confirmation failed. Please contact support with your payment id.");
    } finally {
      setPlacingOrder(false);
    }
  }
```

- [ ] **Step 4: Update the Place Order button + add a status region**

In the checkout payment card, replace the place-order button (line ~1530):
```tsx
              <button className="primary" disabled={!cart.length} onClick={placeOrder} type="button"><Send /> Place order</button>
```
with:
```tsx
              <button className="primary" disabled={!cart.length || placingOrder} aria-busy={placingOrder} onClick={placeOrder} type="button">
                <Send /> {placingOrder ? "Processing payment…" : paymentMode === "Cash" ? "Place order" : "Pay & place order"}
              </button>
              {paymentStatusMessage && <p className="payment-status" role="status" aria-live="polite">{paymentStatusMessage}</p>}
```

- [ ] **Step 5: Add a minimal style for the status line**

Append to `FullStack/app/globals.css`:
```css
.payment-status {
  margin-top: 12px;
  font-size: 14px;
  color: #b42318;
}
```

- [ ] **Step 6: Typecheck + build**

Run (from `FullStack/`): `npx tsc --noEmit && npm run build`
Expected: typecheck clean; `next build` succeeds.

- [ ] **Step 7: Commit**

```bash
git add FullStack/components/SliceMaticStage3.tsx FullStack/app/globals.css
git commit -m "feat(payments): route Card/UPI through Razorpay checkout, keep Cash direct"
```

---

### Task 8: Environment + README docs

**Files:**
- Modify: `FullStack/.env.example`
- Modify: `FullStack/README.md`

- [ ] **Step 1: Add env keys to `.env.example`**

Append to `FullStack/.env.example`:
```bash
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
```

- [ ] **Step 2: Document the payment flow in README**

Add a "Payments (Razorpay test mode)" section to `FullStack/README.md` covering: server-only keys, Card/UPI use checkout.js + server HMAC verify, Cash is direct COD, order saved only after verify, and the test credentials — test card `4111 1111 1111 1111` (any CVV, any future expiry) and test UPI `success@razorpay`.

- [ ] **Step 3: Commit**

```bash
git add FullStack/.env.example FullStack/README.md
git commit -m "docs(payments): document Razorpay test-mode setup and credentials"
```

---

### Task 9: Verification — manual e2e + design/guidelines pass

**Files:** none (verification only)

- [ ] **Step 1: Full test + build gate**

Run (from `FullStack/`): `npm test && npx tsc --noEmit && npm run build`
Expected: all unit tests pass; typecheck clean; build succeeds.

- [ ] **Step 2: Manual end-to-end with test keys**

Set `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` in `FullStack/.env.local`, run `npm run dev`, then:
- Member login → Cash order → confirms immediately, lands on tracking (no Razorpay modal).
- Guest → Card → Razorpay modal opens → test card `4111 1111 1111 1111` → mock bank **Success** → order appears on tracking with the final bill; admin orders list shows it.
- Repeat with UPI `success@razorpay`.
- Mock bank **Failure** / close modal → "Payment cancelled/failed — no order was placed."; verify no new order in the admin list.
- Unset keys, retry Card → friendly "Online payment is not configured" message, no dead button.

- [ ] **Step 3: Web Interface Guidelines pass**

Run `/web-design-guidelines` against the changed files (`components/SliceMaticStage3.tsx`, `app/globals.css`); fix any High-severity findings on the new checkout UI (focus states, `aria-live`, labels).

- [ ] **Step 4: Design review pass**

Run `/interface-design:design-review` against the running checkout step; address any Blocker findings on the new payment UI while staying consistent with the existing app tokens.

- [ ] **Step 5: Final commit (if fixes were applied)**

```bash
git add -A
git commit -m "chore(payments): address guideline and design-review findings"
```

---

## Self-Review

**Spec coverage:** lib/razorpay.ts (T1,T2,T4) · create-order (T5) · verify (T6) · save-after-verify (T6→saveOrder T3) · schema columns (T3) · component wiring + Cash split (T7) · guest/member + payment-mode rules (T5,T7) · no-keys 503 (T5) · env/README (T8) · TDD on pure units (T1,T2) · Vitest harness (T1) · web-guidelines + design-review (T9). All spec sections mapped.

**Placeholder scan:** no TBD/TODO; every code step shows complete code; README step (T8 S2) describes exact content to include.

**Type consistency:** `toPaise`, `verifySignature`, `hasRazorpayEnv`, `createRazorpayOrder`, `PaymentMeta`, `saveOrder(payload, paymentMeta)` names are identical across producing and consuming tasks; `amountPaise` and the `payload` envelope match between T7 (client) and T6 (verify route).
