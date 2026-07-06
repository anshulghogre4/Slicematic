import { NextResponse } from "next/server";
import { loadMenu, saveOrder } from "../../../lib/data-service";
import { loadOutletPricingConfig } from "../../../lib/outlet-settings";
import { validateCustomer, validateOrderLines } from "../../../lib/pricing";
import { OrderPayload } from "../../../lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
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

    if (!["Cash", "Card", "UPI"].includes(payload.paymentMode)) {
      return NextResponse.json({ ok: false, errors: { payment: "Choose Cash, Card, or UPI." } }, { status: 400 });
    }

    if (!pricingConfig.guestCashAllowed && (payload.customerMode ?? "guest") === "guest" && payload.paymentMode === "Cash") {
      return NextResponse.json({ ok: false, errors: { payment: "Guest checkout is online payment only. Sign in to use Cash." } }, { status: 400 });
    }

    const order = await saveOrder({ ...payload, pricingConfig });
    return NextResponse.json({ ok: true, order });
  } catch (error) {
    return NextResponse.json({ ok: false, errors: { server: "Order could not be saved. Please retry." } }, { status: 500 });
  }
}
