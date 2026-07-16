import { money } from "../../../lib/pricing";
import type { SavedOrder } from "../../../lib/types";

export type OrderTableProps = {
  orders: SavedOrder[];
  selectedOrderId?: string;
  onSelectOrder?: (orderId: string) => void;
  variant?: "compact" | "detailed";
};

export function OrderTable({ orders, selectedOrderId, onSelectOrder, variant = "compact" }: OrderTableProps) {
  if (!orders.length) {
    return <div className="empty-orders">No orders match the current filters.</div>;
  }

  if (variant === "detailed") {
    return (
      <div className="order-table">
        <div className="order-row head"><span>Order</span><span>Placed</span><span>Customer</span><span>Payment</span><span>Total</span><span>Status</span></div>
        {orders.map((order) => (
          <button className={selectedOrderId === order.id ? "order-row is-selected" : "order-row"} key={order.id} type="button" onClick={() => onSelectOrder?.(order.id)} aria-pressed={selectedOrderId === order.id} aria-label={`View order ${order.id.slice(0, 8)} for ${order.customerName}`}>
            <span><strong>{order.id.slice(0, 8)}</strong><small>{order.id}</small></span>
            <span>{new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}<small>{order.deliveryZone ? `${order.deliveryZone} km zone` : "No zone"}</small></span>
            <span>{order.customerName}<small>{order.phone || "No phone"}{order.address ? ` - ${order.address}` : ""}</small></span>
            <span>{order.paymentMode}<small>{order.paymentStatus ?? "confirmed"}</small></span>
            <span>{money(order.finalTotal)}<small>Subtotal {money(order.subtotal)} - GST {money(order.gst)}</small></span>
            <span>{order.status}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="order-table">
      <div className="order-row head"><span>Order</span><span>Customer</span><span>Payment</span><span>Total</span><span>Status</span></div>
      {orders.map((order) => (
        <button className={selectedOrderId === order.id ? "order-row is-selected" : "order-row"} key={order.id} type="button" onClick={() => onSelectOrder?.(order.id)} aria-pressed={selectedOrderId === order.id} aria-label={`View order ${order.id.slice(0, 8)} for ${order.customerName}`}>
          <span>{order.id.slice(0, 8)}</span>
          <span>{order.customerName}<small>{order.phone}</small></span>
          <span>{order.paymentMode}</span>
          <span>{money(order.finalTotal)}</span>
          <span>{order.status}</span>
        </button>
      ))}
    </div>
  );
}
