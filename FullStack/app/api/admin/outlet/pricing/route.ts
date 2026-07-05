import { NextResponse } from "next/server";
import { requireAdminSession } from "../../../../../lib/admin-auth";
import { loadOutletPricingConfig, saveOutletPricingConfig } from "../../../../../lib/outlet-settings";
import { sanitizePricingConfig } from "../../../../../lib/pricing";
import { PricingConfig } from "../../../../../lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authError = await requireAdminSession(request);
  if (authError) return authError;

  const pricingConfig = await loadOutletPricingConfig();
  return NextResponse.json({ ok: true, pricingConfig });
}

export async function POST(request: Request) {
  const authError = await requireAdminSession(request);
  if (authError) return authError;

  const body = (await request.json()) as { pricingConfig?: unknown };
  const pricingConfig = sanitizePricingConfig(body.pricingConfig as Partial<PricingConfig> | undefined);
  const saved = await saveOutletPricingConfig(pricingConfig);

  if (!saved) {
    return NextResponse.json({ ok: false, error: "Could not save outlet pricing." }, { status: 503 });
  }

  return NextResponse.json({ ok: true, pricingConfig });
}
