import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock zustand persist to prevent localStorage errors in Node environment (no jsdom here).
// Captures the persist options so we can assert on the configured storage engine below.
const persistOptionsRef = vi.hoisted(() => ({ current: null as any }));
vi.mock("zustand/middleware", () => ({
  persist: (config: any, options: any) => {
    persistOptionsRef.current = options;
    return config;
  },
  // Mirrors zustand's real createJSONStorage: `getStorage` is only invoked lazily,
  // when getItem/setItem/removeItem are actually called — never at import time.
  createJSONStorage: (getStorage: () => Storage) => ({
    getItem: (name: string) => getStorage().getItem(name),
    setItem: (name: string, value: string) => getStorage().setItem(name, value),
    removeItem: (name: string) => getStorage().removeItem(name),
  }),
}));

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

  it("resetSession clears cart, customer, lastOrder, and recommendation but preserves pricingConfig", () => {
    useStore.getState().setCart([{ id: "test", pizzaId: 1, baseId: 1, sizeId: "s1", toppingIds: [], quantity: 1 }]);
    useStore.getState().setCustomer({ name: "Aarav", phone: "9876543210", address: "Flat 1", deliveryZone: "0-2", note: "leave at gate" });
    useStore.getState().setLastOrder({ orderId: "abc" } as any);
    useStore.getState().setRecommendation({ headline: "Try this" } as any);
    useStore.getState().setPricingConfig({ ...defaultPricingConfig, gstRate: 0.15 });

    useStore.getState().resetSession();

    const state = useStore.getState();
    expect(state.cart).toEqual([]);
    expect(state.customer).toEqual({ name: "", phone: "", address: "", deliveryZone: "2-4", note: "" });
    expect(state.lastOrder).toBeNull();
    expect(state.recommendation).toBeNull();
    expect(state.pricingConfig.gstRate).toBe(0.15); // Pricing config preserved!
  });
});

describe("Global Store persistence engine", () => {
  it("persists to sessionStorage, not localStorage", () => {
    const sessionData: Record<string, string> = {};
    const localData: Record<string, string> = {};
    (globalThis as any).sessionStorage = {
      getItem: (key: string) => sessionData[key] ?? null,
      setItem: (key: string, value: string) => { sessionData[key] = value; },
      removeItem: (key: string) => { delete sessionData[key]; },
    };
    (globalThis as any).localStorage = {
      getItem: (key: string) => localData[key] ?? null,
      setItem: (key: string, value: string) => { localData[key] = value; },
      removeItem: (key: string) => { delete localData[key]; },
    };

    expect(persistOptionsRef.current?.name).toBe("slicematic-storage");
    expect(persistOptionsRef.current?.storage).toBeTruthy();

    persistOptionsRef.current.storage.setItem("probe", "value");

    expect(sessionData.probe).toBe("value");
    expect(localData.probe).toBeUndefined();
  });
});
