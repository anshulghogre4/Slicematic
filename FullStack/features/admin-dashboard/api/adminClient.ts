import { fetchJson } from "../../../lib/api/fetchJson";
import type { AdminSummary } from "../../../lib/types";

export async function refreshAdminForecast(authHeaders?: Record<string, string>) {
  return fetchJson<{
    forecast: AdminSummary["forecast"];
    topPeaks?: AdminSummary["topPeaks"];
    forecastMeta?: AdminSummary["forecastMeta"];
  }>("/api/admin/forecast/refresh", {
    method: "POST",
    authHeaders,
  });
}

export async function fetchOpsBriefing(authHeaders?: Record<string, string>) {
  return fetchJson<{
    briefing: string;
    staffing: string;
    prepList: string[];
    revenueWatch: string;
    actions: Array<{ title: string; detail: string; priority: "High" | "Medium" | "Low" }>;
  }>("/api/ai/ops-briefing", {
    method: "POST",
    authHeaders,
  });
}
