"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Utensils } from "lucide-react";
import { useStore } from "../../lib/store";
import { money } from "../../lib/pricing";
import { PaymentMode } from "../../lib/types";
import { markOrdersNeedRefresh } from "../../lib/session-customer";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { StatusPill } from "../../components/ui/StatusPill";
import { SuccessCheckmark } from "../../components/ui/Primitives";
import { OrderJourneyRail } from "../../features/order-tracking/components/OrderJourneyRail";
import { DeliveryMapFallback } from "../../features/order-tracking/components/DeliveryMapFallback";

function paymentConfirmation(mode: PaymentMode) {
  if (mode === "UPI") return "UPI payment requested. Order processing will begin upon confirmation.";
  if (mode === "Card") return "Online payment verified and captured. Order is processing.";
  return "Cash to be collected upon successful delivery.";
}

export default function ConfirmationScreen() {
  const router = useRouter();
  const { lastOrder, customer, pricingConfig, clearCheckout } = useStore();
  const [receiptOpen, setReceiptOpen] = useState(false);

  if (!lastOrder) {
    return (
      <main className="app-frame" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div className="empty-state">
          <div className="empty-state__illustration illustration-clipboard" />
          <h2 className="empty-state__title">No active order found</h2>
          <p className="empty-state__description">It looks like you haven't placed an order yet.</p>
          <Button variant="primary" onClick={() => { markOrdersNeedRefresh(); router.push("/"); }}>
            <Utensils size={16} /> Return to menu
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="app-frame" style={{ maxWidth: 720, margin: "0 auto", padding: "var(--space-lg)" }}>
      {/* Hero */}
      <div className="confirmation-hero">
        <SuccessCheckmark />
        <p className="confirmation-hero__order-id">
          Order #{lastOrder.id?.slice(0, 8) ?? "—"}
        </p>
        <h1 className="confirmation-hero__title">Order confirmed</h1>
        <div aria-live="polite">
          <StatusPill tone={lastOrder.paymentMode === "Cash" ? "warning" : "success"}>
            {lastOrder.paymentMode === "Cash" ? "Pay on delivery" : "Payment recorded"}
          </StatusPill>
        </div>
        <p style={{ fontSize: "var(--text-body)", color: "var(--sui-text-secondary)", maxWidth: 400, lineHeight: 1.5, margin: 0 }}>
          {paymentConfirmation(lastOrder.paymentMode)}
        </p>
        <p className="confirmation-hero__honesty" role="note">
          Live rider, ETA, and map appear only when verified delivery data exists. This screen shows recorded order status.
        </p>
      </div>

      {/* Journey rail */}
      <section style={{ marginBottom: "var(--space-xl)" }} aria-label="Order progress">
        <OrderJourneyRail orderId={lastOrder.id} status={lastOrder.status} />
      </section>

      {/* Map or Kitchen placeholder */}
      <section style={{ marginBottom: "var(--space-lg)" }} aria-label="Delivery status">
        {lastOrder.status?.toLowerCase() === "delivery" || lastOrder.status?.toLowerCase() === "out for delivery" ? (
          <DeliveryMapFallback state="no_rider" />
        ) : (
          <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "var(--space-xl)", textAlign: "center" }}>
            <div
              className="illustration-kitchen"
              style={{ marginBottom: "var(--space-md)" }}
              role="img"
              aria-label="Kitchen preparing your order"
            />
            <h3 style={{ fontSize: "var(--text-heading)", fontWeight: 700, margin: "0 0 4px" }}>
              Your order is being prepared
            </h3>
            <p style={{ fontSize: "var(--text-small)", color: "var(--sui-text-secondary)", margin: 0, maxWidth: 300, lineHeight: 1.5 }}>
              Keep this page open or return later from your order history. Updates reflect recorded order data.
            </p>
          </Card>
        )}
      </section>

      {/* Receipt accordion */}
      <div className="receipt-accordion" style={{ marginBottom: "var(--space-lg)" }}>
        <button
          className="receipt-accordion__trigger"
          onClick={() => setReceiptOpen(!receiptOpen)}
          type="button"
          aria-expanded={receiptOpen}
          aria-controls="confirmation-receipt-panel"
          id="confirmation-receipt-trigger"
        >
          <span>Final bill · {money(lastOrder.finalTotal)}</span>
          {receiptOpen ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
        </button>
        {receiptOpen && (
          <div
            className="receipt-accordion__content animate-fade-in"
            id="confirmation-receipt-panel"
            role="region"
            aria-labelledby="confirmation-receipt-trigger"
          >
            {/* Line items */}
            {lastOrder.lines.map((line, index) => (
              <div
                key={`${line.pizzaName}-${index}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  paddingBottom: "var(--space-sm)",
                  borderBottom: index < lastOrder.lines.length - 1 ? "1px solid var(--sui-border-soft)" : "none",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: "var(--text-body)" }}>
                    {line.quantity} × {line.baseName} / {line.pizzaName} / {line.sizeName}
                  </div>
                  <div style={{ fontSize: "var(--text-small)", color: "var(--sui-text-secondary)", marginTop: 2 }}>
                    {line.toppings.length ? line.toppings.join(", ") : "No extra toppings"}
                  </div>
                </div>
                <b style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{money(line.lineTotal)}</b>
              </div>
            ))}

            {/* Summary */}
            <div style={{ marginTop: "var(--space-md)", paddingTop: "var(--space-md)", borderTop: "2px solid var(--sui-border)", display: "grid", gap: "var(--space-xs)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-body)" }}>
                <span style={{ color: "var(--sui-text-secondary)" }}>Subtotal</span>
                <b style={{ fontVariantNumeric: "tabular-nums" }}>{money(lastOrder.subtotal)}</b>
              </div>
              {lastOrder.discount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-body)" }}>
                  <span style={{ color: "var(--basil)" }}>Quantity discount</span>
                  <b style={{ color: "var(--basil)", fontVariantNumeric: "tabular-nums" }}>- {money(lastOrder.discount)}</b>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-body)" }}>
                <span style={{ color: "var(--sui-text-secondary)" }}>GST {Math.round(pricingConfig.gstRate * 100)}%</span>
                <b style={{ fontVariantNumeric: "tabular-nums" }}>{money(lastOrder.gst)}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-body)" }}>
                <span style={{ color: "var(--sui-text-secondary)" }}>Payment mode</span>
                <b>{lastOrder.paymentMode}</b>
              </div>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "var(--text-title)",
                fontWeight: 800,
                paddingTop: "var(--space-sm)",
                marginTop: "var(--space-sm)",
                borderTop: "1px solid var(--sui-border-soft)",
              }}>
                <span>Total</span>
                <b style={{ color: "var(--tomato)", fontVariantNumeric: "tabular-nums" }}>{money(lastOrder.finalTotal)}</b>
              </div>
            </div>

            <div style={{ fontSize: "var(--text-small)", color: "var(--sui-text-tertiary)", marginTop: "var(--space-md)" }}>
              Delivery zone {lastOrder.deliveryZone ?? customer.deliveryZone} km · {lastOrder.address ?? customer.address}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "var(--space-sm)", justifyContent: "center" }}>
        <Button
          variant="primary"
          onClick={() => { markOrdersNeedRefresh(); clearCheckout(); router.push("/"); }}
        >
          <Utensils size={16} /> New order
        </Button>
      </div>
    </main>
  );
}
