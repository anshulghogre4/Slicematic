import { Send, ShoppingBag, UserRound } from "lucide-react";

import { getDeliveryChargeLabel } from "../../../lib/cart-rail";
import type { BillTotals, CartLine, MenuPayload, PricingConfig } from "../../../lib/types";
import { AiCartStrategistCard, type CartInsightView } from "./AiCartStrategistCard";
import { CartLineItem } from "./CartLineItem";

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
  return (
    <aside className="cart-panel" aria-label="Current order cart">
      <div className="cart-head"><div><p className="eyebrow">Your order</p><h2>Cart</h2></div><ShoppingBag /></div>
      <div className={customerLoggedIn ? "order-mode member" : "order-mode guest"}>
        <div><UserRound /><strong>{customerOrderMode}</strong></div>
        <span>{customerLoggedIn ? `Logged in as ${customerSessionEmail}` : "No account session. Online payment only."}</span>
        {!customerLoggedIn && <button type="button" onClick={onOpenAccount}>Sign in for Cash</button>}
      </div>
      {cart.length ? (
        cart.map((line) => (
          <CartLineItem key={line.id} line={line} menu={menu} onRemove={onRemoveLine} formatMoney={formatMoney} />
        ))
      ) : (
        <div className="empty-cart">Your cart is waiting.<br /><span>Build a pizza to see live totals.</span></div>
      )}
      <div className="summary">
        <div><span>Subtotal</span><b>{formatMoney(totals.subtotal)}</b></div>
        <div><span>Quantity discount</span><b>- {formatMoney(totals.discount)}</b></div>
        <div><span>GST {Math.round(pricingConfig.gstRate * 100)}%</span><b>{formatMoney(totals.gst)}</b></div>
        <div>
          <span>Delivery</span>
          <b>
            {getDeliveryChargeLabel(totals.deliveryCharge, pricingConfig)}
          </b>
        </div>
        <div className="total"><span>Total</span><b>{formatMoney(totals.finalTotal)}</b></div>
      </div>
      <AiCartStrategistCard
        insight={cartInsight}
        loading={cartInsightLoading}
        onAsk={onAskCartInsight}
        onApply={onApplyCartInsight}
      />
      <button className="primary" disabled={!cart.length} onClick={onCheckout} type="button">
        Continue to checkout <Send />
      </button>
    </aside>
  );
}
