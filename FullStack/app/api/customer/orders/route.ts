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

    // Fetch the orders for this customer directly by customer_id
    const { data: ordersData, error: ordersError } = await supabase
      .schema("slicematic")
      .from("orders")
      .select(`
        order_id,
        order_datetime,
        order_status,
        payment_method,
        subtotal_amount,
        discount_amount,
        tax_amount,
        final_amount,
        order_item (
          quantity,
          pizza_price,
          line_total,
          pizza:pizza_type_id(pizza_name),
          base:base_id(base_name),
          size:size_id(size_name)
        )
      `)
      .eq("customer_id", resolvedCustomerId)
      .order("order_datetime", { ascending: false })
      .limit(20);

    if (ordersError) {
      console.error("Orders lookup error:", ordersError);
      return NextResponse.json({ ok: false, error: "Error looking up orders" }, { status: 500 });
    }

    // Format the orders
    const formattedOrders = (ordersData || []).map((row: any) => {
       const lines = (row.order_item || []).map((item: any) => {
         const pizza = Array.isArray(item.pizza) ? item.pizza[0] : item.pizza;
         const base = Array.isArray(item.base) ? item.base[0] : item.base;
         const size = Array.isArray(item.size) ? item.size[0] : item.size;
         return {
           pizzaName: pizza?.pizza_name || "Unknown Pizza",
           baseName: base?.base_name || "Unknown Base",
           sizeName: size?.size_name || "Regular",
           quantity: item.quantity,
           lineTotal: item.line_total
         };
       });

       return {
         id: row.order_id,
         createdAt: row.order_datetime,
         paymentMode: row.payment_method,
         status: row.order_status,
         subtotal: row.subtotal_amount,
         discount: row.discount_amount,
         gst: row.tax_amount,
         finalTotal: row.final_amount,
         lines
       };
    });

    return NextResponse.json({ ok: true, orders: formattedOrders, customer_id: resolvedCustomerId });

  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
