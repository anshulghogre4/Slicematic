import { Send, ShoppingBag, UserRound } from "lucide-react";

import { getCartCashPolicyMessage, getDeliveryChargeLabel, shouldOfferCashSignIn } from "../../../lib/cart-rail";
import type { BillTotals, CartLine, MenuPayload, PricingConfig } from "../../../lib/types";
import { AiCartStrategistCard, type CartInsightView } from "./AiCartStrategistCard";
import { CartLineItem } from "./CartLineItem";
import { EmptyState } from "../../../components/ui/Primitives";

export type CartRailProps = {
  cart: CartLine[];
  menu: MenuPayload;
  totals: BillTotals;
  pricingConfig: PricingConfig;
  customerLoggedIn: boolean;
  customerOrderMode: string;
  customerSessionEmail: string | null;
  cartInsight: CartInsightView | null;
  cartInsightLoading: boolean;
  onOpenAccount: () => void;
  onRemoveLine: (lineId: string) => void;
  onAskCartInsight: () => void;
  onApplyCartInsight: () => void;
  onCheckout: () => void;
  formatMoney: (value: number) => string;
};

export function CartRail({
  cart,
  menu,
  totals,
  pricingConfig,
  customerLoggedIn,
  customerOrderMode,
  customerSessionEmail,
  cartInsight,
  cartInsightLoading,
  onOpenAccount,
  onRemoveLine,
  onAskCartInsight,
  onApplyCartInsight,
  onCheckout,
  formatMoney
}: CartRailProps) {
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const cashPolicy = getCartCashPolicyMessage(customerLoggedIn, pricingConfig.guestCashAllowed);
  const offerCashSignIn = shouldOfferCashSignIn(customerLoggedIn, pricingConfig.guestCashAllowed);

  return (
    <aside className="cart-panel" aria-label="Current order cart">
      {/* Header */}
      <div className="cart-head">
        <div>
          <p className="eyebrow">Your order</p>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            Cart
            {itemCount > 0 && (
              <span className="cart-sticky-footer__badge">{itemCount}</span>
            )}
          </h2>
        </div>
        <ShoppingBag />
      </div>

      {/* Member/Guest cash status */}
      <div className={customerLoggedIn ? "order-mode member" : "order-mode guest"}>
        <div><UserRound /><strong>{customerOrderMode}</strong></div>
        <span>
          {customerLoggedIn
            ? `${customerSessionEmail ? `Signed in as ${customerSessionEmail}. ` : ""}${cashPolicy}`
            : cashPolicy}
        </span>
        {offerCashSignIn && (
          <button type="button" onClick={onOpenAccount}>
            Sign in to unlock Cash
          </button>
        )}
      </div>

      {/* Cart items or empty state */}
      {cart.length ? (
        <div className="animate-fade-in">
          {cart.map((line) => (
            <CartLineItem key={line.id} line={line} menu={menu} onRemove={onRemoveLine} formatMoney={formatMoney} />
          ))}
        </div>
      ) : (
        <EmptyState
          illustration="empty-cart"
          title="Your cart is empty"
          description="Build a pizza to see live totals and continue to checkout."
        />
      )}

      {/* Bill summary */}
      <div className="summary">
        <div><span>Subtotal</span><b style={{ fontVariantNumeric: "tabular-nums" }}>{formatMoney(totals.subtotal)}</b></div>
        {totals.discount > 0 && (
          <div><span>Quantity discount</span><b style={{ color: "var(--basil)", fontVariantNumeric: "tabular-nums" }}>- {formatMoney(totals.discount)}</b></div>
        )}
        <div><span>GST {Math.round(pricingConfig.gstRate * 100)}%</span><b style={{ fontVariantNumeric: "tabular-nums" }}>{formatMoney(totals.gst)}</b></div>
        <div>
          <span>Delivery</span>
          <b style={{ fontVariantNumeric: "tabular-nums" }}>
            {getDeliveryChargeLabel(totals.deliveryCharge, pricingConfig)}
          </b>
        </div>
        <div className="total"><span>Total</span><b style={{ fontVariantNumeric: "tabular-nums" }}>{formatMoney(totals.finalTotal)}</b></div>
      </div>

      {/* AI Cart Strategist */}
      <AiCartStrategistCard
        insight={cartInsight}
        loading={cartInsightLoading}
        onAsk={onAskCartInsight}
        onApply={onApplyCartInsight}
      />

      {/* Checkout CTA */}
      <button
        className="sui-button sui-button--primary sui-button--lg"
        disabled={!cart.length}
        onClick={onCheckout}
        type="button"
        style={{ width: "100%", marginTop: "var(--space-sm)" }}
      >
        Continue to checkout <Send size={16} />
      </button>
    </aside>
  );
}
