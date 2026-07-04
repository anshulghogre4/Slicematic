import { NextResponse } from "next/server";
import { requireAdminSession } from "../../../../../lib/admin-auth";
import { refreshForecastCache } from "../../../../../lib/forecast-service";
import { getSupabaseServerClient } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authError = await requireAdminSession(request);
  if (authError) return authError;

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const ordersResult = await supabase
    .schema("slicematic")
    .from("orders")
    .select("order_datetime, final_amount")
    .order("order_datetime", { ascending: false });

  if (ordersResult.error) {
    return NextResponse.json({ error: "Could not load orders for forecast refresh." }, { status: 500 });
  }

  const orders = (ordersResult.data || []).map((row) => ({
    createdAt: String(row.order_datetime),
    finalTotal: Number(row.final_amount ?? 0)
  }));

  const cache = refreshForecastCache(orders);
  if (!cache) {
    return NextResponse.json(
      { error: "Forecast refresh failed. Ensure Python and scikit-learn are installed locally." },
      { status: 503 }
    );
  }

  return NextResponse.json({
    forecastMeta: {
      model: cache.model,
      features: cache.features,
      rmse: cache.rmse,
      trainedAt: cache.trainedAt,
      orderCount: cache.orderCount,
      bucketCount: cache.bucketCount
    },
    forecast: cache.forecast,
    topPeaks: cache.topPeaks
  });
}
