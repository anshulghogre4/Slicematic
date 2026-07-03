import { NextResponse } from "next/server";
import { loadMenu } from "../../../../../lib/data-service";
import { calculateBill, sanitizePricingConfig, validateCustomer, validateOrderLines } from "../../../../../lib/pricing";
import { createCashfreeOrder, hasCashfreeEnv } from "../../../../../lib/cashfree";
import { toPaise } from "../../../../../lib/razorpay";
import { OrderPayload } from "../../../../../lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!hasCashfreeEnv()) {
      return NextResponse.json(
        { ok: false, errors: { payment: "UPI payment is not configured. Add Cashfree keys to enable UPI." } },
        { status: 503 }
      );
    }

    const payload = (await request.json()) as OrderPayload;
    const menu = await loadMenu();
    const pricingConfig = sanitizePricingConfig(payload.pricingConfig);

    const errors = validateCustomer(
      payload.customer?.name ?? "",
      payload.customer?.phone ?? "",
      payload.customer?.address ?? "",
      payload.customer?.deliveryZone,
      pricingConfig
    );
    if (Object.keys(errors).length) {
      return NextResponse.json({ ok: false, errors }, { status: 400 });
    }

    const lineErrors = validateOrderLines(payload.lines, menu, pricingConfig);
    if (Object.keys(lineErrors).length) {
      return NextResponse.json({ ok: false, errors: lineErrors }, { status: 400 });
    }

    if (payload.paymentMode !== "UPI") {
      return NextResponse.json({ ok: false, errors: { payment: "This endpoint handles UPI payments only." } }, { status: 400 });
    }

    const totals = calculateBill(payload.lines, menu, pricingConfig);
    const amountPaise = toPaise(totals.finalTotal);
    if (amountPaise < 100) {
      return NextResponse.json({ ok: false, errors: { payment: "Order amount must be at least Rs. 1." } }, { status: 400 });
    }

    const orderId = `sm_${payload.customer.phone}_${Date.now()}`.slice(0, 40);
    const origin = request.headers.get("origin") ?? "http://localhost:3000";

    const cfOrder = await createCashfreeOrder({
      orderId,
      amount: totals.finalTotal,
      customerPhone: payload.customer.phone,
      customerName: payload.customer.name,
      returnUrl: `${origin}/payment?order_id={order_id}`,
    });

    return NextResponse.json({
      ok: true,
      paymentSessionId: cfOrder.paymentSessionId,
      cfOrderId: orderId,
      amountPaise,
    });
  } catch (err: any) {
    console.error("Cashfree API Error:", err);
    return NextResponse.json({ ok: false, errors: { payment: "Could not start UPI payment. " + (err.message || "Please retry.") } }, { status: 502 });
  }
}
