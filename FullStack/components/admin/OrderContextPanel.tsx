import { MapPin, ReceiptText, X } from "lucide-react";
import { money } from "../../lib/pricing";
import type { SavedOrder } from "../../lib/types";
import { Button, Card, StatusPill } from "../ui";

type OrderContextPanelProps = { order: SavedOrder; onClose: () => void };

function paymentTone(order: SavedOrder): "success" | "warning" | "danger" {
  if (order.paymentStatus === "failed") return "danger";
  if (order.paymentStatus === "paid" || order.paymentStatus === "confirmed") return "success";
  return "warning";
}

export function OrderContextPanel({ order, onClose }: OrderContextPanelProps) {
  return (
    <aside className="admin-order-context" aria-labelledby="selected-order-title">
      <Card className="admin-order-context__card">
        <header className="admin-order-context__head">
          <div>
            <p className="eyebrow">Selected order</p>
            <h3 id="selected-order-title">Order {order.id.slice(0, 8)}</h3>
            <span>{new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close selected order details">
            <X aria-hidden="true" size={18} />
          </Button>
        </header>
        <div className="admin-order-context__statuses" aria-label="Order status">
          <StatusPill tone="info">{order.status}</StatusPill>
          <StatusPill tone={paymentTone(order)}>{order.paymentMode} / {order.paymentStatus ?? "confirmed"}</StatusPill>
        </div>
        <dl className="admin-order-context__facts">
          <div><dt>Customer</dt><dd>{order.customerName}<small>{order.phone || "No phone provided"}</small></dd></div>
          <div><dt>Total</dt><dd>{money(order.finalTotal)}<small>Subtotal {money(order.subtotal)} / GST {money(order.gst)}</small></dd></div>
          <div><dt>Delivery</dt><dd>{order.deliveryZone ? `${order.deliveryZone} km zone` : "Zone unavailable"}<small>{order.address || "Address unavailable"}</small></dd></div>
        </dl>
        <section className="admin-order-context__items" aria-labelledby="selected-order-items">
          <h4 id="selected-order-items"><ReceiptText aria-hidden="true" size={17} /> Items</h4>
          {order.lines.map((line, index) => (
            <div key={`${line.pizzaName}-${line.baseName}-${index}`}>
              <span>
                <strong>{line.quantity} x {line.pizzaName}</strong>
                <small>{line.sizeName} / {line.baseName}{line.toppings.length ? ` / ${line.toppings.join(", ")}` : ""}</small>
              </span>
              <strong>{money(line.lineTotal)}</strong>
            </div>
          ))}
        </section>
        <div className="admin-order-context__delivery-note">
          <MapPin aria-hidden="true" size={18} />
          <div>
            <strong>Dispatch tracking is not connected yet</strong>
            <span>Rider assignment, live location, and ETA will appear after delivery schema and access policies are approved.</span>
          </div>
        </div>
      </Card>
    </aside>
  );
}
