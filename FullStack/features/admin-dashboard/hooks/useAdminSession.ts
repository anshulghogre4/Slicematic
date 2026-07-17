"use client";
/**
 * useAdminSession — admin data: summary, ops briefing, CSV export, filters.
 * Depends on adminAccessToken from useAdminAuth.
 */

import { useCallback, useMemo, useState } from "react";
import { buildSeedSummary } from "../../../lib/seed-data";
import type { AdminSummary } from "../../../lib/types";

type OpsBriefing = {
  briefing: string;
  staffing: string;
  prepList: string[];
  revenueWatch: string;
  actions: Array<{ title: string; detail: string; priority: "High" | "Medium" | "Low" }>;
};

export function useAdminSession(
  adminAccessToken: string,
  adminLoggedIn: boolean
) {
  const [adminSummary, setAdminSummary] = useState<AdminSummary>(buildSeedSummary());
  const [adminPaymentFilter, setAdminPaymentFilter] = useState("All");
  const [adminDateFilter, setAdminDateFilter] = useState("");
  const [opsBriefing, setOpsBriefing] = useState<OpsBriefing | null>(null);
  const [opsLoading, setOpsLoading] = useState(false);

  function authHeader(): HeadersInit | undefined {
    const token = adminAccessToken || (adminLoggedIn ? "demo-bypass" : "");
    return token ? { authorization: `Bearer ${token}` } : undefined;
  }

  const refreshAdminSummary = useCallback(
    async (token = adminAccessToken) => {
      try {
        const tkn = token || (adminLoggedIn ? "demo-bypass" : "");
        const response = await fetch("/api/admin/orders", {
          headers: tkn ? { authorization: `Bearer ${tkn}` } : undefined,
        });
        if (!response.ok) throw new Error("Admin summary unavailable");
        setAdminSummary(await response.json());
      } catch {
        setAdminSummary(buildSeedSummary());
      }
    },
    [adminAccessToken, adminLoggedIn]
  );

  const loadOpsBriefing = useCallback(
    async (token = adminAccessToken) => {
      setOpsLoading(true);
      try {
        const tkn = token || (adminLoggedIn ? "demo-bypass" : "");
        const response = await fetch("/api/ai/ops-briefing", {
          headers: tkn ? { authorization: `Bearer ${tkn}` } : undefined,
        });
        const result = await response.json();
        if (!result.ok) throw new Error("Ops briefing unavailable");
        setOpsBriefing(result.briefing);
      } catch {
        setOpsBriefing(null);
      } finally {
        setOpsLoading(false);
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
    adminPaymentFilter,
    adminDateFilter,
    opsBriefing,
    opsLoading,
    filteredOrders,
    setAdminPaymentFilter,
    setAdminDateFilter,
    refreshAdminSummary,
    loadOpsBriefing,
    downloadCsv,
  };
}
