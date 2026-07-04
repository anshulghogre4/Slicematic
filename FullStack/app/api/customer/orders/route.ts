import { NextResponse } from "next/server";
import { loadCustomerOrderHistory } from "../../../../lib/data-service";
import { hasSupabaseEnv } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customer_id");
    const identifier = searchParams.get("identifier");
    const phone = searchParams.get("phone");

    if (!customerId && !identifier && !phone) {
      return NextResponse.json({ ok: false, error: "customer_id or identifier (mobile or email) is required" }, { status: 400 });
    }

    if (!hasSupabaseEnv()) {
      return NextResponse.json(
        { ok: false, error: "Supabase is not configured — order history unavailable." },
        { status: 503 }
      );
    }

    const { orders, customer_id } = await loadCustomerOrderHistory({ customerId, identifier, phone });
    return NextResponse.json({ ok: true, orders, customer_id });
  } catch (error: unknown) {
    console.error("API error:", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
