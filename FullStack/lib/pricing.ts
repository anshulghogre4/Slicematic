import { BillTotals, CartLine, MenuPayload } from "./types";

export const GST_RATE = 0.18;
export const BULK_DISCOUNT_RATE = 0.1;
export const BULK_DISCOUNT_QTY = 5;
export const MAX_ORDER_QTY = 10;

export function money(value: number) {
  return `Rs. ${Math.round(value).toLocaleString("en-IN")}`;
}

export function moneyExact(value: number) {
  return `Rs. ${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

export function calculateBill(lines: CartLine[], menu: MenuPayload): BillTotals {
  const subtotal = lines.reduce((sum, line) => sum + getLineUnitPrice(line, menu) * line.quantity, 0);
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  const discount = totalQuantity >= BULK_DISCOUNT_QTY ? subtotal * BULK_DISCOUNT_RATE : 0;
  const taxable = subtotal - discount;
  const gst = taxable * GST_RATE;
  return {
    subtotal,
    discount,
    taxable,
    gst,
    finalTotal: taxable + gst,
    totalQuantity
  };
}

export function validateCustomer(name: string, phone: string, address: string, deliveryZone?: string) {
  const errors: Record<string, string> = {};
  if (!/^[A-Za-z ]{2,40}$/.test(name.trim())) {
    errors.name = "Name must contain alphabetic characters and be 2-40 characters long.";
  }
  if (!/^[6-9]\d{9}$/.test(phone.trim())) {
    errors.phone = "Enter a valid Indian mobile number starting with 6, 7, 8, or 9.";
  }
  if (address.trim().length < 12) {
    errors.address = "Add a clear flat, street, and landmark.";
  }
  if (!deliveryZone) {
    errors.deliveryZone = "Choose a delivery radius before continuing.";
  } else if (deliveryZone === "4-6") {
    errors.deliveryZone = "SliceMatic currently delivers within the 4 km launch radius.";
  }
  return errors;
}

export function validateOrderLines(lines: CartLine[] | undefined, menu: MenuPayload) {
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
    if (line.quantity > MAX_ORDER_QTY) {
      errors[`quantity_${row}`] = `Maximum outlet capacity is ${MAX_ORDER_QTY} pizzas per order.`;
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

  if (totalQuantity > MAX_ORDER_QTY) {
    errors.cart = `Maximum outlet capacity is ${MAX_ORDER_QTY} pizzas per order.`;
  }
  return errors;
}
