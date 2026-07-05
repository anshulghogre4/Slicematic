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

  // Step A: exact broken query (order + limit together)
  const stepA = await client
    .schema("slicematic")
    .from("orders")
    .select(ORDER_HISTORY_SELECT)
    .eq("customer_id", customerId)
    .order("order_datetime", { ascending: false })
    .limit(20);
  results.stepA_orderAndLimit = stepA.data?.length ?? 0;
  results.stepA_error = stepA.error?.message ?? null;

  // Step B: limit only (no order)
  const stepB = await client
    .schema("slicematic")
    .from("orders")
    .select(ORDER_HISTORY_SELECT)
    .eq("customer_id", customerId)
    .limit(20);
  results.stepB_limitOnly = stepB.data?.length ?? 0;
  results.stepB_error = stepB.error?.message ?? null;

  // Step C: order only (no limit)
  const stepC = await client
    .schema("slicematic")
    .from("orders")
    .select(ORDER_HISTORY_SELECT)
    .eq("customer_id", customerId)
    .order("order_datetime", { ascending: false });
  results.stepC_orderOnly = stepC.data?.length ?? 0;
  results.stepC_error = stepC.error?.message ?? null;

  // Step D: no order, no limit (baseline)
  const stepD = await client
    .schema("slicematic")
    .from("orders")
    .select(ORDER_HISTORY_SELECT)
    .eq("customer_id", customerId);
  results.stepD_baseline = stepD.data?.length ?? 0;
  results.stepD_error = stepD.error?.message ?? null;

  // Step E: range(0,19) explicitly (what supabase-js sends for limit)
  const stepE = await client
    .schema("slicematic")
    .from("orders")
    .select(ORDER_HISTORY_SELECT)
    .eq("customer_id", customerId)
    .order("order_datetime", { ascending: false })
    .range(0, 99);
  results.stepE_range0to99 = stepE.data?.length ?? 0;
  results.stepE_error = stepE.error?.message ?? null;

  // Step F: total orders in DB
  const stepF = await client
    .schema("slicematic")
    .from("orders")
    .select("order_id", { count: "exact", head: true });
  results.stepF_total = stepF.count ?? 0;

  return NextResponse.json(results);
}
