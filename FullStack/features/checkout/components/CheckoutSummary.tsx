import { CreditCard, ReceiptText, Send, ShoppingBag, Trash2, UserRound } from "lucide-react";
import { Button, Card, StatusPill } from "../../../components/ui";
import { getLineUnitPrice, money } from "../../../lib/pricing";
import { BillTotals, CartLine, MenuPayload, PaymentMode, PricingConfig } from "../../../lib/types";

type PaymentModeOption = {
  mode: PaymentMode;
  icon: React.ReactNode;
  copy: string;
};

const paymentModes: PaymentModeOption[] = [
  {
    mode: "UPI",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-upi-triangles">
        <polygon points="3,6 13,12 3,18" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="2" />
        <polygon points="10,6 20,12 10,18" fill="currentColor" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
    copy: "Confirm receipt before fulfillment.",
  },
  { mode: "Card", icon: <CreditCard />, copy: "Process on POS or payment link." },
  { mode: "Cash", icon: <ReceiptText />, copy: "Collect at delivery or counter." },
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
    <article className="cart-line" key={line.id ?? `${line.pizzaId}-${index}`}>
      <div>
        <strong>{line.quantity} x {pizza?.name}</strong>
        <span>{base?.name} / {size?.name} / {toppings.length ? toppings.join(", ") : "No extra toppings"}</span>
      </div>
      <div>
        <b>{money(getLineUnitPrice(line, menu) * line.quantity)}</b>
        <Button variant="danger" size="sm" onClick={() => onRemove(line.id)} aria-label="Remove line">
          <Trash2 />
        </Button>
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
    <div className="checkout-layout">
      <Card as="section" className="checkout-review-card">
        <div className="cart-head"><div><p className="eyebrow">Order review</p><h2>Basket</h2></div><ShoppingBag /></div>
        <div className={customerLoggedIn ? "order-mode member" : "order-mode guest"}>
          <div><UserRound /><strong>{customerOrderMode}</strong></div>
          <span>{customerLoggedIn ? `Logged in as ${sessionEmail || customerName}` : "Guest checkout. UPI/Card required unless owner enables guest cash."}</span>
        </div>
        {cart.length ? cart.map((line, idx) => renderLine(line, menu, idx, onRemoveLine)) : <div className="empty-cart">Your cart is empty.<br /><span>Go back to menu and build a pizza.</span></div>}
        <div className="summary">
          <div><span>Subtotal</span><b>{money(totals.subtotal)}</b></div>
          <div><span>Quantity discount</span><b>- {money(totals.discount)}</b></div>
          <div><span>GST {Math.round(pricingConfig.gstRate * 100)}%</span><b>{money(totals.gst)}</b></div>
          <div><span>Delivery</span><b>{pricingConfig.deliveryFee === 0 ? "Included" : totals.deliveryCharge === 0 ? `Free (above ${money(pricingConfig.freeDeliveryMin)})` : money(totals.deliveryCharge)}</b></div>
          <div className="total"><span>Total payable</span><b>{money(totals.finalTotal)}</b></div>
        </div>
      </Card>

      <Card as="section" className="checkout-payment-card" tone="soft">
        <div className="checkout-head">
          <div><p className="eyebrow">Payment</p><h2>Select payment mode</h2></div>
          <div className={customerLoggedIn ? "checkout-policy member" : "checkout-policy guest"}>
            <strong>{customerOrderMode}</strong>
            <span>{customerPaymentPolicy}</span>
          </div>
        </div>
        <div className="payment-grid">
          {paymentModes.map((payment) => {
            const disabledForGuest = !customerLoggedIn && !pricingConfig.guestCashAllowed && payment.mode === "Cash";
            return (
              <button key={payment.mode} className={paymentMode === payment.mode ? "active" : ""} disabled={disabledForGuest} onClick={() => disabledForGuest ? onGuestCashBlocked() : onSelectPaymentMode(payment.mode)} type="button">
                {payment.icon}<strong>{payment.mode}</strong><span>{disabledForGuest ? "Login required. Guests use UPI or Card only." : payment.copy}</span>
              </button>
            );
          })}
        </div>
        <StatusPill tone={paymentMode === "Cash" ? "success" : "info"}>
          {paymentMode === "Cash" ? "Cash test path ready" : "Online verification required"}
        </StatusPill>
        <Button
          variant="primary"
          className="checkout-submit-button"
          disabled={!cart.length || placingOrder}
          aria-busy={placingOrder}
          onClick={onPlaceOrder}
        >
          <Send /> {placingOrder ? "Processing payment..." : paymentMode === "Cash" ? "Place order" : "Pay & place order"}
        </Button>
        {paymentStatusMessage && <p className="payment-status" role="status" aria-live="polite">{paymentStatusMessage}</p>}
      </Card>
    </div>
  );
}
