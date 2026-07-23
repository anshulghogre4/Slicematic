import { Utensils } from "lucide-react";

import { EmptyState } from "../../../components/ui/Primitives";

export type CheckoutEmptyPanelProps = {
  onBrowseMenu: () => void;
};

/** Honest bridge when Checkout tab is opened with an empty cart. */
export function CheckoutEmptyPanel({ onBrowseMenu }: CheckoutEmptyPanelProps) {
  return (
    <section className="glass-panel checkout-empty-panel animate-fade-in-up" aria-live="polite">
      <EmptyState
        illustration="empty-cart"
        title="Add a pizza first"
        description="Your cart is empty. Build or add a pizza from the menu before you can check out."
        action={
          <button className="sui-button sui-button--primary" type="button" onClick={onBrowseMenu}>
            <Utensils size={16} aria-hidden="true" /> Browse menu
          </button>
        }
      />
    </section>
  );
}
