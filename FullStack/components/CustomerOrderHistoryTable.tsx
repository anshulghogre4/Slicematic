import { CustomerOrderHistoryItem } from "../lib/data-service";
import { money } from "../lib/pricing";

function formatItemLine(line: CustomerOrderHistoryItem["lines"][number]) {
  return `${line.quantity}x ${line.pizzaName} (${line.sizeName})`;
}

function formatDeliveryZone(zone: string | null | undefined) {
  if (!zone) return null;
  return `${zone} km zone`;
}

export default function CustomerOrderHistoryTable({ orders }: { orders: CustomerOrderHistoryItem[] }) {
  if (!orders.length) {
    return <div className="empty-orders">No past orders found.</div>;
  }

  return (
    <div className="order-table customer-order-history">
      <div className="order-row head">
        <span>Order</span>
        <span>Placed</span>
        <span>Items</span>
        <span>Payment</span>
        <span>Total</span>
        <span>Status</span>
      </div>
      {orders.map((order) => {
        const zone = formatDeliveryZone(order.deliveryZone);
        return (
          <div className="order-row" key={order.id}>
            <span>
              <strong>{order.id.slice(0, 8)}</strong>
              <small>{order.id}</small>
            </span>
            <span>
              {new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              {zone ? <small>{zone}</small> : null}
            </span>
            <span className="order-items-cell">
              {order.lines.length ? (
                order.lines.map((line, index) => (
                  <strong key={`${line.pizzaName}-${line.quantity}-${index}`}>{formatItemLine(line)}</strong>
                ))
              ) : (
                <strong>No items</strong>
              )}
            </span>
            <span>
              {order.paymentMode}
              <small>{order.paymentStatus ?? "confirmed"}</small>
            </span>
            <span>
              {money(order.finalTotal)}
              <small>
                Subtotal {money(order.subtotal)} · GST {money(order.gst)}
              </small>
            </span>
            <span>{order.status}</span>
          </div>
        );
      })}
    </div>
  );
}
