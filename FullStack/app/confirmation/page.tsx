"use client";

import { useRouter } from "next/navigation";
import { Check, Utensils } from "lucide-react";
import { useStore } from "../../lib/store";
import { money } from "../../lib/pricing";
import { PaymentMode } from "../../lib/types";
import { markOrdersNeedRefresh } from "../../lib/session-customer";

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
      <main className="app-frame" style={{ maxWidth: 1200, margin: "0 auto", padding: "1rem", textAlign: "center" }}>
        <h2>No active order found</h2>
        <button className="primary" onClick={() => { markOrdersNeedRefresh(); router.push("/"); }}>Return to menu</button>
      </main>
    );
  }

  return (
    <main className="app-frame" style={{ maxWidth: 1200, margin: "0 auto", padding: "1rem" }}>
      <section className="tracking-page" id="tracking">
        <div className="tracking-page-head">
          <div>
            <p className="eyebrow">Order journey</p>
            <h1>Track your SliceMatic order</h1>
            <p>The cart is closed now. The customer sees fulfilment status, rider progress, and final bill on a dedicated page.</p>
          </div>
          <button type="button" onClick={() => { markOrdersNeedRefresh(); clearCheckout(); router.push("/"); }}><Utensils /> New order</button>
        </div>
        <section className="tracking-grid">
          <div className="map-card"><div className="route-line" /><span className="pin store">S</span><span className="pin home">H</span><div className="rider-card">Ravi assigned<br /><small>Arrives in 34 min</small></div></div>
          <div className="tracking-card">
            <p className="eyebrow">Live tracking</p><h2>Order {lastOrder.id.slice(0, 8)} confirmed</h2>
            <div className="payment-confirmation">{paymentConfirmation(lastOrder.paymentMode)}</div>
            {["Order accepted", "In the oven", "Quality check", "Out for delivery", "At doorstep"].map((item, index) => (
              <div className="timeline-item" key={item}><span className={index < 2 ? "done" : ""}>{index < 2 ? <Check /> : index + 1}</span><div><strong>{item}</strong><small>{index === 1 ? "Kitchen is baking selected crust and toppings." : "Tracked in the order lifecycle."}</small></div></div>
            ))}
          </div>
          <div className="tracking-card final-bill">
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
          </div>
        </section>
      </section>
    </main>
  );
}
