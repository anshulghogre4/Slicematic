import { NextResponse } from "next/server";
import { loadMenu, saveOrder } from "../../../../lib/data-service";
import { calculateBill, sanitizePricingConfig, validateCustomer, validateOrderLines } from "../../../../lib/pricing";
import { toPaise, verifySignature } from "../../../../lib/razorpay";
import { OrderPayload } from "../../../../lib/types";

export const dynamic = "force-dynamic";

type VerifyBody = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  amountPaise: number;
  payload: OrderPayload;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyBody;

    if (!verifySignature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature)) {
      return NextResponse.json({ ok: false, errors: { payment: "Payment verification failed." } }, { status: 400 });
    }

    const menu = await loadMenu();
    const pricingConfig = sanitizePricingConfig(body.payload?.pricingConfig);

    const customerErrors = validateCustomer(
      body.payload.customer?.name ?? "",
      body.payload.customer?.phone ?? "",
      body.payload.customer?.address ?? "",
      body.payload.customer?.deliveryZone,
      pricingConfig
    );
    const lineErrors = validateOrderLines(body.payload.lines, menu, pricingConfig);
    if (Object.keys(customerErrors).length || Object.keys(lineErrors).length) {
      return NextResponse.json({ ok: false, errors: { ...customerErrors, ...lineErrors } }, { status: 400 });
    }

    const totals = calculateBill(body.payload.lines, menu, pricingConfig);
    if (toPaise(totals.finalTotal) !== Number(body.amountPaise)) {
      return NextResponse.json({ ok: false, errors: { payment: "Payment amount mismatch. Please retry." } }, { status: 400 });
    }

    const order = await saveOrder(
      { ...body.payload, pricingConfig },
      { razorpayOrderId: body.razorpay_order_id, razorpayPaymentId: body.razorpay_payment_id, paymentStatus: "paid" }
    );

    return NextResponse.json({ ok: true, order });
  } catch {
    return NextResponse.json({ ok: false, errors: { payment: "Could not confirm payment. Please retry." } }, { status: 500 });
  }
}
