import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { hasCashfreeEnv, createCashfreeOrder, verifyCashfreePayment } from "./cashfree";

describe("hasCashfreeEnv", () => {
  it("is false when keys are unset", () => {
    delete process.env.CASHFREE_APP_ID;
    delete process.env.CASHFREE_SECRET_KEY;
    expect(hasCashfreeEnv()).toBe(false);
  });

  it("is true when both keys are set", () => {
    process.env.CASHFREE_APP_ID = "cf_test_x";
    process.env.CASHFREE_SECRET_KEY = "secret_x";
    expect(hasCashfreeEnv()).toBe(true);
    delete process.env.CASHFREE_APP_ID;
    delete process.env.CASHFREE_SECRET_KEY;
  });
});

describe("Cashfree API Methods", () => {
  let originalFetch: typeof global.fetch;
  
  beforeEach(() => {
    process.env.CASHFREE_APP_ID = "test_app_id";
    process.env.CASHFREE_SECRET_KEY = "test_secret";
    originalFetch = global.fetch;
  });

  afterEach(() => {
    delete process.env.CASHFREE_APP_ID;
    delete process.env.CASHFREE_SECRET_KEY;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("createCashfreeOrder", () => {
    it("throws if env not configured", async () => {
      delete process.env.CASHFREE_APP_ID;
      await expect(createCashfreeOrder({
        orderId: "123", amount: 100, customerPhone: "999", customerName: "Test", returnUrl: "http"
      })).rejects.toThrow("CASHFREE_NOT_CONFIGURED");
    });

    it("returns session ID on successful API call", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ payment_session_id: "session_123", cf_order_id: "cf_123" })
      });

      const res = await createCashfreeOrder({
        orderId: "ord_123", amount: 100, customerPhone: "9876543210", customerName: "Test", returnUrl: "http://localhost"
      });

      expect(res.paymentSessionId).toBe("session_123");
      expect(res.cfOrderId).toBe("cf_123");
    });

    it("throws detailed error on failed API call", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => "Bad Request"
      });

      await expect(createCashfreeOrder({
        orderId: "ord_123", amount: 100, customerPhone: "9876543210", customerName: "Test", returnUrl: "http"
      })).rejects.toThrow("CASHFREE_ORDER_FAILED: 400 Bad Request");
    });
  });

  describe("verifyCashfreePayment", () => {
    it("throws if env not configured", async () => {
      delete process.env.CASHFREE_APP_ID;
      await expect(verifyCashfreePayment("123")).rejects.toThrow("CASHFREE_NOT_CONFIGURED");
    });

    it("returns success false if fetch fails", async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false });
      const res = await verifyCashfreePayment("123");
      expect(res.success).toBe(false);
    });

    it("returns success false if no SUCCESS payment exists", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ payment_status: "FAILED" }, { payment_status: "PENDING" }]
      });
      const res = await verifyCashfreePayment("123");
      expect(res.success).toBe(false);
    });

    it("returns success true with paymentId if SUCCESS exists", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { payment_status: "FAILED" },
          { cf_payment_id: 98765, payment_status: "SUCCESS" }
        ]
      });
      const res = await verifyCashfreePayment("123");
      expect(res.success).toBe(true);
      expect(res.paymentId).toBe("98765");
      expect(res.paymentStatus).toBe("SUCCESS");
    });
  });
});
