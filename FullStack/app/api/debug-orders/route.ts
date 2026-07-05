import { NextResponse } from "next/server";
import { getSupabaseServerClient, getSupabaseAdminClient } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

const ORDER_HISTORY_SELECT =
  "order_id, customer_id, order_datetime, order_status, payment_method, subtotal_amount, discount_amount, tax_amount, final_amount";

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
  };

  const client = serverClient;
  if (!client) return NextResponse.json({ ...results, error: "no supabase client" });

  // Step A: exact query used by fetchOrderHistoryByCustomerId (with limit)
  const stepA = await client
    .schema("slicematic")
    .from("orders")
    .select(ORDER_HISTORY_SELECT)
    .eq("customer_id", customerId)
    .order("order_datetime", { ascending: false })
    .limit(20);
  results.stepA_count = stepA.data?.length ?? 0;
  results.stepA_error = stepA.error ? { message: stepA.error.message, code: stepA.error.code } : null;
  results.stepA_data = stepA.data;

  // Step B: same select, no limit (to rule out limit cutting data)
  const stepB = await client
    .schema("slicematic")
    .from("orders")
    .select(ORDER_HISTORY_SELECT)
    .eq("customer_id", customerId);
  results.stepB_count = stepB.data?.length ?? 0;
  results.stepB_error = stepB.error ? { message: stepB.error.message, code: stepB.error.code } : null;

  // Step C: minimal select (same as debug that worked)
  const stepC = await client
    .schema("slicematic")
    .from("orders")
    .select("order_id, customer_id")
    .eq("customer_id", customerId);
  results.stepC_count = stepC.data?.length ?? 0;
  results.stepC_error = stepC.error ? { message: stepC.error.message, code: stepC.error.code } : null;
  results.stepC_data = stepC.data;

  // Step D: total orders visible (unfiltered)
  const stepD = await client
    .schema("slicematic")
    .from("orders")
    .select("order_id", { count: "exact", head: true });
  results.stepD_total = stepD.count;
  results.stepD_error = stepD.error ? { message: stepD.error.message, code: stepD.error.code } : null;

  // Step E: if stepC found an order, fetch it individually by order_id with full select
  const customerOrderId = (stepC.data ?? [])[0]?.order_id;
  if (customerOrderId) {
    const stepE = await client
      .schema("slicematic")
      .from("orders")
      .select(ORDER_HISTORY_SELECT)
      .eq("order_id", customerOrderId)
      .maybeSingle();
    results.stepE_byOrderId = stepE.data;
    results.stepE_error = stepE.error ? { message: stepE.error.message, code: stepE.error.code } : null;
  }

  return NextResponse.json(results);
}
