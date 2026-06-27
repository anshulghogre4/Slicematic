import { NextResponse } from "next/server";
import { loadAdminSummary } from "../../../../lib/data-service";
import { getSupabaseServerClient, hasSupabaseAdminEnv } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authError = await requireAdminSession(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const format = url.searchParams.get("format");
  const summary = await loadAdminSummary();

  if (format === "csv") {
    const header = "order_id,created_at,customer_name,phone,payment_mode,status,subtotal,discount,gst,final_total";
    const rows = summary.recentOrders.map((order) => [
      order.id,
      order.createdAt,
      order.customerName,
      order.phone,
      order.paymentMode,
      order.status,
      order.subtotal,
      order.discount,
      order.gst,
      order.finalTotal
    ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","));
    return new Response([header, ...rows].join("\n"), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": "attachment; filename=slicematic-orders.csv"
      }
    });
  }

  return NextResponse.json(summary);
}

async function requireAdminSession(request: Request) {
  if (!hasSupabaseAdminEnv()) return null;

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 503 });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return NextResponse.json({ error: "Invalid or expired admin session." }, { status: 401 });
  }

  return null;
}
