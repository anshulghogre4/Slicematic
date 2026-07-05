import { NextResponse } from "next/server";
import { getSupabaseServerClient, getSupabaseAdminClient } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

const ORDER_HISTORY_SELECT =
  "order_id, customer_id, order_datetime, order_status, payment_method, subtotal_amount, discount_amount, tax_amount, final_amount";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customer_id")?.trim() ?? "";
  if (!customerId) return NextResponse.json({ error: "customer_id required" }, { status: 400 });

  const client = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!client) return NextResponse.json({ error: "no supabase client" });

  const results: Record<string, unknown> = { customerId };

  // 1. Does this customer exist in the customer table?
  const customerCheck = await client
    .schema("slicematic")
    .from("customer")
    .select("customer_id, first_name, last_name, mobile_number, email")
    .eq("customer_id", customerId)
    .maybeSingle();
  results.customerExists = !!customerCheck.data;
  results.customerData = customerCheck.data;
  results.customerError = customerCheck.error?.message ?? null;

  // 2. Baseline: orders for this customer (no order, no limit — current production query)
  const baseline = await client
    .schema("slicematic")
    .from("orders")
    .select(ORDER_HISTORY_SELECT)
    .eq("customer_id", customerId);
  results.baselineCount = baseline.data?.length ?? 0;
  results.baselineError = baseline.error?.message ?? null;
  results.baselineData = baseline.data;

  // 3. What stepA (order+limit) actually returns — show customer_ids to confirm mismatch
  const stepA = await client
    .schema("slicematic")
    .from("orders")
    .select("order_id, customer_id, order_datetime")
    .eq("customer_id", customerId)
    .order("order_datetime", { ascending: false })
    .limit(20);
  results.stepA_count = stepA.data?.length ?? 0;
  results.stepA_data = stepA.data; // are these for the right customer?

  // 4. Latest 3 orders in the DB — to find the duplicate customer's order
  const latest = await client
    .schema("slicematic")
    .from("orders")
    .select("order_id, customer_id, order_datetime")
    .order("order_datetime", { ascending: false })
    .limit(3);
  results.latestOrders = latest.data;

  // 5. If customer exists by phone: look up by mobile_number from customerData
  const phone = customerCheck.data?.mobile_number;
  if (phone) {
    const byPhone = await client
      .schema("slicematic")
      .from("customer")
      .select("customer_id, first_name")
      .eq("mobile_number", phone);
    results.customersByPhone = byPhone.data; // shows if a duplicate customer was created
  }

  return NextResponse.json(results);
}
