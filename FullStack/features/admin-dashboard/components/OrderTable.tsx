import { Skeleton } from "../../../components/ui";
import { money } from "../../../lib/pricing";
import type { SavedOrder } from "../../../lib/types";

export type OrderTableProps = {
  orders: SavedOrder[];
  selectedOrderId?: string;
  onSelectOrder?: (orderId: string) => void;
  variant?: "compact" | "detailed";
  isLoading?: boolean;
};

export function OrderTable({ orders, selectedOrderId, onSelectOrder, variant = "compact", isLoading = false }: OrderTableProps) {
  if (isLoading && !orders.length) {
    const columnCount = variant === "detailed" ? 6 : 5;

    return (
      <div className="order-table order-table--loading" aria-busy="true" aria-label="Loading orders">
        <div className="order-row head">
          {Array.from({ length: columnCount }).map((_, index) => <span key={index}>Loading</span>)}
        </div>
        {Array.from({ length: 4 }).map((_, rowIndex) => (
          <div className="order-row order-row--skeleton" key={rowIndex}>
            {Array.from({ length: columnCount }).map((_, cellIndex) => <Skeleton key={cellIndex} variant="line" />)}
          </div>
        ))}
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="empty-orders" role="status">
        <strong>No orders found</strong>
        <span>Try clearing filters or refresh once Supabase data is available.</span>
      </div>
    );
  }

  if (variant === "detailed") {
    return (
      <div className="order-table order-table--detailed">
        <div className="order-row head">
          <span>Order</span>
          <span>Placed</span>
          <span>Customer</span>
          <span>Payment</span>
          <span>Total</span>
          <span>Kitchen Status</span>
        </div>
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
      <div className="order-row head"><span>Order</span><span>Customer</span><span>Payment</span><span>Total</span><span>Kitchen</span></div>
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
