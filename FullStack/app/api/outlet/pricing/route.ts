import { NextResponse } from "next/server";
import { loadOutletPricingConfig } from "../../../../lib/outlet-settings";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET() {
  const pricingConfig = await loadOutletPricingConfig();
  return NextResponse.json({ ok: true, pricingConfig });
}
