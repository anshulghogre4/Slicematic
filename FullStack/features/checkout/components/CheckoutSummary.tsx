"use client";

import { CreditCard, ReceiptText, Send, ShoppingBag, Trash2, UserRound } from "lucide-react";
import { Button, Card, StatusPill, PaymentTile, CheckoutSummarySkeleton } from "../../../components/ui";
import { getLineUnitPrice, money } from "../../../lib/pricing";
import { BillTotals, CartLine, MenuPayload, PaymentMode, PricingConfig } from "../../../lib/types";

type PaymentModeOption = {
  mode: PaymentMode;
  icon: React.ReactNode;
  label: string;
  copy: string;
};

const paymentModes: PaymentModeOption[] = [
  {
    mode: "UPI",
    label: "UPI",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3,6 13,12 3,18" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="2" />
        <polygon points="10,6 20,12 10,18" fill="currentColor" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
    copy: "Confirm receipt before fulfillment.",
  },
  { mode: "Card", label: "Card", icon: <CreditCard size={20} />, copy: "Process on POS or payment link." },
  { mode: "Cash", label: "Cash", icon: <ReceiptText size={20} />, copy: "Collect at delivery or counter." },
];

export type CheckoutSummaryProps = {
  cart: CartLine[];
  menu: MenuPayload;
  totals: BillTotals;
  pricingConfig: PricingConfig;
  customerLoggedIn: boolean;
  customerOrderMode: string;
  customerPaymentPolicy: string;
  sessionEmail: string;
  customerName: string;
  paymentMode: PaymentMode;
  placingOrder: boolean;
  paymentStatusMessage: string;
  onRemoveLine: (id: string) => void;
  onSelectPaymentMode: (mode: PaymentMode) => void;
  onGuestCashBlocked: () => void;
  onPlaceOrder: () => void;
};

function renderLine(line: CartLine, menu: MenuPayload, index: number, onRemove: (id: string) => void) {
  const pizza = menu.pizzas.find((item) => item.id === line.pizzaId);
  const base = menu.bases.find((item) => item.id === line.baseId);
  const size = menu.sizes.find((item) => item.id === line.sizeId);
  const toppings = line.toppingIds.map((id) => menu.toppings.find((item) => item.id === id)?.name).filter(Boolean);

  return (
    <article
      className="cart-line"
      key={line.id ?? `${line.pizzaId}-${index}`}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "var(--space-sm) 0",
        borderBottom: "1px solid var(--sui-border-soft)",
      }}
    >
      <div style={{ flex: 1 }}>
        <strong style={{ fontSize: "var(--text-body)", fontWeight: 700 }}>
          {line.quantity} × {pizza?.name}
        </strong>
        <div style={{ fontSize: "var(--text-small)", color: "var(--sui-text-secondary)", marginTop: 2 }}>
          {base?.name} / {size?.name} / {toppings.length ? toppings.join(", ") : "No extra toppings"}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
        <b style={{ fontVariantNumeric: "tabular-nums", fontSize: "var(--text-body)" }}>
          {money(getLineUnitPrice(line, menu) * line.quantity)}
        </b>
        <button
          className="sui-button sui-button--danger sui-button--sm"
          onClick={() => onRemove(line.id)}
          aria-label="Remove line"
          type="button"
          style={{ padding: "6px" }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </article>
  );
}

export function CheckoutSummary({
  cart,
  menu,
  totals,
  pricingConfig,
  customerLoggedIn,
  customerOrderMode,
  customerPaymentPolicy,
  sessionEmail,
  customerName,
  paymentMode,
  placingOrder,
  paymentStatusMessage,
  onRemoveLine,
  onSelectPaymentMode,
  onGuestCashBlocked,
  onPlaceOrder,
}: CheckoutSummaryProps) {
  return (
    <div className="checkout-layout animate-fade-in-up">
      {/* Left column: Payment selection */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
        {/* Basket review */}
        <Card as="section" className="checkout-review-card" style={{ padding: "var(--space-lg)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
            <div>
              <p style={{ fontSize: "var(--text-micro)", fontWeight: 700, color: "var(--sui-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
                Order review
              </p>
              <h2 className="section-heading" style={{ margin: "4px 0 0" }}>Basket</h2>
            </div>
            <ShoppingBag size={20} style={{ color: "var(--sui-text-tertiary)" }} />
          </div>

          {/* Member / Guest status */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-sm)",
            padding: "var(--space-sm) var(--space-md)",
            borderRadius: "var(--sui-radius-sm)",
            background: customerLoggedIn ? "var(--sui-success-soft)" : "var(--sui-surface-soft)",
            marginBottom: "var(--space-md)",
            fontSize: "var(--text-small)",
          }}>
            <UserRound size={16} />
            <strong>{customerOrderMode}</strong>
            <span style={{ color: "var(--sui-text-secondary)" }}>·</span>
            <span style={{ color: "var(--sui-text-secondary)" }}>
              {customerLoggedIn ? `${sessionEmail || customerName}` : "Online payment only"}
            </span>
          </div>

          {/* Cart lines */}
          {cart.length ? (
            <div>{cart.map((line, idx) => renderLine(line, menu, idx, onRemoveLine))}</div>
          ) : (
            <div style={{ padding: "var(--space-xl) 0", textAlign: "center", color: "var(--sui-text-secondary)" }}>
              Your cart is empty. Go back and build a pizza.
            </div>
          )}
        </Card>

        {/* Payment method selection */}
        <Card as="section" tone="soft" style={{ padding: "var(--space-lg)" }}>
          <div style={{ marginBottom: "var(--space-md)" }}>
            <p style={{ fontSize: "var(--text-micro)", fontWeight: 700, color: "var(--sui-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
              Payment
            </p>
            <h2 className="section-heading" style={{ margin: "4px 0 0" }}>Select payment mode</h2>
            <p style={{ fontSize: "var(--text-small)", color: "var(--sui-text-secondary)", marginTop: 4 }}>
              {customerPaymentPolicy}
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
            {paymentModes.map((payment) => {
              const disabledForGuest = !customerLoggedIn && !pricingConfig.guestCashAllowed && payment.mode === "Cash";
              return (
                <PaymentTile
                  key={payment.mode}
                  icon={payment.icon}
                  label={payment.label}
                  copy={disabledForGuest ? "Login required. Guests use UPI or Card only." : payment.copy}
                  selected={paymentMode === payment.mode}
                  onClick={() => disabledForGuest ? onGuestCashBlocked() : onSelectPaymentMode(payment.mode)}
                />
              );
            })}
          </div>

          <div style={{ marginTop: "var(--space-md)" }}>
            <StatusPill tone={paymentMode === "Cash" ? "success" : "info"}>
              {paymentMode === "Cash" ? "Cash test path ready" : "Online verification required"}
            </StatusPill>
          </div>
        </Card>
      </div>

      {/* Right column: Sticky summary */}
      <div className="checkout-summary-sticky">
        <Card style={{ padding: "var(--space-lg)" }}>
          <p style={{ fontSize: "var(--text-micro)", fontWeight: 700, color: "var(--sui-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 var(--space-md)" }}>
            Order total
          </p>

          <div style={{ display: "grid", gap: "var(--space-sm)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-body)" }}>
              <span style={{ color: "var(--sui-text-secondary)" }}>Subtotal</span>
              <b style={{ fontVariantNumeric: "tabular-nums" }}>{money(totals.subtotal)}</b>
            </div>
            {totals.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-body)" }}>
                <span style={{ color: "var(--basil)" }}>Quantity discount</span>
                <b style={{ color: "var(--basil)", fontVariantNumeric: "tabular-nums" }}>- {money(totals.discount)}</b>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-body)" }}>
              <span style={{ color: "var(--sui-text-secondary)" }}>GST {Math.round(pricingConfig.gstRate * 100)}%</span>
              <b style={{ fontVariantNumeric: "tabular-nums" }}>{money(totals.gst)}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-body)" }}>
              <span style={{ color: "var(--sui-text-secondary)" }}>Delivery</span>
              <b style={{ fontVariantNumeric: "tabular-nums" }}>
                {pricingConfig.deliveryFee === 0 ? "Included" : totals.deliveryCharge === 0 ? `Free (above ${money(pricingConfig.freeDeliveryMin)})` : money(totals.deliveryCharge)}
              </b>
            </div>
          </div>

          {/* Total */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginTop: "var(--space-md)",
            paddingTop: "var(--space-md)",
            borderTop: "2px solid var(--sui-border)",
          }}>
            <span style={{ fontSize: "var(--text-body)", fontWeight: 700 }}>Total payable</span>
            <b style={{
              fontSize: "var(--text-title)",
              fontWeight: 800,
              color: "var(--tomato)",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.01em",
            }}>
              {money(totals.finalTotal)}
            </b>
          </div>

          {/* Place order button */}
          <Button
            variant="primary"
            className="checkout-submit-button"
            disabled={!cart.length || placingOrder}
            aria-busy={placingOrder}
            onClick={onPlaceOrder}
            style={{ width: "100%", marginTop: "var(--space-lg)", minHeight: 52 }}
          >
            {placingOrder && <span className="sui-button__spinner" />}
            <Send size={16} />
            {placingOrder ? "Processing payment..." : paymentMode === "Cash" ? "Place order" : "Pay & place order"}
          </Button>

          {paymentStatusMessage && (
            <p
              role="status"
              aria-live="polite"
              style={{
                marginTop: "var(--space-sm)",
                padding: "var(--space-sm) var(--space-md)",
                borderRadius: "var(--sui-radius-sm)",
                background: "var(--sui-warning-soft)",
                color: "#8a5516",
                fontSize: "var(--text-small)",
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              {paymentStatusMessage}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
