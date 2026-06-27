import { NextResponse } from "next/server";
import { loadMenu, saveOrder } from "../../../lib/data-service";
import { validateCustomer, validateOrderLines } from "../../../lib/pricing";
import { OrderPayload } from "../../../lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as OrderPayload;
    const menu = await loadMenu();
    const errors = validateCustomer(
      payload.customer?.name ?? "",
      payload.customer?.phone ?? "",
      payload.customer?.address ?? "",
      payload.customer?.deliveryZone
    );
    if (Object.keys(errors).length) {
      return NextResponse.json({ ok: false, errors }, { status: 400 });
    }

    const lineErrors = validateOrderLines(payload.lines, menu);
    if (Object.keys(lineErrors).length) {
      return NextResponse.json({ ok: false, errors: lineErrors }, { status: 400 });
    }

    if (!["Cash", "Card", "UPI"].includes(payload.paymentMode)) {
      return NextResponse.json({ ok: false, errors: { payment: "Choose Cash, Card, or UPI." } }, { status: 400 });
    }

    const order = await saveOrder(payload);
    return NextResponse.json({ ok: true, order });
  } catch (error) {
    return NextResponse.json({ ok: false, errors: { server: "Order could not be saved. Please retry." } }, { status: 500 });
  }
}
