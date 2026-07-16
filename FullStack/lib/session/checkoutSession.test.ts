import { describe, expect, it } from "vitest";
import {
  clearCashfreePendingPayment,
  completeCashfreeReturn,
  readCashfreePendingPayment,
  readCheckoutSessionIdentity,
  writeCashfreePendingPayment,
} from "./checkoutSession";
import { LOCAL_STORAGE_KEYS, SESSION_STORAGE_KEYS } from "./storageKeys";

function createMemoryStorage(seed: Record<string, string> = {}) {
  const data = { ...seed };
  return {
    data,
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
    removeItem: (key: string) => {
      delete data[key];
    },
  };
}

describe("checkout session helpers", () => {
  it("reads guest identity when no session customer is logged in", () => {
    const storage = createMemoryStorage();

    expect(readCheckoutSessionIdentity(storage)).toEqual({
      customerLoggedIn: false,
      customerMode: "guest",
      sessionEmail: "",
      sessionCustomerId: null,
    });
  });

  it("reads member identity from centralized session keys", () => {
    const storage = createMemoryStorage({
      [SESSION_STORAGE_KEYS.customerLoggedIn]: "true",
      [SESSION_STORAGE_KEYS.customerEmail]: "demo@slicematic.in",
      [SESSION_STORAGE_KEYS.customerId]: "cust_123",
    });

    expect(readCheckoutSessionIdentity(storage)).toEqual({
      customerLoggedIn: true,
      customerMode: "member",
      sessionEmail: "demo@slicematic.in",
      sessionCustomerId: "cust_123",
    });
  });

  it("round-trips Cashfree pending payment state", () => {
    const storage = createMemoryStorage();
    const pending = { orderId: "cf_123", amountPaise: 42900, payload: { cartLines: 2 } };

    writeCashfreePendingPayment(storage, pending);

    expect(readCashfreePendingPayment(storage)).toEqual(pending);
    expect(storage.data[LOCAL_STORAGE_KEYS.cashfreePending]).toContain("cf_123");

    clearCashfreePendingPayment(storage);

    expect(readCashfreePendingPayment(storage)).toBeNull();
  });

  it("returns null for malformed Cashfree pending state", () => {
    const storage = createMemoryStorage({
      [LOCAL_STORAGE_KEYS.cashfreePending]: "{not-json",
    });

    expect(readCashfreePendingPayment(storage)).toBeNull();
  });

  it("completes a Cashfree return only when a return order id exists", () => {
    const storage = createMemoryStorage();
    const pending = { orderId: "cf_456", amountPaise: 51900, payload: { customerMode: "member" } };

    writeCashfreePendingPayment(storage, pending);

    expect(completeCashfreeReturn(storage, null)).toBeNull();
    expect(readCashfreePendingPayment(storage)).toEqual(pending);

    expect(completeCashfreeReturn(storage, "cf_456")).toEqual(pending);
    expect(readCashfreePendingPayment(storage)).toBeNull();
  });
});
