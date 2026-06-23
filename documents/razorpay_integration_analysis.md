# Razorpay Payment Integration Analysis — SliceMatic

> **Stack:** FastAPI (Python) backend · Gradio (Python) frontend · Supabase PostgreSQL  
> **Mode:** Test / Sandbox (no real transactions)  
> **Payment Methods:** Cash (COD), Card, UPI  
> **Date:** 2026-06-23

### ⚠️ Frontend Deployment Note

The assignment brief **mandates** a frontend deployed on Vercel with a public URL live on July 2. Gradio **cannot** run on Vercel (it requires a persistent Python server with WebSocket support; Vercel is serverless). Two paths forward:

1. **Use Next.js or React on Vercel** (recommended) — build the customer-facing ordering UI as a React app deployed on Vercel. The FastAPI backend (with Razorpay integration, pricing logic, Supabase writes) stays as a separate Python service deployed on Railway/Render/Fly.io (free tier). Razorpay's `checkout.js` integrates natively into React — no separate HTML page needed.

2. **Keep Gradio only** — deploy on HuggingFace Spaces or Railway. This satisfies functionality but **does not satisfy the Vercel requirement** and will cost marks on the "Vercel frontend — live" rubric component (10 pts).

The Razorpay integration logic in this document (FastAPI endpoints, signature verification, Supabase updates) applies identically regardless of whether the frontend is React or Gradio. Only the checkout trigger changes: React calls `new Razorpay(options).open()` directly in the browser; Gradio needs the separate HTML checkout page approach described in Section 6.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Razorpay Account & Credentials](#2-razorpay-account--credentials)
3. [Python SDK Setup](#3-python-sdk-setup)
4. [Payment Flow — End to End](#4-payment-flow--end-to-end)
5. [FastAPI Endpoints](#5-fastapi-endpoints)
6. [Gradio Frontend Integration](#6-gradio-frontend-integration)
7. [Amount Calculation (SliceMatic Pricing → Paise)](#7-amount-calculation-slicematic-pricing--paise)
8. [Payment Method Handling](#8-payment-method-handling)
9. [Signature Verification (HMAC-SHA256)](#9-signature-verification-hmac-sha256)
10. [Database Updates (Supabase)](#10-database-updates-supabase)
11. [Test Mode — Cards, UPI, Wallets](#11-test-mode--cards-upi-wallets)
12. [Error Handling & Edge Cases](#12-error-handling--edge-cases)
13. [Environment Variables & Security](#13-environment-variables--security)
14. [Complete Code Reference](#14-complete-code-reference)
15. [Razorpay Integration Prompt (Reference)](#15-razorpay-integration-prompt-reference)

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Gradio)                         │
│                                                                  │
│  Cart UI → "Pay Now" button → opens Razorpay Checkout modal      │
│  (For Card/UPI only; Cash orders skip payment gateway)           │
└──────────────────────┬───────────────────────────────────────────┘
                       │  1. POST /api/orders/create
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI)                             │
│                                                                  │
│  /api/orders/create  → Razorpay Order API → returns order_id     │
│  /api/payments/verify → HMAC-SHA256 check → updates DB           │
│  /api/orders/cod     → direct DB insert (no Razorpay)            │
└──────────────────────┬───────────────────────────────────────────┘
                       │
          ┌────────────┼────────────────┐
          ▼            ▼                ▼
┌─────────────┐  ┌──────────┐  ┌──────────────────┐
│  Razorpay   │  │ Supabase │  │ Razorpay Orders  │
│  Orders API │  │ Postgres │  │  Dashboard       │
└─────────────┘  └──────────┘  └──────────────────┘
```

### Flow Summary

| Step | Actor | Action |
|------|-------|--------|
| 1 | Customer | Fills cart, selects payment method, clicks "Place Order" |
| 2 | Gradio | If Cash → calls `/api/orders/cod`. If Card/UPI → calls `/api/orders/create` |
| 3 | FastAPI | Creates Razorpay order via SDK, returns `order_id` + `amount` + `key_id` |
| 4 | Gradio | Opens Razorpay Checkout modal (embedded JS or redirect page) |
| 5 | Customer | Completes payment on Razorpay's hosted page |
| 6 | Razorpay | Returns `payment_id`, `order_id`, `signature` to frontend handler |
| 7 | Gradio | POSTs these to `/api/payments/verify` |
| 8 | FastAPI | Verifies HMAC signature, updates order status in Supabase |
| 9 | Customer | Sees "Order Confirmed" screen |

---

## 2. Razorpay Account & Credentials

### Test Mode Credentials

```
RAZORPAY_KEY_ID=<your_razorpay_test_key_id>
RAZORPAY_KEY_SECRET=<your_razorpay_test_key_secret>
```

### Important Notes

- **Test mode** — no real money is charged; all transactions are simulated
- Test credentials start with `rzp_test_` (live starts with `rzp_live_`)
- The Key ID is public (sent to frontend); the Key Secret is **server-only**
- Dashboard: https://dashboard.razorpay.com (switch to "Test Mode" toggle)
- Webhooks can be configured for async notifications (optional for MVP)

---

## 3. Python SDK Setup

### Installation

```bash
pip install razorpay
```

### Client Initialization (FastAPI)

```python
import razorpay
import os

razorpay_client = razorpay.Client(
    auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET"))
)
```

### Dependencies (requirements.txt additions)

```
razorpay>=1.4.2
fastapi>=0.100.0
uvicorn>=0.23.0
python-dotenv>=1.0.0
supabase>=2.0.0
```

---

## 4. Payment Flow — End to End

### 4.1 Order Creation (Server-Side)

The customer's cart total is converted to **paise** and sent to Razorpay's Orders API:

```python
order_data = {
    "amount": 85034,          # ₹850.34 → 85034 paise
    "currency": "INR",
    "receipt": "order_rcpt_001",
    "notes": {
        "customer_name": "Anshul",
        "phone": "9876543210"
    }
}
razorpay_order = razorpay_client.order.create(data=order_data)
# Returns: { "id": "order_DBJOWzybf0sJbb", "amount": 85034, "status": "created", ... }
```

### 4.2 Checkout (Client-Side)

Razorpay's checkout.js opens a modal where the customer enters card/UPI details:

```javascript
var options = {
    "key": "<RAZORPAY_KEY_ID>",         // Key ID (public)
    "amount": "85034",                   // in paise
    "currency": "INR",
    "name": "SliceMatic",
    "description": "Pizza Order #001",
    "order_id": "order_DBJOWzybf0sJbb", // from step 4.1
    "handler": function (response) {
        // response.razorpay_payment_id
        // response.razorpay_order_id
        // response.razorpay_signature
        // → POST these to /api/payments/verify
    },
    "prefill": {
        "name": "Anshul",
        "contact": "9876543210"
    },
    "theme": { "color": "#e63946" }
};
var rzp = new Razorpay(options);
rzp.open();
```

### 4.3 Payment Verification (Server-Side)

```python
import hmac
import hashlib

def verify_payment_signature(order_id: str, payment_id: str, signature: str, secret: str) -> bool:
    message = f"{order_id}|{payment_id}"
    generated = hmac.new(
        secret.encode(), message.encode(), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(generated, signature)
```

---

## 5. FastAPI Endpoints

### 5.1 Create Order (for Card/UPI)

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from decimal import Decimal, ROUND_HALF_UP
import razorpay
import os

app = FastAPI()

razorpay_client = razorpay.Client(
    auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET"))
)

class OrderCreateRequest(BaseModel):
    customer_name: str
    phone: str
    cart_items: list[dict]       # [{pizza_id, base_id, toppings: [], qty}]
    payment_method: str          # "Card" or "UPI"
    final_total: str             # Decimal as string, e.g. "850.34"

class OrderCreateResponse(BaseModel):
    razorpay_order_id: str
    amount_paise: int
    key_id: str
    customer_name: str
    phone: str

@app.post("/api/orders/create", response_model=OrderCreateResponse)
async def create_order(req: OrderCreateRequest):
    # Convert final_total (INR) to paise
    final_total = Decimal(req.final_total)
    amount_paise = int((final_total * 100).to_integral_value(rounding=ROUND_HALF_UP))

    if amount_paise < 100:
        raise HTTPException(status_code=400, detail="Minimum order amount is ₹1.00")

    # Create Razorpay order
    order_data = {
        "amount": amount_paise,
        "currency": "INR",
        "receipt": f"slicematic_{req.phone}_{int(time.time())}",
        "notes": {
            "customer_name": req.customer_name,
            "phone": req.phone,
            "payment_method": req.payment_method,
        }
    }

    try:
        razorpay_order = razorpay_client.order.create(data=order_data)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Razorpay order creation failed: {str(e)}")

    # Store pending order in Supabase (status = "created")
    # ... (see Section 10 for DB logic)

    return OrderCreateResponse(
        razorpay_order_id=razorpay_order["id"],
        amount_paise=amount_paise,
        key_id=os.getenv("RAZORPAY_KEY_ID"),
        customer_name=req.customer_name,
        phone=req.phone,
    )
```

### 5.2 Verify Payment

```python
import hmac
import hashlib

class PaymentVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class PaymentVerifyResponse(BaseModel):
    status: str                  # "success" or "failed"
    order_id: int                # internal SliceMatic order ID
    message: str

@app.post("/api/payments/verify", response_model=PaymentVerifyResponse)
async def verify_payment(req: PaymentVerifyRequest):
    secret = os.getenv("RAZORPAY_KEY_SECRET")

    # Generate expected signature
    message = f"{req.razorpay_order_id}|{req.razorpay_payment_id}"
    expected_signature = hmac.new(
        secret.encode(), message.encode(), hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, req.razorpay_signature):
        # Update order status to "failed" in Supabase
        raise HTTPException(status_code=400, detail="Payment verification failed")

    # Signature valid — update order status to "paid" in Supabase
    # Store razorpay_payment_id for reference
    # ... (see Section 10)

    return PaymentVerifyResponse(
        status="success",
        order_id=internal_order_id,
        message="Payment verified successfully"
    )
```

### 5.3 Cash on Delivery (COD) — No Razorpay

```python
class CODOrderRequest(BaseModel):
    customer_name: str
    phone: str
    cart_items: list[dict]
    final_total: str

@app.post("/api/orders/cod")
async def create_cod_order(req: CODOrderRequest):
    # Directly insert into Supabase with status = "confirmed", payment_method = "Cash"
    # No Razorpay interaction needed
    # ... (see Section 10)

    return {"status": "success", "order_id": internal_order_id, "payment_method": "Cash"}
```

---

## 6. Gradio Frontend Integration

### Challenge: Gradio + Razorpay Checkout

Gradio runs as a Python process and renders its own UI. It does **not** natively support injecting arbitrary JavaScript (like Razorpay's `checkout.js`). 

### Solution Approaches (Ranked)

#### Approach A: Dedicated Payment HTML Page (Recommended)

Serve a lightweight HTML page from FastAPI that contains the Razorpay checkout script. Gradio redirects the user to this page after cart confirmation.

```
Gradio "Place Order" → FastAPI creates Razorpay order →
FastAPI returns a URL like /checkout/{order_id} →
Gradio opens this URL in a new tab (or iframe) →
User completes payment on that page →
Page POSTs verification to FastAPI →
FastAPI updates DB → redirects to /order-success/{order_id} →
Gradio polls for order status update
```

**FastAPI payment page endpoint:**

```python
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

templates = Jinja2Templates(directory="templates")

@app.get("/checkout/{razorpay_order_id}", response_class=HTMLResponse)
async def checkout_page(razorpay_order_id: str):
    # Fetch order details from Supabase
    order = get_order_by_razorpay_id(razorpay_order_id)

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>SliceMatic Payment</title>
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    </head>
    <body>
        <h2>Completing your SliceMatic order...</h2>
        <p>Amount: ₹{order['amount_paise'] / 100:.2f}</p>
        <script>
            var options = {{
                "key": "{os.getenv('RAZORPAY_KEY_ID')}",
                "amount": "{order['amount_paise']}",
                "currency": "INR",
                "name": "SliceMatic",
                "description": "Pizza Order",
                "order_id": "{razorpay_order_id}",
                "handler": function(response) {{
                    fetch('/api/payments/verify', {{
                        method: 'POST',
                        headers: {{'Content-Type': 'application/json'}},
                        body: JSON.stringify({{
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        }})
                    }})
                    .then(r => r.json())
                    .then(data => {{
                        if (data.status === 'success') {{
                            window.location.href = '/order-success/' + data.order_id;
                        }} else {{
                            document.body.innerHTML = '<h2>Payment Failed</h2><p>Please try again.</p>';
                        }}
                    }});
                }},
                "prefill": {{
                    "name": "{order['customer_name']}",
                    "contact": "{order['phone']}"
                }},
                "theme": {{ "color": "#e63946" }},
                "modal": {{ "ondismiss": function() {{
                    document.body.innerHTML = '<h2>Payment Cancelled</h2><p><a href="/">Return to menu</a></p>';
                }} }}
            }};
            var rzp = new Razorpay(options);
            rzp.open();
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)
```

**Gradio side — opening payment page:**

```python
import webbrowser
import gradio as gr

def handle_place_order(customer_name, phone, cart, payment_method):
    if payment_method == "Cash":
        # Direct COD API call
        response = requests.post(f"{API_BASE}/api/orders/cod", json={...})
        return "Order placed! Pay on delivery."

    # Card or UPI → create Razorpay order
    response = requests.post(f"{API_BASE}/api/orders/create", json={
        "customer_name": customer_name,
        "phone": phone,
        "cart_items": cart,
        "payment_method": payment_method,
        "final_total": str(final_total),
    })
    data = response.json()

    # Return payment URL for user to open
    payment_url = f"{API_BASE}/checkout/{data['razorpay_order_id']}"
    return f"Complete payment here: [Pay Now]({payment_url})"
```

#### Approach B: Gradio `gr.HTML` Component with Embedded JS

Use Gradio's `gr.HTML()` to inject the Razorpay script directly into the Gradio interface. Less clean but avoids tab switching.

```python
def get_payment_html(order_id, amount_paise, key_id, name, phone):
    return f"""
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    <script>
    var options = {{
        "key": "{key_id}",
        "amount": "{amount_paise}",
        "currency": "INR",
        "name": "SliceMatic",
        "order_id": "{order_id}",
        "handler": function(response) {{
            // Use Gradio's internal API or hidden textbox to pass data back
            document.querySelector('#verify_data textarea').value =
                JSON.stringify(response);
            document.querySelector('#verify_data textarea').dispatchEvent(
                new Event('input', {{ bubbles: true }})
            );
        }},
        "prefill": {{ "name": "{name}", "contact": "{phone}" }},
        "theme": {{ "color": "#e63946" }}
    }};
    var rzp = new Razorpay(options);
    rzp.open();
    </script>
    """
```

> **Recommendation:** Use **Approach A** (dedicated HTML page). It's cleaner, more reliable across Gradio versions, and separates concerns properly. The checkout page is a single lightweight HTML file served by FastAPI.

---

## 7. Amount Calculation (SliceMatic Pricing → Paise)

### SliceMatic Pricing Formula (from PRD)

```python
from decimal import Decimal, ROUND_HALF_UP

GST_RATE = Decimal("0.18")
DISCOUNT_RATE = Decimal("0.10")
DISCOUNT_MIN_QTY = 5

def calculate_order_total(items: list[dict]) -> dict:
    """
    Each item: {base_price, pizza_price, topping_prices: [], qty}
    Returns: {subtotal, discount, taxable, gst, final_total, amount_paise}
    """
    subtotal = Decimal("0")

    for item in items:
        unit_price = (
            Decimal(str(item["base_price"])) +
            Decimal(str(item["pizza_price"])) +
            sum(Decimal(str(tp)) for tp in item["topping_prices"])
        )
        item_subtotal = unit_price * item["qty"]
        subtotal += item_subtotal

    # Discount: 10% if total qty across all items >= 5
    total_qty = sum(item["qty"] for item in items)
    if total_qty >= DISCOUNT_MIN_QTY:
        discount = subtotal * DISCOUNT_RATE
    else:
        discount = Decimal("0")

    # GST on post-discount amount
    taxable = subtotal - discount
    gst = taxable * GST_RATE

    # Final total
    final_total = taxable + gst

    # Round only at the end for display and payment
    final_total_rounded = final_total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    # Convert to paise (Razorpay requires integer paise)
    amount_paise = int((final_total_rounded * 100).to_integral_value(rounding=ROUND_HALF_UP))

    return {
        "subtotal": subtotal,
        "discount": discount,
        "taxable": taxable,
        "gst": gst,
        "final_total": final_total_rounded,
        "amount_paise": amount_paise,
    }
```

### Key Rules for Paise Conversion

| Rule | Detail |
|------|--------|
| 1 INR = 100 paise | ₹850.34 → 85034 paise |
| Minimum amount | 100 paise (₹1.00) — Razorpay rejects anything below |
| Integer only | Razorpay `amount` field must be an integer (no decimals) |
| Round at the end | Use `Decimal` throughout; only convert to int at the final step |
| `ROUND_HALF_UP` | Consistent with SliceMatic PRD rounding rules |

### Example Calculations

```
Example 1: Single pizza, no discount
  Base (Thin Crust): ₹99
  Pizza (Margherita): ₹249
  Topping (Extra Cheese): ₹49
  Qty: 2
  Unit price = 99 + 249 + 49 = ₹397
  Subtotal = 397 × 2 = ₹794
  Discount = ₹0 (qty < 5)
  GST = 794 × 0.18 = ₹142.92
  Final = 794 + 142.92 = ₹936.92
  Paise = 93692

Example 2: Bulk order with discount
  2 items, total qty = 6 (≥ 5 → 10% discount)
  Subtotal = ₹2,382
  Discount = 2382 × 0.10 = ₹238.20
  Taxable = 2382 - 238.20 = ₹2,143.80
  GST = 2143.80 × 0.18 = ₹385.88
  Final = 2143.80 + 385.88 = ₹2,529.68
  Paise = 252968
```

---

## 8. Payment Method Handling

### 8.1 Cash on Delivery (COD)

- **No Razorpay interaction** — order goes directly to Supabase
- Status: `confirmed` immediately (payment collected at door)
- FastAPI endpoint: `POST /api/orders/cod`
- Gradio: Show "Order confirmed! Pay ₹{amount} on delivery."

### 8.2 Card Payment

- Uses Razorpay Checkout — customer enters card details on Razorpay's modal
- Razorpay handles PCI compliance (card data never touches our server)
- Test mode: uses mock bank page with Success/Failure buttons
- Flow: Create order → Open checkout → Select "Card" → Enter test card → Mock bank → Success handler

### 8.3 UPI Payment

- Also uses Razorpay Checkout — customer enters UPI ID or scans QR
- In **test mode**: UPI flow shows a simulated success/failure (same mock page)
- Test UPI ID: `success@razorpay` (auto-succeeds in test mode)
- Flow: Create order → Open checkout → Select "UPI" → Enter UPI ID → Mock → Success handler

### Payment Method Routing Logic

```python
def route_payment(payment_method: str, order_data: dict):
    """Called from Gradio after user clicks Place Order"""
    if payment_method == "Cash":
        return create_cod_order(order_data)
    elif payment_method in ("Card", "UPI"):
        return create_razorpay_order(order_data)
    else:
        raise ValueError(f"Invalid payment method: {payment_method}")
```

> **Note:** From Razorpay's perspective, Card and UPI use the same order creation flow. The customer chooses Card vs UPI inside the Razorpay checkout modal. We don't need separate endpoints — just one `/api/orders/create`. The `payment_method` is stored for our records.

---

## 9. Signature Verification (HMAC-SHA256)

### Why Verify?

The signature proves that the payment response came from Razorpay (not spoofed by a malicious client).

### Verification Algorithm

```
generated_signature = HMAC-SHA256(order_id + "|" + payment_id, key_secret)
```

### Python Implementation

```python
import hmac
import hashlib

def verify_razorpay_signature(
    order_id: str,
    payment_id: str,
    signature: str,
    secret: str
) -> bool:
    """
    Verify Razorpay payment signature using HMAC-SHA256.
    
    Args:
        order_id: razorpay_order_id (e.g., "order_DBJOWzybf0sJbb")
        payment_id: razorpay_payment_id (e.g., "pay_FgR7UMfMi7pXNA")
        signature: razorpay_signature from checkout response
        secret: RAZORPAY_KEY_SECRET (server-side only)
    
    Returns:
        True if signature is valid, False otherwise
    """
    message = f"{order_id}|{payment_id}"
    expected = hmac.new(
        key=secret.encode("utf-8"),
        msg=message.encode("utf-8"),
        digestmod=hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

### Alternative: Using Razorpay SDK Utility

```python
# The SDK also provides a built-in verify method:
try:
    razorpay_client.utility.verify_payment_signature({
        "razorpay_order_id": order_id,
        "razorpay_payment_id": payment_id,
        "razorpay_signature": signature,
    })
    # Signature valid
except razorpay.errors.SignatureVerificationError:
    # Signature invalid — reject payment
    pass
```

---

## 10. Database Updates (Supabase)

### Order Lifecycle in Database

```
┌──────────┐     ┌──────────┐     ┌───────────┐
│ created  │────▶│  paid    │────▶│ confirmed │
└──────────┘     └──────────┘     └───────────┘
     │                                   ▲
     │ (COD)                             │
     └───────────────────────────────────┘
     │
     ▼
┌──────────┐
│  failed  │  (signature mismatch or timeout)
└──────────┘
```

### Supabase Integration (Python)

```python
from supabase import create_client
import os

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

# Create order (pending payment)
def insert_order(customer_id, cart_items, final_total, payment_method, razorpay_order_id=None):
    order = supabase.table("orders").insert({
        "customer_id": customer_id,
        "order_total": float(final_total),
        "payment_mode": payment_method,
        "payment_status": "created" if payment_method != "Cash" else "confirmed",
        "razorpay_order_id": razorpay_order_id,
        "order_date": "now()",
    }).execute()

    order_id = order.data[0]["order_id"]

    # Insert order items
    for item in cart_items:
        supabase.table("order_item").insert({
            "order_id": order_id,
            "pizza_type_id": item["pizza_id"],
            "base_id": item["base_id"],
            "quantity": item["qty"],
            "unit_price": float(item["unit_price"]),
        }).execute()

    return order_id

# Update after successful payment
def mark_order_paid(razorpay_order_id, razorpay_payment_id):
    supabase.table("orders").update({
        "payment_status": "paid",
        "razorpay_payment_id": razorpay_payment_id,
    }).eq("razorpay_order_id", razorpay_order_id).execute()

# Update after failed payment
def mark_order_failed(razorpay_order_id, reason="signature_mismatch"):
    supabase.table("orders").update({
        "payment_status": "failed",
        "failure_reason": reason,
    }).eq("razorpay_order_id", razorpay_order_id).execute()
```

### Schema Addition (to existing `orders` table)

```sql
-- Add payment columns to the existing orders table
ALTER TABLE slicematic.orders
ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'created'
    CHECK (payment_status IN ('created', 'paid', 'confirmed', 'failed')),
ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- Index for fast lookup during verification
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id
ON slicematic.orders(razorpay_order_id);
```

---

## 11. Test Mode — Cards, UPI, Wallets

### Test Card Numbers

| Card Network | Number | CVV | Expiry |
|---|---|---|---|
| Visa (Success) | 4111 1111 1111 1111 | Any 3 digits | Any future date |
| Mastercard (Success) | 5267 3181 8797 5449 | Any 3 digits | Any future date |
| Visa (Failure) | Use any card and click "Failure" on mock bank page | — | — |

### Test Mode Behavior

- After entering card details, Razorpay shows a **mock bank page**
- The page has two buttons: **Success** and **Failure**
- Clicking "Success" → payment succeeds → handler fires with payment_id + signature
- Clicking "Failure" → payment fails → `on_payment_failed` event fires
- **No real OTP** is sent; no real bank is contacted
- Any CVV (3 digits) and any future expiry date works

### Test UPI

| Scenario | Test UPI ID |
|---|---|
| Success | `success@razorpay` |
| Failure | `failure@razorpay` |

### Test Wallet / Netbanking

- Same mock success/failure page for all methods
- No actual wallet or bank login required in test mode

### How to Verify Test Transactions

1. Go to https://dashboard.razorpay.com → switch to **Test Mode**
2. Navigate to Transactions → Payments
3. All test payments will appear with `rzp_test_` prefix
4. You can also check Orders → see status (`paid`, `attempted`, `created`)

---

## 12. Error Handling & Edge Cases

### Payment Failures

| Scenario | How to Handle |
|---|---|
| User closes checkout modal | `modal.ondismiss` callback → show "Payment cancelled" |
| Card declined | Razorpay shows error in modal → user can retry |
| Network timeout | Razorpay retries internally; if persistent → show retry button |
| Signature mismatch | Reject payment, mark order as "failed", log for investigation |
| Duplicate payment | Razorpay prevents duplicate charges per order_id |
| Amount < ₹1 | Reject at our endpoint before calling Razorpay |

### FastAPI Error Responses

```python
from fastapi import HTTPException

# Amount validation
if amount_paise < 100:
    raise HTTPException(400, "Order amount must be at least ₹1.00")

# Razorpay API failure
try:
    order = razorpay_client.order.create(data=order_data)
except razorpay.errors.BadRequestError as e:
    raise HTTPException(400, f"Invalid order data: {e}")
except razorpay.errors.ServerError:
    raise HTTPException(502, "Razorpay service unavailable, please retry")
except Exception as e:
    raise HTTPException(500, f"Unexpected payment error: {e}")
```

### Edge Cases Specific to SliceMatic

| Case | Handling |
|---|---|
| Cart modified after order created | Order amount is locked at creation; if cart changes, create a new order |
| Razorpay order expires (default 30 min) | Show "Session expired, please place order again" |
| Customer refreshes payment page | Checkout.js handles this — same order_id can be retried |
| Zero-item cart | Block at Gradio level before hitting payment flow |
| Extremely large order (qty 10 × 8 pizzas) | Max theoretical: ~₹15,000 — well within Razorpay test limits |

---

## 13. Environment Variables & Security

### Required Environment Variables

```bash
# .env file (NEVER commit to git)
RAZORPAY_KEY_ID=<your_razorpay_test_key_id>
RAZORPAY_KEY_SECRET=<your_razorpay_test_key_secret>
SUPABASE_URL=https://bhblbrdplosmsrkoazdn.supabase.co
SUPABASE_SERVICE_KEY=<your-supabase-service-role-key>
```

### Security Rules

| Rule | Reason |
|---|---|
| Never expose `KEY_SECRET` to frontend | It can create/capture payments on your behalf |
| Use `python-dotenv` to load `.env` | Keeps secrets out of code |
| Add `.env` to `.gitignore` | Prevents accidental commit |
| Use `hmac.compare_digest()` not `==` | Prevents timing attacks on signature comparison |
| Validate amount server-side | Client can tamper with displayed amount |
| Store `razorpay_order_id` before sending to client | Allows server-side reconciliation |

### .gitignore Addition

```
# Payment secrets
.env
.env.local
.env.production
```

### Loading in FastAPI

```python
from dotenv import load_dotenv
load_dotenv()  # reads .env file at startup
```

---

## 14. Complete Code Reference

### Project Structure (Stage 3 with Payments)

```
Slicematic/
├── backend/
│   ├── main.py              # FastAPI app, CORS, startup
│   ├── routes/
│   │   ├── orders.py        # /api/orders/create, /api/orders/cod
│   │   ├── payments.py      # /api/payments/verify
│   │   └── menu.py          # /api/menu (read from Supabase)
│   ├── services/
│   │   ├── razorpay_service.py   # Razorpay client wrapper
│   │   ├── pricing.py            # SliceMatic pricing logic (Decimal)
│   │   └── supabase_client.py    # Supabase connection
│   ├── templates/
│   │   └── checkout.html         # Razorpay checkout page
│   ├── .env                      # Secrets (gitignored)
│   └── requirements.txt
├── frontend/
│   └── app.py                    # Gradio UI
├── db/
│   ├── transactions.sql
│   └── master schema & data_entry.sql
└── documents/
    └── razorpay_integration_analysis.md  (this file)
```

### Minimal Working Example (all-in-one for testing)

```python
"""
minimal_payment_test.py — Test Razorpay integration locally
Run: uvicorn minimal_payment_test:app --reload --port 8000
"""
import hashlib
import hmac as hmac_module
import os
import time
from decimal import Decimal, ROUND_HALF_UP

import razorpay
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="SliceMatic Payment Test")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

client = razorpay.Client(auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET")))


class CreateOrderReq(BaseModel):
    amount_inr: str  # e.g. "850.34"
    customer_name: str
    phone: str


class VerifyReq(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@app.post("/create-order")
def create_order(req: CreateOrderReq):
    amount_paise = int((Decimal(req.amount_inr) * 100).to_integral_value(rounding=ROUND_HALF_UP))
    if amount_paise < 100:
        raise HTTPException(400, "Minimum ₹1")
    order = client.order.create({
        "amount": amount_paise,
        "currency": "INR",
        "receipt": f"test_{int(time.time())}",
    })
    return {"order_id": order["id"], "amount": amount_paise, "key_id": os.getenv("RAZORPAY_KEY_ID")}


@app.get("/pay/{order_id}/{amount}/{name}/{phone}", response_class=HTMLResponse)
def payment_page(order_id: str, amount: int, name: str, phone: str):
    return f"""<!DOCTYPE html>
<html><head><title>SliceMatic Pay</title>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script></head>
<body><h2>SliceMatic — ₹{amount/100:.2f}</h2>
<script>
var rzp = new Razorpay({{
  key: "{os.getenv('RAZORPAY_KEY_ID')}",
  amount: "{amount}", currency: "INR",
  name: "SliceMatic", description: "Pizza Order",
  order_id: "{order_id}",
  handler: function(r) {{
    fetch('/verify', {{method:'POST', headers:{{'Content-Type':'application/json'}},
      body: JSON.stringify({{razorpay_order_id:r.razorpay_order_id,
        razorpay_payment_id:r.razorpay_payment_id,
        razorpay_signature:r.razorpay_signature}})
    }}).then(r=>r.json()).then(d=>{{document.body.innerHTML='<h1>'+d.status+'</h1>'}});
  }},
  prefill: {{name:"{name}", contact:"{phone}"}},
  theme: {{color:"#e63946"}}
}});
rzp.open();
</script></body></html>"""


@app.post("/verify")
def verify(req: VerifyReq):
    secret = os.getenv("RAZORPAY_KEY_SECRET")
    msg = f"{req.razorpay_order_id}|{req.razorpay_payment_id}"
    expected = hmac_module.new(secret.encode(), msg.encode(), hashlib.sha256).hexdigest()
    if not hmac_module.compare_digest(expected, req.razorpay_signature):
        raise HTTPException(400, "Signature mismatch")
    return {"status": "Payment Verified ✓", "payment_id": req.razorpay_payment_id}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### Testing Locally

```bash
# 1. Install dependencies
pip install razorpay fastapi uvicorn python-dotenv

# 2. Create .env
echo "RAZORPAY_KEY_ID=<your_razorpay_test_key_id>" > .env
echo "RAZORPAY_KEY_SECRET=<your_razorpay_test_key_secret>" >> .env

# 3. Run server
uvicorn minimal_payment_test:app --reload --port 8000

# 4. Create test order (via curl or browser)
curl -X POST http://localhost:8000/create-order \
  -H "Content-Type: application/json" \
  -d '{"amount_inr": "850.34", "customer_name": "Test", "phone": "9876543210"}'

# Response: {"order_id": "order_xxx", "amount": 85034, "key_id": "rzp_test_..."}

# 5. Open payment page in browser
# http://localhost:8000/pay/{order_id}/85034/Test/9876543210
# → Razorpay modal opens → use test card → click Success on mock bank
```

---

## 15. Razorpay Integration Prompt (Reference)

The following is the original integration prompt provided by Razorpay for reference. Our implementation adapts this for the FastAPI + Gradio + Supabase stack:

> **Razorpay Web Standard Checkout (Test Mode)**
>
> **Credentials:**
> - Key ID: `<your_razorpay_test_key_id>`
> - Key Secret: `<your_razorpay_test_key_secret>`
>
> **Integration Steps:**
> 1. Create an order on server using Orders API (`POST /v1/orders`)
> 2. Pass `order_id` to checkout.js on frontend
> 3. Customer completes payment (card/UPI/wallet)
> 4. On success, handler returns `razorpay_payment_id`, `razorpay_order_id`, `razorpay_signature`
> 5. Verify signature server-side: `HMAC-SHA256(order_id|payment_id, secret)`
> 6. If verified → mark order as paid; else → reject
>
> **Test card:** 4111 1111 1111 1111, any CVV, any future expiry
> **Test UPI:** success@razorpay
> **Mock bank page:** shows Success/Failure buttons (no real charge)
>
> **Amount:** Always in paise (₹1 = 100 paise). Minimum: 100 paise.
> **SDK:** `pip install razorpay` → `razorpay.Client(auth=(key_id, key_secret))`

---

## Summary: What to Build

| Component | Technology | Key Action |
|---|---|---|
| Order creation | FastAPI + Razorpay Python SDK | `client.order.create()` |
| Checkout UI | HTML page served by FastAPI (opened from Gradio) | `checkout.js` modal |
| Payment verification | FastAPI endpoint | HMAC-SHA256 signature check |
| COD handling | FastAPI endpoint | Direct DB insert, no Razorpay |
| Order storage | Supabase (existing `orders` table + new columns) | Status transitions |
| Frontend trigger | Gradio button + `requests` to FastAPI | Route by payment method |

### Implementation Priority

1. **Set up FastAPI server** with Razorpay client and `.env`
2. **Create `/api/orders/create`** endpoint (order creation)
3. **Build `/checkout/{order_id}`** HTML page with checkout.js
4. **Create `/api/payments/verify`** endpoint (HMAC verification)
5. **Create `/api/orders/cod`** endpoint (Cash path)
6. **Wire Gradio** to call FastAPI based on payment method selection
7. **Add Supabase columns** (`razorpay_order_id`, `payment_status`, etc.)
8. **Test end-to-end** with test card and test UPI

---

*Generated for SliceMatic Stage 3 planning — FDE Academy Batch 2487*
