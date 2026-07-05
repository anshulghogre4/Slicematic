import { NextResponse } from "next/server";
import { loadMenu } from "../../../../lib/data-service";
import { loadOutletPricingConfig } from "../../../../lib/outlet-settings";
import { calculateBill, validateCustomer, validateOrderLines } from "../../../../lib/pricing";
import { createRazorpayOrder, hasRazorpayEnv, toPaise } from "../../../../lib/razorpay";
import { OrderPayload } from "../../../../lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!hasRazorpayEnv()) {
      return NextResponse.json(
        { ok: false, errors: { payment: "Online payment is not configured. Add Razorpay test keys to enable Card/UPI." } },
        { status: 503 }
      );
    }

    const payload = (await request.json()) as OrderPayload;
    const menu = await loadMenu();
    const pricingConfig = await loadOutletPricingConfig();

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

    if (!["Card", "UPI"].includes(payload.paymentMode)) {
      return NextResponse.json({ ok: false, errors: { payment: "Online payment supports Card or UPI only." } }, { status: 400 });
    }

    const totals = calculateBill(payload.lines, menu, pricingConfig);
    const amountPaise = toPaise(totals.finalTotal);
    if (amountPaise < 100) {
      return NextResponse.json({ ok: false, errors: { payment: "Order amount must be at least Rs. 1." } }, { status: 400 });
    }

    const razorpayOrder = await createRazorpayOrder({
      amountPaise,
      receipt: `sm_${payload.customer.phone}_${Date.now()}`.slice(0, 40),
      notes: { customer_name: payload.customer.name, phone: payload.customer.phone, payment_method: payload.paymentMode }
    });

    return NextResponse.json({
      ok: true,
      razorpayOrderId: razorpayOrder.id,
      amountPaise,
      keyId: process.env.RAZORPAY_KEY_ID,
      prefillName: payload.customer.name,
      prefillPhone: payload.customer.phone
    });
  } catch {
    return NextResponse.json({ ok: false, errors: { payment: "Could not start payment. Please retry." } }, { status: 502 });
  }
}
