# 💰 SliceMatic — Business Rules

> Hard constants that match the graded assignment spec. Never change values without reading the PRD.

---

## Pricing Constants (`lib/pricing.ts`)

```typescript
GST_RATE           = 0.18    // 18% GST
BULK_DISCOUNT_RATE = 0.10    // 10% discount
BULK_DISCOUNT_QTY  = 5       // discount triggers at qty >= 5
MAX_ORDER_QTY      = 10      // hard cap per order
```

---

## Bill Calculation Order (STRICT)

```
subtotal     = sum(pizza + base + size_extra + toppings) × quantity
discount     = subtotal × 10%  IF totalQty >= 5  ELSE 0
taxable      = subtotal - discount
gst          = taxable × 18%
deliveryFee  = pricingConfig.deliveryFee IF subtotal < freeDeliveryMin ELSE 0
finalTotal   = taxable + gst + deliveryFee
```

**Important:** GST is applied AFTER discount, not on subtotal. Never change this order.

All monetary values use `Math.round()` to nearest integer (Indian Rupee).

---

## Customer Validation Rules

| Field | Rule |
|---|---|
| Name | Letters + spaces only, 2–40 chars |
| Phone | Exactly 10 digits, must start with 6/7/8/9 |
| Address | Minimum 12 chars |
| Delivery Zone | Must not exceed `pricingConfig.activeDeliveryZone` |

Zones ranked: `0-2` < `2-4` < `4-6`

---

## Payment Modes

| Mode | Guest | Member |
|---|---|---|
| UPI (Cashfree) | ✅ | ✅ |
| Card (Razorpay) | ✅ | ✅ |
| Cash | ❌ (unless `guestCashAllowed=true`) | ✅ |

`guestCashAllowed` is a toggle in PricingConfig controlled by admin.

---

## Default PricingConfig

```typescript
{
  gstRate: 0.18,
  bulkDiscountRate: 0.10,
  bulkDiscountQty: 5,
  maxOrderQty: 10,
  deliveryFee: 0,
  freeDeliveryMin: 0,
  activeDeliveryZone: "2-4",
  guestCashAllowed: false
}
```

Admin can override these via `/api/admin/outlet/pricing`. Stored in Supabase `outlet_settings` table.

---

## Line Item Pricing Formula

```typescript
linePrice = pizza.price + base.price + size.extra + sum(topping.prices)
lineTotal = linePrice × quantity
```

---

## Timestamps

All timestamps are IST (`Asia/Kolkata`, UTC+05:30).

---

## Menu Item Availability

Menu items have an `available: boolean` flag. Unavailable items are filtered out before display. Admin can toggle availability. Unavailable items should never appear in:
- Customer-facing menu
- Cart validation
- Order placement

---

*Last updated: 2026-07-06*
