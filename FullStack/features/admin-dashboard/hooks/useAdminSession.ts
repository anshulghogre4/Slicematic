"use client";
/**
 * useAdminSession — admin data: summary, ops briefing, CSV export, filters.
 * Depends on adminAccessToken from useAdminAuth.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { buildSeedSummary } from "../../../lib/seed-data";
import type { AdminSummary } from "../../../lib/types";

type OpsBriefing = {
  briefing: string;
  staffing: string;
  prepList: string[];
  revenueWatch: string;
  actions: Array<{ title: string; detail: string; priority: "High" | "Medium" | "Low" }>;
};

/** idle → loading → live | degraded | empty | error */
export type OpsBriefingStatus = "idle" | "loading" | "live" | "degraded" | "empty" | "error";

function hasBriefingBody(briefing: OpsBriefing | null | undefined): briefing is OpsBriefing {
  return Boolean(briefing?.briefing?.trim());
}

export function useAdminSession(
  adminAccessToken: string,
  adminLoggedIn: boolean
) {
  const [adminSummary, setAdminSummary] = useState<AdminSummary>(buildSeedSummary());
  const [summaryStatus, setSummaryStatus] = useState<"loading" | "live" | "error">("loading");
  const [isRefreshingSummary, setIsRefreshingSummary] = useState(false);
  const hasLiveSummaryRef = useRef(false);
  const [adminPaymentFilter, setAdminPaymentFilter] = useState("All");
  const [adminDateFilter, setAdminDateFilter] = useState("");
  const [opsBriefing, setOpsBriefing] = useState<OpsBriefing | null>(null);
  const [opsStatus, setOpsStatus] = useState<OpsBriefingStatus>("idle");
  const opsLoading = opsStatus === "loading";

  function authHeader(): HeadersInit | undefined {
    const token = adminAccessToken || (adminLoggedIn ? "demo-bypass" : "");
    return token ? { authorization: `Bearer ${token}` } : undefined;
  }

  const refreshAdminSummary = useCallback(
    async (token = adminAccessToken) => {
      setIsRefreshingSummary(true);
      if (!hasLiveSummaryRef.current) setSummaryStatus("loading");
      try {
        const tkn = token || (adminLoggedIn ? "demo-bypass" : "");
        const response = await fetch("/api/admin/orders", {
          headers: tkn ? { authorization: `Bearer ${tkn}` } : undefined,
        });
        if (!response.ok) throw new Error("Admin summary unavailable");
        setAdminSummary(await response.json());
        hasLiveSummaryRef.current = true;
        setSummaryStatus("live");
      } catch {
        if (!hasLiveSummaryRef.current) {
          setAdminSummary(buildSeedSummary());
        }
        setSummaryStatus("error");
      } finally {
        setIsRefreshingSummary(false);
      }
    },
    [adminAccessToken, adminLoggedIn]
  );

  const loadOpsBriefing = useCallback(
    async (token = adminAccessToken) => {
      setOpsStatus("loading");
      try {
        const tkn = token || (adminLoggedIn ? "demo-bypass" : "");
        const response = await fetch("/api/ai/ops-briefing", {
          headers: tkn ? { authorization: `Bearer ${tkn}` } : undefined,
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.ok) {
          setOpsBriefing(null);
          setOpsStatus("error");
          return;
        }
        // API returns source: "openrouter" | "fallback" (missing key or upstream fail).
        // Never surface fallback paragraphs as AI insights.
        if (result.source === "fallback") {
          setOpsBriefing(null);
          setOpsStatus("degraded");
          return;
        }
        const briefing = result.briefing as OpsBriefing | null;
        if (!hasBriefingBody(briefing)) {
          setOpsBriefing(null);
          setOpsStatus("empty");
          return;
        }
        setOpsBriefing(briefing);
        setOpsStatus("live");
      } catch {
        setOpsBriefing(null);
        setOpsStatus("error");
      }
    },
    [adminAccessToken, adminLoggedIn]
  );

  const downloadCsv = useCallback(async () => {
    try {
      const params = new URLSearchParams({ format: "csv" });
      if (adminPaymentFilter !== "All") params.set("payment", adminPaymentFilter);
      if (adminDateFilter) params.set("date", adminDateFilter);
      const response = await fetch(`/api/admin/orders?${params}`, {
        headers: authHeader(),
      });
      if (!response.ok) throw new Error("CSV export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "slicematic-orders.csv";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      /* caller handles toast */
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminPaymentFilter, adminDateFilter, adminAccessToken, adminLoggedIn]);

  const filteredOrders = useMemo(
    () =>
      adminSummary.recentOrders.filter((order) => {
        const matchesPayment =
          adminPaymentFilter === "All" || order.paymentMode === adminPaymentFilter;
        const matchesDate =
          !adminDateFilter || order.createdAt.slice(0, 10) === adminDateFilter;
        return matchesPayment && matchesDate;
      }),
    [adminSummary.recentOrders, adminPaymentFilter, adminDateFilter]
  );

  return {
    adminSummary,
    summaryStatus,
    isRefreshingSummary,
    adminPaymentFilter,
    adminDateFilter,
    opsBriefing,
    opsLoading,
    opsStatus,
    filteredOrders,
    setAdminPaymentFilter,
    setAdminDateFilter,
    refreshAdminSummary,
    loadOpsBriefing,
    downloadCsv,
  };
}
