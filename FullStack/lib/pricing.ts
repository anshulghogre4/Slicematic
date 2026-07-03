import { BillTotals, CartLine, MenuPayload, PricingConfig } from "./types";

export const GST_RATE = 0.18;
export const BULK_DISCOUNT_RATE = 0.1;
export const BULK_DISCOUNT_QTY = 5;
export const MAX_ORDER_QTY = 10;

export const defaultPricingConfig: PricingConfig = {
  gstRate: GST_RATE,
  bulkDiscountRate: BULK_DISCOUNT_RATE,
  bulkDiscountQty: BULK_DISCOUNT_QTY,
  maxOrderQty: MAX_ORDER_QTY,
  deliveryFee: 0,
  freeDeliveryMin: 0,
  activeDeliveryZone: "2-4",
  guestCashAllowed: false
};

export function money(value: number) {
  return `Rs. ${Math.round(value).toLocaleString("en-IN")}`;
}

export function getLineUnitPrice(line: CartLine, menu: MenuPayload) {
  const pizza = menu.pizzas.find((item) => item.id === line.pizzaId);
  const base = menu.bases.find((item) => item.id === line.baseId);
  const size = menu.sizes.find((item) => item.id === line.sizeId);
  if (!pizza || !base || !size) return 0;
  const toppingTotal = line.toppingIds.reduce((sum, id) => {
    const topping = menu.toppings.find((item) => item.id === id);
    return sum + (topping?.price ?? 0);
  }, 0);
  return pizza.price + base.price + size.extra + toppingTotal;
}

export function calculateBill(lines: CartLine[], menu: MenuPayload, config: PricingConfig = defaultPricingConfig): BillTotals {
  const subtotal = Math.round(lines.reduce((sum, line) => sum + getLineUnitPrice(line, menu) * line.quantity, 0));
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  const discount = Math.round(totalQuantity >= config.bulkDiscountQty ? subtotal * config.bulkDiscountRate : 0);
  const taxable = Math.round(subtotal - discount);
  const gst = Math.round(taxable * config.gstRate);
  const deliveryCharge = Math.round(config.deliveryFee > 0 && subtotal < config.freeDeliveryMin ? config.deliveryFee : 0);
  return {
    subtotal,
    discount,
    taxable,
    gst,
    deliveryCharge,
    finalTotal: taxable + gst + deliveryCharge,
    totalQuantity
  };
}

export function validateCustomer(name: string, phone: string, address: string, deliveryZone?: string, config: PricingConfig = defaultPricingConfig) {
  const errors: Record<string, string> = {};
  if (!/^[A-Za-z ]+$/.test(name.trim()) || name.trim().length < 2 || name.trim().length > 40) {
    errors.name = "Name must contain alphabetic characters and be 2-40 characters long.";
  }
  const p = phone.trim();
  if (!p) {
    errors.phone = "Phone number is required.";
  } else if (!/^\d+$/.test(p) || p.length !== 10) {
    errors.phone = "Phone number must be exactly 10 digits.";
  } else if (!/^[6789]/.test(p)) {
    errors.phone = "Enter a valid Indian mobile number starting with 6, 7, 8, or 9.";
  }
  if (address.trim().length < 12) {
    errors.address = "Add a clear flat, street, and landmark.";
  }
  if (!deliveryZone) {
    errors.deliveryZone = "Choose a delivery radius before continuing.";
  } else if (deliveryZoneRank(deliveryZone) > deliveryZoneRank(config.activeDeliveryZone)) {
    errors.deliveryZone = `SliceMatic currently delivers within the ${zoneLabel(config.activeDeliveryZone)} launch radius.`;
  }
  return errors;
}

export function validateOrderLines(lines: CartLine[] | undefined, menu: MenuPayload, config: PricingConfig = defaultPricingConfig) {
  const errors: Record<string, string> = {};
  if (!lines?.length) {
    errors.cart = "Add at least one pizza before placing the order.";
    return errors;
  }

  let totalQuantity = 0;
  lines.forEach((line, index) => {
    const row = index + 1;
    if (!Number.isInteger(line.quantity)) {
      errors[`quantity_${row}`] = "Quantity must be a whole number from 1 to 10.";
      return;
    }
    if (line.quantity < 1) {
      errors[`quantity_${row}`] = "Quantity must be between 1 and 10.";
      return;
    }
    if (line.quantity > config.maxOrderQty) {
      errors[`quantity_${row}`] = `Maximum outlet capacity is ${config.maxOrderQty} pizzas per order.`;
      return;
    }
    totalQuantity += line.quantity;

    const pizza = menu.pizzas.find((item) => item.id === line.pizzaId && item.available);
    const base = menu.bases.find((item) => item.id === line.baseId && item.available);
    const size = menu.sizes.find((item) => item.id === line.sizeId && item.available);
    if (!pizza) errors[`pizza_${row}`] = "That pizza is not available in the active menu.";
    if (!base) errors[`base_${row}`] = "That base is not available in the active menu.";
    if (!size) errors[`size_${row}`] = "That size is not available in the active menu.";

    if (new Set(line.toppingIds).size !== line.toppingIds.length) {
      errors[`topping_${row}`] = "Choose each topping only once.";
    }
    const invalidTopping = line.toppingIds.find((id) => !menu.toppings.some((item) => item.id === id && item.available));
    if (invalidTopping !== undefined) {
      errors[`topping_${row}`] = "That topping is not available in the active menu.";
    }
  });

  if (totalQuantity > config.maxOrderQty) {
    errors.cart = `Maximum outlet capacity is ${config.maxOrderQty} pizzas per order.`;
  }
  return errors;
}

export function sanitizePricingConfig(config?: Partial<PricingConfig>): PricingConfig {
  return {
    gstRate: clampPercent(config?.gstRate, defaultPricingConfig.gstRate),
    bulkDiscountRate: clampPercent(config?.bulkDiscountRate, defaultPricingConfig.bulkDiscountRate),
    bulkDiscountQty: clampInt(config?.bulkDiscountQty, 1, 50, defaultPricingConfig.bulkDiscountQty),
    maxOrderQty: clampInt(config?.maxOrderQty, 1, 50, defaultPricingConfig.maxOrderQty),
    deliveryFee: clampMoney(config?.deliveryFee, defaultPricingConfig.deliveryFee),
    freeDeliveryMin: clampMoney(config?.freeDeliveryMin, defaultPricingConfig.freeDeliveryMin),
    activeDeliveryZone: ["0-2", "2-4", "4-6"].includes(String(config?.activeDeliveryZone)) ? config?.activeDeliveryZone as PricingConfig["activeDeliveryZone"] : defaultPricingConfig.activeDeliveryZone,
    guestCashAllowed: Boolean(config?.guestCashAllowed)
  };
}

function deliveryZoneRank(zone?: string) {
  if (zone === "0-2") return 1;
  if (zone === "2-4") return 2;
  if (zone === "4-6") return 3;
  return 0;
}

function zoneLabel(zone: string) {
  if (zone === "0-2") return "2 km";
  if (zone === "2-4") return "4 km";
  return "6 km";
}

function clampPercent(value: unknown, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(1, Math.max(0, numeric));
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const numeric = Math.round(Number(value));
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function clampMoney(value: unknown, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(10000, Math.max(0, numeric));
}
