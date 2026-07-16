"use client";

import { useRouter } from "next/navigation";
import { Utensils } from "lucide-react";
import { useStore } from "../../lib/store";
import { money } from "../../lib/pricing";
import { PaymentMode } from "../../lib/types";
import { markOrdersNeedRefresh } from "../../lib/session-customer";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { StatusPill } from "../../components/ui/StatusPill";
import { OrderJourneyRail } from "../../features/order-tracking/components/OrderJourneyRail";

function paymentConfirmation(mode: PaymentMode) {
  if (mode === "UPI") return "UPI payment requested. Order processing will begin upon confirmation.";
  if (mode === "Card") return "Online payment verified and captured. Order is processing.";
  return "Cash to be collected upon successful delivery.";
}

export default function ConfirmationScreen() {
  const router = useRouter();
  const { lastOrder, customer, pricingConfig, clearCheckout } = useStore();

  if (!lastOrder) {
    return (
      <main className="app-frame confirmation-empty">
        <h2>No active order found</h2>
        <Button variant="primary" onClick={() => { markOrdersNeedRefresh(); router.push("/"); }}>Return to menu</Button>
      </main>
    );
  }

  return (
    <main className="app-frame confirmation-shell">
      <section className="tracking-page" id="tracking">
        <div className="tracking-page-head">
          <div>
            <p className="eyebrow">Order journey</p>
            <h1>Track your SliceMatic order</h1>
            <p>Your order is confirmed. Follow verified kitchen and delivery updates here as they become available.</p>
          </div>
          <Button variant="secondary" onClick={() => { markOrdersNeedRefresh(); clearCheckout(); router.push("/"); }}><Utensils /> New order</Button>
        </div>
        <section className="tracking-grid">
          <OrderJourneyRail orderId={lastOrder.id} status={lastOrder.status} />
          <Card className="tracking-card confirmation-status-card" tone="soft">
            <div className="confirmation-status-card__heading">
              <div><p className="eyebrow">Payment status</p><h2>Order confirmed</h2></div>
              <StatusPill tone={lastOrder.paymentMode === "Cash" ? "warning" : "success"}>
                {lastOrder.paymentMode === "Cash" ? "Pay on delivery" : "Payment recorded"}
              </StatusPill>
            </div>
            <div className="payment-confirmation">{paymentConfirmation(lastOrder.paymentMode)}</div>
            <p className="confirmation-status-card__note">Keep this page open or return later from your order history. Updates shown here reflect recorded order data.</p>
          </Card>
          <Card className="tracking-card final-bill">
            <p className="eyebrow">Final bill</p><h2>{money(lastOrder.finalTotal)}</h2>
            <div className="bill-lines">
              {lastOrder.lines.map((line, index) => (
                <div key={`${line.pizzaName}-${index}`}>
                  <span>{line.quantity} x {line.baseName} / {line.pizzaName} / {line.sizeName}</span>
                  <b>{money(line.lineTotal)}</b>
                  <small>{line.toppings.length ? line.toppings.join(", ") : "No extra toppings"}</small>
                </div>
              ))}
            </div>
            <div className="summary">
              <div><span>Subtotal</span><b>{money(lastOrder.subtotal)}</b></div>
              <div><span>Quantity discount</span><b>- {money(lastOrder.discount)}</b></div>
              <div><span>GST {Math.round(pricingConfig.gstRate * 100)}%</span><b>{money(lastOrder.gst)}</b></div>
              <div><span>Payment mode</span><b>{lastOrder.paymentMode}</b></div>
              <div className="total"><span>Final payable</span><b>{money(lastOrder.finalTotal)}</b></div>
            </div>
            <small>Delivery zone {lastOrder.deliveryZone ?? customer.deliveryZone} km / {lastOrder.address ?? customer.address}</small>
          </Card>
        </section>
      </section>
    </main>
  );
}
