import type { ReactNode } from "react";

import { OrderContextPanel } from "../../../components/admin/OrderContextPanel";
import type { SavedOrder } from "../../../lib/types";
import { OrderTable } from "./OrderTable";

export type AdminOrdersWorkspaceProps = {
  orders: SavedOrder[];
  allOrders?: SavedOrder[];
  selectedOrderId: string;
  selectedOrder?: SavedOrder;
  onSelectOrder: (orderId: string) => void;
  onCloseOrder?: () => void;
  variant?: "compact" | "detailed";
  status?: "idle" | "loading" | "live" | "error" | string;
  error?: string | null;
  totalMatched?: number;
  totalFetched?: number;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  filters?: ReactNode;
  pagination?: ReactNode;
};

export function AdminOrdersWorkspace({
  orders,
  allOrders = orders,
  selectedOrderId,
  selectedOrder,
  onSelectOrder,
  onCloseOrder,
  variant = "compact",
  status,
  error,
  totalMatched,
  totalFetched,
  isRefreshing = false,
  onRefresh,
  filters,
  pagination
}: AdminOrdersWorkspaceProps) {
  const activeOrder = selectedOrder ?? allOrders.find((order) => order.id === selectedOrderId);
  const awaitingLive = status === "loading" || status === "idle";
  const statusCopy = status === "live"
    ? (isRefreshing ? "Refreshing orders…" : "Connected to admin API")
    : status === "error"
      ? "Couldn’t refresh — showing last loaded orders"
      : awaitingLive
        ? "Loading orders…"
        : "Order ledger";
  const matchedCount = totalMatched ?? orders.length;
  const fetchedCount = totalFetched ?? allOrders.length;
  // Hide seed rows during first load so the table shows a skeleton instead of a seed flash.
  const tableOrders = awaitingLive ? [] : orders;

  return (
    <section className={variant === "detailed" ? "admin-card orders-console" : "admin-card"}>
      <div className="admin-page-head">
        <div>
          <p className="eyebrow">Live order ledger</p>
          <h3>{variant === "detailed" ? "All Supabase orders" : "Recent orders"}</h3>
          <span>{statusCopy}</span>
        </div>
        {onRefresh ? (
          <div className="orders-summary-actions">
            <strong>{matchedCount} matched / {fetchedCount} fetched</strong>
            <button type="button" onClick={onRefresh} disabled={isRefreshing || awaitingLive}>{isRefreshing || awaitingLive ? "Refreshing" : "Refresh orders"}</button>
          </div>
        ) : null}
      </div>
      {error && <div className="admin-error">{error}</div>}
      {filters}
      <div className={selectedOrderId ? "admin-orders-workspace has-selection" : "admin-orders-workspace"}>
        <OrderTable orders={tableOrders} selectedOrderId={selectedOrderId} onSelectOrder={onSelectOrder} variant={variant} isLoading={awaitingLive || isRefreshing} />
        {activeOrder && !awaitingLive ? <OrderContextPanel order={activeOrder} onClose={onCloseOrder ?? (() => onSelectOrder(""))} /> : null}
      </div>
      {pagination}
    </section>
  );
}
