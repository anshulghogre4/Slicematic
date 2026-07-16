"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button, Skeleton, StatusPill } from "../ui";
import type { AdminSummary } from "../../lib/types";

type ForecastPanelProps = {
  summary: AdminSummary;
  authHeaders?: Record<string, string>;
};

type ForecastRefreshState = "idle" | "refreshing" | "succeeded" | "failed";

function formatTrainedAt(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "unknown";
  return new Date(parsed).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
}

export default function ForecastPanel({ summary, authHeaders }: ForecastPanelProps) {
  const [displaySummary, setDisplaySummary] = useState(summary);
  const [refreshState, setRefreshState] = useState<ForecastRefreshState>("idle");
  const [refreshMessage, setRefreshMessage] = useState("");

  useEffect(() => {
    setDisplaySummary(summary);
  }, [summary]);

  const meta = displaySummary.forecastMeta;
  const topPeaks =
    displaySummary.topPeaks?.length
      ? displaySummary.topPeaks
      : [...displaySummary.forecast].sort((a, b) => b.predictedOrders - a.predictedOrders).slice(0, 3);
  const hasForecast = displaySummary.forecast.length > 0;
  const trainedLabel = useMemo(() => formatTrainedAt(meta?.trainedAt ?? ""), [meta?.trainedAt]);

  const statusTone =
    refreshState === "succeeded" ? "success" :
    refreshState === "failed" ? "danger" :
    refreshState === "refreshing" ? "info" :
    "neutral";
  const statusLabel =
    refreshState === "succeeded" ? "Updated" :
    refreshState === "failed" ? "Using previous forecast" :
    refreshState === "refreshing" ? "Training" :
    "Ready";

  async function refreshForecast() {
    setRefreshState("refreshing");
    setRefreshMessage("Training from the latest available order history. The last successful forecast stays visible.");

    try {
      const response = await fetch("/api/admin/forecast/refresh", {
        method: "POST",
        headers: authHeaders,
      });
      const payload = await response.json();

      if (!response.ok) {
        setRefreshState("failed");
        setRefreshMessage(payload.error ?? "Forecast refresh failed. Keeping the previous successful run.");
        return;
      }

      setDisplaySummary((current) => ({
        ...current,
        forecast: payload.forecast ?? current.forecast,
        topPeaks: payload.topPeaks ?? current.topPeaks,
        forecastMeta: payload.forecastMeta ?? current.forecastMeta,
      }));
      setRefreshState("succeeded");
      setRefreshMessage("Forecast refreshed from current orders. Review the new peaks before staffing.");
    } catch {
      setRefreshState("failed");
      setRefreshMessage("Forecast refresh failed. Check Python/scikit-learn locally or the future forecast service health.");
    }
  }

  return (
    <section className="admin-card forecast-card">
      <div className="forecast-header">
        <div>
          <p className="eyebrow">Demand forecast</p>
          <h2>Next 7 days - predicted order volume</h2>
          <p>
            Lightweight scikit-learn model trained on Supabase order history. Predicts orders per hour using day of week and hour of day.
          </p>
        </div>
        <div className="forecast-actions">
          <StatusPill tone={statusTone}>{statusLabel}</StatusPill>
          <Button variant="primary" onClick={refreshForecast} isLoading={refreshState === "refreshing"}>
            {refreshState === "refreshing" ? "Refreshing forecast" : "Refresh forecast"}
          </Button>
        </div>
      </div>

      {refreshMessage && <p className="forecast-refresh-status" role="status" aria-live="polite">{refreshMessage}</p>}

      {hasForecast ? (
        <div className={refreshState === "refreshing" ? "forecast-chart is-refreshing" : "forecast-chart"} aria-busy={refreshState === "refreshing"}>
          <ResponsiveContainer width="100%" height={310}>
            <AreaChart data={displaySummary.forecast}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" interval="preserveStartEnd" angle={-35} textAnchor="end" height={70} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Area dataKey="predictedOrders" fill="#2f6f98" stroke="#2f6f98" name="Predicted orders" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="sui-skeleton-stack" aria-label="Forecast loading preview">
          <Skeleton variant="block" style={{ minHeight: 220 }} />
          <Skeleton />
          <Skeleton />
        </div>
      )}

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
          {meta?.rmse != null ? `RMSE = ${meta.rmse.toFixed(2)} orders/hour (22% hold-out)` : "RMSE unavailable - need 20+ hourly buckets"}
        </p>
        <p>
          <strong>Trained:</strong> {trainedLabel} on {meta?.orderCount ?? displaySummary.orderCount} orders ({meta?.bucketCount ?? 0} hourly buckets)
        </p>
      </div>
    </section>
  );
}
