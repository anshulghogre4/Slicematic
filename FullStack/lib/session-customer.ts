export function syncSessionCustomerId(customerId: string | null | undefined) {
  if (typeof window === "undefined" || !customerId) return;
  window.sessionStorage.setItem("slicematic_customer_id", customerId);
}

export function markOrdersNeedRefresh() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem("slicematic_refresh_orders", "1");
}

export function applyOrderToSession(order: { linkedCustomerId?: string | null }) {
  syncSessionCustomerId(order.linkedCustomerId);
  markOrdersNeedRefresh();
}
