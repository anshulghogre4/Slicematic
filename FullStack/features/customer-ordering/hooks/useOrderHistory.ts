"use client";
/**
 * useOrderHistory — customer order history fetch with request deduplication.
 * Extracted from SliceMaticStage3 / admin-dashboard page.
 */

import { useCallback, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { syncSessionCustomerId } from "../../../lib/session-customer";
import type { CustomerOrderHistoryItem } from "../../../lib/data-service";

function getSupabaseAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createClient(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

async function getCustomerRoutesAuthToken(): Promise<string> {
  if (typeof window === "undefined") return "";
  const email = (
    window.sessionStorage.getItem("slicematic_customer_email") ?? ""
  )
    .trim()
    .toLowerCase();
  if (email === "demo@slicematic.in" || email === "9999999999")
    return "demo-bypass";
  const supabase = getSupabaseAuthClient();
  if (!supabase) return "";
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

export function useOrderHistory() {
  const [customerOrders, setCustomerOrders] = useState<CustomerOrderHistoryItem[]>([]);
  const [customerOrdersLoading, setCustomerOrdersLoading] = useState(false);
  const [customerOrdersError, setCustomerOrdersError] = useState("");

  const ordersRefreshInFlight = useRef(false);
  const ordersRequestSeq = useRef(0);

  const refreshCustomerOrders = useCallback(async (force = false) => {
    if (typeof window === "undefined") return;
    if (!force && ordersRefreshInFlight.current) return;

    const customerId =
      window.sessionStorage.getItem("slicematic_customer_id")?.trim() ?? "";
    if (!customerId) {
      // Quiet empty state — Account panel shows friendly copy until an order links an id.
      setCustomerOrders([]);
      setCustomerOrdersError("");
      setCustomerOrdersLoading(false);
      return;
    }

    const requestSeq = ++ordersRequestSeq.current;
    ordersRefreshInFlight.current = true;
    setCustomerOrdersLoading(true);
    setCustomerOrdersError("");

    try {
      const authToken = await getCustomerRoutesAuthToken();
      const res = await fetch(
        `/api/customer/orders?customer_id=${encodeURIComponent(customerId)}`,
        {
          cache: "no-store",
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        }
      );
      const data = await res.json();
      if (requestSeq !== ordersRequestSeq.current) return;
      if (!res.ok || !data.ok) {
        setCustomerOrdersError(data.error ?? "Could not load order history.");
        return;
      }
      setCustomerOrders(Array.isArray(data.orders) ? data.orders : []);
      if (data.customer_id) syncSessionCustomerId(data.customer_id);
    } catch (err) {
      if (requestSeq === ordersRequestSeq.current) {
        console.error("Error refreshing customer orders", err);
        setCustomerOrdersError("Could not load order history. Please retry.");
      }
    } finally {
      if (requestSeq === ordersRequestSeq.current) {
        ordersRefreshInFlight.current = false;
        setCustomerOrdersLoading(false);
      }
    }
  }, []);

  const clearOrders = useCallback(() => {
    setCustomerOrders([]);
    setCustomerOrdersError("");
  }, []);

  return {
    customerOrders,
    customerOrdersLoading,
    customerOrdersError,
    refreshCustomerOrders,
    clearOrders,
  };
}
