import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customer_id");
    const identifier = searchParams.get("identifier");

    if (!customerId && !identifier) {
      return NextResponse.json({ ok: false, error: "customer_id or identifier (mobile or email) is required" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
       return NextResponse.json({ ok: false, error: "Supabase client not configured" }, { status: 500 });
    }

    let resolvedCustomerId: string | null = customerId;

    // If customer_id not provided, look it up by email or phone
    if (!resolvedCustomerId && identifier) {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
      const queryField = isEmail ? "email" : "mobile_number";

      const { data: customerData, error: customerError } = await supabase
        .schema("slicematic")
        .from("customer")
        .select("customer_id")
        .eq(queryField, identifier)
        .maybeSingle();

      if (customerError) {
        console.error("Customer lookup error:", customerError);
        return NextResponse.json({ ok: false, error: "Error looking up customer" }, { status: 500 });
      }

      resolvedCustomerId = customerData?.customer_id ?? null;
    }

    if (!resolvedCustomerId) {
      return NextResponse.json({ ok: true, orders: [], customer_id: null });
    }

    // Fetch orders first (without nested joins to avoid RLS/PostgREST issues)
    const { data: ordersData, error: ordersError } = await supabase
      .schema("slicematic")
      .from("orders")
      .select("order_id, order_datetime, order_status, payment_method, subtotal_amount, discount_amount, tax_amount, final_amount")
      .eq("customer_id", resolvedCustomerId)
      .order("order_datetime", { ascending: false })
      .limit(20);

    if (ordersError) {
      console.error("Orders lookup error:", ordersError);
      return NextResponse.json({ ok: false, error: "Error looking up orders: " + ordersError.message }, { status: 500 });
    }

    if (!ordersData || ordersData.length === 0) {
      return NextResponse.json({ ok: true, orders: [], customer_id: resolvedCustomerId });
    }

    // Fetch order items separately for all order IDs
    const orderIds = ordersData.map((o: any) => o.order_id);
    const { data: itemsData, error: itemsError } = await supabase
      .schema("slicematic")
      .from("order_item")
      .select("order_item_id, order_id, pizza_type_id, base_id, size_id, quantity, pizza_price, line_total")
      .in("order_id", orderIds);

    if (itemsError) {
      console.error("Order items lookup error:", itemsError);
      // Don't fail — return orders without line items
    }

    // Fetch pizza names, base names, and size names separately
    const pizzaIds = [...new Set((itemsData || []).map((i: any) => i.pizza_type_id))];
    const baseIds = [...new Set((itemsData || []).map((i: any) => i.base_id))];
    const sizeIds = [...new Set((itemsData || []).map((i: any) => i.size_id))];

    const [pizzasRes, basesRes, sizesRes] = await Promise.all([
      pizzaIds.length ? supabase.schema("slicematic").from("pizza_types").select("pizza_type_id, pizza_name").in("pizza_type_id", pizzaIds) : Promise.resolve({ data: [], error: null }),
      baseIds.length ? supabase.schema("slicematic").from("pizza_bases").select("base_id, base_name").in("base_id", baseIds) : Promise.resolve({ data: [], error: null }),
      sizeIds.length ? supabase.schema("slicematic").from("pizza_sizes").select("size_id, size_name").in("size_id", sizeIds) : Promise.resolve({ data: [], error: null }),
    ]);

    const pizzaMap = new Map((pizzasRes.data || []).map((p: any) => [p.pizza_type_id, p.pizza_name]));
    const baseMap = new Map((basesRes.data || []).map((b: any) => [b.base_id, b.base_name]));
    const sizeMap = new Map((sizesRes.data || []).map((s: any) => [s.size_id, s.size_name]));

    // Group items by order_id
    const itemsByOrder = new Map<string, any[]>();
    for (const item of (itemsData || [])) {
      const arr = itemsByOrder.get(item.order_id) || [];
      arr.push({
        pizzaName: pizzaMap.get(item.pizza_type_id) || "Unknown Pizza",
        baseName: baseMap.get(item.base_id) || "Unknown Base",
        sizeName: sizeMap.get(item.size_id) || "Regular",
        quantity: item.quantity,
        lineTotal: item.line_total
      });
      itemsByOrder.set(item.order_id, arr);
    }

    // Format the orders
    const formattedOrders = ordersData.map((row: any) => {
       return {
         id: row.order_id,
         createdAt: row.order_datetime,
         paymentMode: row.payment_method,
         status: row.order_status,
         subtotal: row.subtotal_amount,
         discount: row.discount_amount,
         gst: row.tax_amount,
         finalTotal: row.final_amount,
         lines: itemsByOrder.get(row.order_id) || []
       };
    });

    return NextResponse.json({ ok: true, orders: formattedOrders, customer_id: resolvedCustomerId });

  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
