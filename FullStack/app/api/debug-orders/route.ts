import { NextResponse } from "next/server";
import { getSupabaseServerClient, getSupabaseAdminClient } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customer_id")?.trim() ?? "";
  if (!customerId) return NextResponse.json({ error: "customer_id required" }, { status: 400 });

  const adminClient = getSupabaseAdminClient();
  const serverClient = getSupabaseServerClient();

  const results: Record<string, unknown> = {
    hasAdminClient: !!adminClient,
    hasServerClient: !!serverClient,
  };

  const client = serverClient;
  if (!client) return NextResponse.json({ ...results, error: "no supabase client" });

  const ordersRes = await client
    .schema("slicematic")
    .from("orders")
    .select("order_id, customer_id, order_datetime, order_status, payment_method, subtotal_amount, discount_amount, tax_amount, final_amount")
    .eq("customer_id", customerId)
    .order("order_datetime", { ascending: false })
    .limit(20);

  results.ordersCount = ordersRes.data?.length ?? 0;
  results.ordersError = ordersRes.error ? { message: ordersRes.error.message, code: ordersRes.error.code } : null;

  if (ordersRes.data?.length) {
    const orderIds = ordersRes.data.map((r) => r.order_id);
    const itemsRes = await client
      .schema("slicematic")
      .from("order_item")
      .select("order_id, pizza_type_id, base_id, size_id, quantity, line_total")
      .in("order_id", orderIds);

    results.itemsCount = itemsRes.data?.length ?? 0;
    results.itemsError = itemsRes.error ? { message: itemsRes.error.message, code: itemsRes.error.code } : null;
  }

  return NextResponse.json(results);
}
