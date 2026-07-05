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
        <p className="eyebrow">Demand forecast</p>
        <h2>Next 7 days — predicted order volume</h2>
        <p>
          Lightweight scikit-learn model trained on Supabase order history. Predicts orders per hour using day of week and hour of day.
        </p>
      </div>
      <ResponsiveContainer width="100%" height={310}>
        <AreaChart data={summary.forecast}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" interval="preserveStartEnd" angle={-35} textAnchor="end" height={70} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Area dataKey="predictedOrders" fill="#2f6f98" stroke="#2f6f98" name="Predicted orders" />
        </AreaChart>
      </ResponsiveContainer>
      <div className="forecast-peaks">
        <p className="eyebrow">Top 3 peak hours (next 7 days)</p>
        <div className="forecast-list">
          {topPeaks.map((item) => (
            <div key={item.label}>
              <strong>{item.label}</strong>
              <span>{item.predictedOrders} predicted orders</span>
            </div>
          ))}
        </div>
      </div>
      <div className="forecast-model-card">
        <p className="eyebrow">Model documentation</p>
        <p><strong>Model:</strong> {meta?.model ?? "RandomForestRegressor"} (scikit-learn)</p>
        <p><strong>Features:</strong> {(meta?.features ?? ["weekday", "hour"]).join(", ")}</p>
        <p>
          <strong>Evaluation:</strong>{" "}
          {meta?.rmse != null ? `RMSE = ${meta.rmse.toFixed(2)} orders/hour (22% hold-out)` : "RMSE unavailable — need 20+ hourly buckets"}
        </p>
        <p>
          <strong>Trained:</strong> {formatTrainedAt(meta?.trainedAt ?? "")} on {meta?.orderCount ?? summary.orderCount} orders ({meta?.bucketCount ?? 0} hourly buckets)
        </p>
      </div>
    </section>
  );
}
