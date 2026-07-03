export type PaymentMode = "Cash" | "Card" | "UPI";

export type MenuItem = {
  id: number;
  code: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
  badge?: string;
  tags?: string[];
  prepMinutes?: number;
  available: boolean;
};

export type SizeOption = {
  id: string;
  name: string;
  extra: number;
  detail: string;
  available: boolean;
};

export type MenuPayload = {
  pizzas: MenuItem[];
  bases: MenuItem[];
  toppings: MenuItem[];
  sizes: SizeOption[];
};

export type CartLine = {
  id: string;
  pizzaId: number;
  baseId: number;
  sizeId: string;
  toppingIds: number[];
  quantity: number;
};

export type CustomerDetails = {
  name: string;
  phone: string;
  address: string;
  deliveryZone?: "0-2" | "2-4" | "4-6";
  note?: string;
};

export type BillTotals = {
  subtotal: number;
  discount: number;
  taxable: number;
  gst: number;
  deliveryCharge: number;
  finalTotal: number;
  totalQuantity: number;
};

export type PricingConfig = {
  gstRate: number;
  bulkDiscountRate: number;
  bulkDiscountQty: number;
  maxOrderQty: number;
  deliveryFee: number;
  freeDeliveryMin: number;
  activeDeliveryZone: "0-2" | "2-4" | "4-6";
  guestCashAllowed: boolean;
};

export type OrderPayload = {
  customer: CustomerDetails;
  lines: CartLine[];
  paymentMode: PaymentMode;
  customerMode?: "guest" | "member";
  customerAccountEmail?: string | null;
  pricingConfig?: PricingConfig;
  recommendationId?: string | null;
};

export type PaymentMeta = {
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  cashfreeOrderId?: string;
  cashfreePaymentId?: string;
  paymentStatus?: "paid" | "confirmed" | "failed";
};

export type SavedOrder = {
  id: string;
  createdAt: string;
  customerName: string;
  phone: string;
  address?: string;
  deliveryZone?: string;
  paymentMode: PaymentMode;
  status: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  cashfreeOrderId?: string;
  cashfreePaymentId?: string;
  paymentStatus?: "paid" | "confirmed" | "failed";
  subtotal: number;
  discount: number;
  gst: number;
  finalTotal: number;
  lines: Array<{
    pizzaName: string;
    baseName: string;
    sizeName: string;
    toppings: string[];
    quantity: number;
    lineTotal: number;
  }>;
};

export type Recommendation = {
  recommendationId?: string;
  pizzaId: number;
  toppingId: number;
  pizzaName: string;
  toppingName: string;
  reason: string;
  confidence: number;
  source: "openrouter" | "fallback";
  customerTier: "new" | "returning";
};

export type ForecastPoint = {
  label: string;
  predictedOrders: number;
  confidence: number;
};

export type AdminSummary = {
  totalRevenue: number;
  orderCount: number;
  avgOrderValue: number;
  topPizza: string;
  busiestHour: string;
  paymentMix: Array<{ mode: string; count: number; revenue: number }>;
  hourlyDemand: Array<{ hour: string; orders: number; revenue: number }>;
  recentOrders: SavedOrder[];
  forecast: ForecastPoint[];
};
