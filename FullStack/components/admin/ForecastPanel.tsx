"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AdminSummary } from "../../lib/types";

function formatTrainedAt(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "unknown";
  return new Date(parsed).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
}

export default function ForecastPanel({ summary }: { summary: AdminSummary }) {
  const meta = summary.forecastMeta;
  const topPeaks =
    summary.topPeaks?.length
      ? summary.topPeaks
      : [...summary.forecast].sort((a, b) => b.predictedOrders - a.predictedOrders).slice(0, 3);

  return (
    <section className="admin-card forecast-card">
      <div>
        <p className="eyebrow">Demand intelligence</p>
        <h2>Next 7 peak windows</h2>
        <p>
          scikit-learn RandomForestRegressor trained on Supabase hourly order history. Use this for staffing, rider planning, and prep batching.
        </p>
      </div>
      <ResponsiveContainer width="100%" height={310}>
        <AreaChart data={summary.forecast}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Area dataKey="predictedOrders" fill="#2f6f98" stroke="#2f6f98" />
        </AreaChart>
      </ResponsiveContainer>
      <div className="forecast-list">
        {topPeaks.map((item) => (
          <div key={item.label}>
            <strong>{item.label}</strong>
            <span>
              {item.predictedOrders} orders / {Math.round(item.confidence * 100)}% confidence
            </span>
          </div>
        ))}
      </div>
      <div className="forecast-model-card">
        <p className="eyebrow">Model documentation</p>
        <p><strong>Model:</strong> {meta?.model ?? "RandomForestRegressor"} (scikit-learn)</p>
        <p><strong>Features:</strong> {(meta?.features ?? ["weekday", "hour", "is_weekend", "hourly_revenue"]).join(", ")}</p>
        <p>
          <strong>Metric:</strong>{" "}
          {meta?.rmse != null ? `RMSE = ${meta.rmse.toFixed(2)} orders/hour` : "RMSE unavailable (insufficient hourly buckets)"}
        </p>
        <p>
          <strong>Last trained:</strong> {formatTrainedAt(meta?.trainedAt ?? "")} on {meta?.orderCount ?? summary.orderCount} orders ({meta?.bucketCount ?? 0} hourly buckets)
        </p>
      </div>
    </section>
  );
}
