import { describe, expect, it } from "vitest";

import {
  getCartCashPolicyMessage,
  getDeliveryChargeLabel,
  shouldOfferCashSignIn,
  summarizeCartLine
} from "./cart-rail";
import type { CartLine, MenuPayload } from "./types";

const menu: MenuPayload = {
  pizzas: [{ id: 1, code: "MARG", name: "Margherita", price: 220, available: true }],
  bases: [{ id: 10, code: "THIN", name: "Thin crust", price: 40, available: true }],
  sizes: [{ id: "M", name: "Medium", extra: 60, detail: "", available: true }],
  toppings: [{ id: 20, code: "OLV", name: "Olives", price: 30, available: true }]
};

describe("cart rail helpers", () => {
  it("summarizes a cart line with resolved menu names and totals", () => {
    const line: CartLine = {
      id: "line-1",
      pizzaId: 1,
      baseId: 10,
      sizeId: "M",
      toppingIds: [20],
      quantity: 2
    };

    expect(summarizeCartLine(line, menu)).toMatchObject({
      pizzaName: "Margherita",
      baseName: "Thin crust",
      sizeName: "Medium",
      toppingNames: ["Olives"],
      lineTotal: 700,
      lineTotalLabel: "Rs. 700",
      hasMissingItem: false
    });
  });

  it("marks missing menu references without throwing", () => {
    const line: CartLine = {
      id: "line-2",
      pizzaId: 999,
      baseId: 10,
      sizeId: "M",
      toppingIds: [404],
      quantity: 1
    };

    expect(summarizeCartLine(line, menu)).toMatchObject({
      pizzaName: "Unavailable pizza",
      toppingNames: [],
      hasMissingItem: true
    });
  });

  it("describes delivery fee states for the cart summary", () => {
    expect(getDeliveryChargeLabel(0, { deliveryFee: 0, freeDeliveryMin: 0 })).toBe("Included");
    expect(getDeliveryChargeLabel(0, { deliveryFee: 49, freeDeliveryMin: 499 })).toBe("Free (above Rs. 499)");
    expect(getDeliveryChargeLabel(49, { deliveryFee: 49, freeDeliveryMin: 499 })).toBe("Rs. 49");
  });

  it("explains guest vs member cash policy without inventing fees", () => {
    expect(getCartCashPolicyMessage(true, false)).toBe("Cash, UPI, and Card available at checkout.");
    expect(getCartCashPolicyMessage(false, true)).toBe("Guest checkout: Cash, UPI, and Card available.");
    expect(getCartCashPolicyMessage(false, false)).toBe(
      "Guests pay with UPI or Card. Sign in to unlock Cash."
    );
    expect(shouldOfferCashSignIn(false, false)).toBe(true);
    expect(shouldOfferCashSignIn(false, true)).toBe(false);
    expect(shouldOfferCashSignIn(true, false)).toBe(false);
  });
});
