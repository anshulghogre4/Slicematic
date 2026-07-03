import crypto from "crypto";
import { describe, expect, it } from "vitest";
import { toPaise, verifySignature, hasRazorpayEnv } from "./razorpay";

describe("toPaise", () => {
  it("converts rupees to integer paise", () => {
    expect(toPaise(850.34)).toBe(85034);
    expect(toPaise(936.92)).toBe(93692);
    expect(toPaise(2529.68)).toBe(252968);
  });

  it("rounds half up and handles sub-rupee values", () => {
    expect(toPaise(0.5)).toBe(50);
    expect(toPaise(1)).toBe(100);
  });
});

describe("verifySignature", () => {
  const secret = "test_secret_key";
  const orderId = "order_TEST123";
  const paymentId = "pay_TEST456";
  const valid = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");

  it("accepts a correctly signed payment", () => {
    expect(verifySignature(orderId, paymentId, valid, secret)).toBe(true);
  });

  it("rejects a tampered signature", () => {
    const tampered = valid.slice(0, -1) + (valid.endsWith("a") ? "b" : "a");
    expect(verifySignature(orderId, paymentId, tampered, secret)).toBe(false);
  });

  it("rejects a length-mismatched signature without throwing", () => {
    expect(verifySignature(orderId, paymentId, "short", secret)).toBe(false);
  });

  it("rejects when no secret is available", () => {
    expect(verifySignature(orderId, paymentId, valid, "")).toBe(false);
  });
});

describe("hasRazorpayEnv", () => {
  it("is false when keys are unset", () => {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    expect(hasRazorpayEnv()).toBe(false);
  });

  it("is true when both keys are set", () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_x";
    process.env.RAZORPAY_KEY_SECRET = "secret_x";
    expect(hasRazorpayEnv()).toBe(true);
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
  });
});
