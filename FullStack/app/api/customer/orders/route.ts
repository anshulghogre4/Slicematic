import { NextResponse } from "next/server";
import { loadCustomerOrderHistoryByCustomerId } from "../../../../lib/data-service";
import { hasSupabaseEnv, hasSupabaseAdminEnv } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";

const CUSTOMER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customer_id")?.trim() ?? "";

    if (!customerId) {
      return NextResponse.json({ ok: false, error: "customer_id is required" }, { status: 400 });
    }

    if (!CUSTOMER_ID_RE.test(customerId)) {
      return NextResponse.json({ ok: false, error: "customer_id must be a valid UUID" }, { status: 400 });
    }

    if (!hasSupabaseEnv()) {
      return NextResponse.json(
        { ok: false, error: "Supabase is not configured — order history unavailable." },
        { status: 503 }
      );
    }

    // Log which Supabase key is being used (for debugging Vercel vs local)
    const usingAdmin = hasSupabaseAdminEnv();
    console.log("[customer/orders] customer_id:", customerId, "usingAdminKey:", usingAdmin);

    const { orders, customer_id } = await loadCustomerOrderHistoryByCustomerId(customerId);

    console.log("[customer/orders] result:", { orderCount: orders.length, hasCustomerId: !!customer_id });

    return NextResponse.json({ ok: true, orders, customer_id });
  } catch (error: unknown) {
    console.error("[customer/orders] API error:", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
