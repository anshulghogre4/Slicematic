import crypto from "crypto";

export function toPaise(finalTotal: number): number {
  return Math.round(finalTotal * 100);
}

export function hasRazorpayEnv(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string = process.env.RAZORPAY_KEY_SECRET ?? ""
): boolean {
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const signatureBuf = Buffer.from(String(signature), "utf8");
  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}

export async function createRazorpayOrder(params: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ id: string }> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("RAZORPAY_NOT_CONFIGURED");

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Basic ${auth}`
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: "INR",
      receipt: params.receipt,
      notes: params.notes ?? {},
      ...(process.env.RAZORPAY_CONFIG_ID ? { checkout_config_id: process.env.RAZORPAY_CONFIG_ID } : {})
    })
  });
  if (!response.ok) throw new Error("RAZORPAY_ORDER_FAILED");
  const data = (await response.json()) as { id?: string };
  if (!data.id) throw new Error("RAZORPAY_ORDER_FAILED");
  return { id: String(data.id) };
}
