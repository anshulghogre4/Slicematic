import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "./store";
import { defaultPricingConfig } from "./pricing";

describe("Global Store", () => {
  beforeEach(() => {
    // Reset store state before each test
    useStore.setState({
      cart: [],
      customer: { name: "", phone: "", address: "", deliveryZone: "2-4", note: "" },
      pricingConfig: defaultPricingConfig,
      paymentMode: "UPI",
      lastOrder: null,
      recommendation: null,
    });
  });

  it("should have the correct initial state", () => {
    const state = useStore.getState();
    expect(state.cart).toEqual([]);
    expect(state.paymentMode).toBe("UPI");
    expect(state.customer.name).toBe("");
  });

  it("should update cart correctly", () => {
    const newCart = [{
      id: "test",
      pizzaId: 1,
      baseId: 1,
      sizeId: "s1",
      toppingIds: [],
      quantity: 1
    }];
    
    useStore.getState().setCart(newCart);
    expect(useStore.getState().cart).toEqual(newCart);
  });

  it("should update customer correctly", () => {
    const newCustomer = { name: "Aarav", phone: "9876543210", address: "Flat 1", deliveryZone: "0-2" as const, note: "" };
    useStore.getState().setCustomer(newCustomer);
    expect(useStore.getState().customer).toEqual(newCustomer);
  });

  it("should update payment mode", () => {
    useStore.getState().setPaymentMode("Card");
    expect(useStore.getState().paymentMode).toBe("Card");
  });

  it("should clear cart on clearCheckout", () => {
    useStore.getState().setCart([{ id: "test", pizzaId: 1, baseId: 1, sizeId: "s1", toppingIds: [], quantity: 1 }]);
    useStore.getState().clearCheckout();
    expect(useStore.getState().cart).toEqual([]);
  });
});
