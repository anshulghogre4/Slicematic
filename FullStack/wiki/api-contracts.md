# 🌐 SliceMatic — API Contracts

> All Next.js API routes, their methods, request bodies, and responses.

---

## Route Inventory

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/menu` | GET | Public | Fetch full menu (pizzas, bases, toppings, sizes) |
| `/api/orders` | POST | Public | Place a Cash order |
| `/api/recommend` | POST | Public | Get AI pizza recommendation |
| `/api/health` | GET | Public | Health check / connectivity |
| `/api/outlet` | GET/POST | Admin | Get/set outlet pricing config |
| `/api/ai` | POST | Admin | Admin AI tools |
| `/api/customer/orders` | GET | Customer | Fetch customer order history |
| `/api/admin/orders` | GET | Admin | Admin order summary |
| `/api/admin/outlet/pricing` | POST | Admin | Update pricing config |
| `/api/admin/menu/*` | POST | Admin | Menu CRUD operations |
| `/api/payments/cashfree/create-order` | POST | Public | Create Cashfree UPI order |
| `/api/payments/cashfree/verify` | POST | Public | Verify Cashfree payment |
| `/api/payments/razorpay/create-order` | POST | Public | Create Razorpay card order |
| `/api/payments/razorpay/verify` | POST | Public | Verify Razorpay payment |

---

## Detailed Contracts

### `GET /api/menu`
**Response:**
```typescript
{
  pizzas: MenuItem[];
  bases: MenuItem[];
  toppings: MenuItem[];
  sizes: SizeOption[];
}
```
*Fetches from Supabase if available, falls back to `lib/seed-data.ts`*

---

### `POST /api/orders`
**Request body:**
```typescript
{
  customer: CustomerDetails;          // name, phone, address, deliveryZone, note
  lines: CartLine[];                  // pizzaId, baseId, sizeId, toppingIds[], quantity
  paymentMode: "Cash";
  customerMode: "guest" | "member";
  customerAccountEmail?: string | null;
  customerId?: string | null;         // UUID from sessionStorage
  pricingConfig?: PricingConfig;
  recommendationId?: string | null;
}
```
**Response (success):**
```typescript
{ ok: true, order: SavedOrder }
```
**Response (error):**
```typescript
{ ok: false, errors: Record<string, string> }
```

---

### `POST /api/recommend`
**Request body:**
```typescript
{
  name: string;
  phone: string;
  customer_id?: string;              // UUID for returning customer lookup
}
```
**Response:**
```typescript
{
  recommendations: Recommendation[];
  primary: Recommendation;
  // Or single: Recommendation (legacy)
}

type Recommendation = {
  recommendationId?: string;
  pizzaId: number;
  toppingId: number;
  pizzaName: string;
  toppingName: string;
  reason: string;
  confidence: number;
  source: "openrouter" | "fallback";
  customerTier: "new" | "returning";
}
```

---

### `GET /api/customer/orders`
**Query params:**
```
?customer_id=<UUID>
```
**Response:**
```typescript
{
  ok: true;
  orders: CustomerOrderHistoryItem[];
  customer_id?: string;              // may update if resolved from phone
}
```
**Auth:** Validates customer_id ownership via `lib/customer-auth.ts`

---

### `GET /api/admin/orders`
**Headers:**
```
Authorization: Bearer <adminAccessToken>
```
**Response:**
```typescript
AdminSummary {
  totalRevenue: number;
  orderCount: number;
  avgOrderValue: number;
  topPizza: string;
  busiestHour: string;
  paymentMix: Array<{ mode: string; count: number; revenue: number }>;
  hourlyDemand: Array<{ hour: string; orders: number; revenue: number }>;
  recentOrders: SavedOrder[];
  forecast: ForecastPoint[];
}
```

---

### `POST /api/payments/cashfree/create-order`
**Request:** Same as `/api/orders` body  
**Response:**
```typescript
{
  ok: true;
  cfOrderId: string;
  paymentSessionId: string;
  amountPaise: number;
}
```
*After success, client calls Cashfree SDK → redirect → return with `?order_id=`*

### `POST /api/payments/cashfree/verify`
**Request body:**
```typescript
{
  orderId: string;
  amountPaise: number;
  payload: OrderPayload;
}
```
**Response:** Same as `/api/orders` response

---

## Error Handling Convention

All API routes return:
```typescript
// Success
{ ok: true, ...data }

// Error
{ ok: false, error: string }
// or
{ ok: false, errors: Record<string, string> }
```

Supabase unavailable → routes degrade gracefully (return seed data or skip DB write).

---

*Last updated: 2026-07-06*
