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
    customerId,
    customerIdLength: customerId.length,
  };

  const client = serverClient;
  if (!client) return NextResponse.json({ ...results, error: "no supabase client" });

  // 1. Total visible orders (no filter, higher limit)
  const totalRes = await client
    .schema("slicematic")
    .from("orders")
    .select("order_id", { count: "exact", head: true });
  results.totalVisibleOrders = totalRes.count;
  results.totalError = totalRes.error ? { message: totalRes.error.message, code: totalRes.error.code } : null;

  // 2. Filter by customer_id (the broken path)
  const byCustomer = await client
    .schema("slicematic")
    .from("orders")
    .select("order_id, customer_id")
    .eq("customer_id", customerId);
  results.byCustomerIdCount = byCustomer.data?.length ?? 0;
  results.byCustomerIdError = byCustomer.error ? { message: byCustomer.error.message, code: byCustomer.error.code } : null;

  // 3. Filter by known order_id directly
  const byOrderId = await client
    .schema("slicematic")
    .from("orders")
    .select("order_id, customer_id")
    .eq("order_id", "c0b8e22d-b0ee-4a37-87f1-b4ded78ef13c");
  results.byOrderIdCount = byOrderId.data?.length ?? 0;
  results.byOrderIdData = byOrderId.data;
  results.byOrderIdError = byOrderId.error ? { message: byOrderId.error.message, code: byOrderId.error.code } : null;

  // 4. Filter by customer_id cast to text
  const byCustomerText = await client
    .schema("slicematic")
    .from("orders")
    .select("order_id, customer_id")
    .filter("customer_id::text", "eq", customerId);
  results.byCustomerTextCount = byCustomerText.data?.length ?? 0;
  results.byCustomerTextError = byCustomerText.error ? { message: byCustomerText.error.message, code: byCustomerText.error.code } : null;

  // 5. Latest 5 with customer_id values
  const latest = await client
    .schema("slicematic")
    .from("orders")
    .select("order_id, customer_id, order_datetime")
    .order("order_datetime", { ascending: false })
    .limit(5);
  results.latestOrders = (latest.data ?? []).map((r) => ({
    order_id: r.order_id,
    customer_id: r.customer_id,
    matches_js: r.customer_id === customerId,
    customer_id_length: String(r.customer_id).length,
  }));

  return NextResponse.json(results);
}
