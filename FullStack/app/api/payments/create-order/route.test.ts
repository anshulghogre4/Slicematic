import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/payments/create-order", () => {
  beforeEach(() => {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
  });

  it("returns 503 when Razorpay keys are not configured", async () => {
    const request = new Request("http://localhost/api/payments/create-order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ customer: { name: "Aarav", phone: "9876543210" }, lines: [], paymentMode: "Card" })
    });
    const response = await POST(request);
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.errors.payment).toMatch(/not configured/i);
  });
});
