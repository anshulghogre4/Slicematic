import { Trash2 } from "lucide-react";

import { summarizeCartLine } from "../../../lib/cart-rail";
import type { CartLine, MenuPayload } from "../../../lib/types";

export type CartLineItemProps = {
  line: CartLine;
  menu: MenuPayload;
  onRemove: (lineId: string) => void;
  formatMoney: (value: number) => string;
};

export function CartLineItem({ line, menu, onRemove, formatMoney }: CartLineItemProps) {
  const summary = summarizeCartLine(line, menu);

  return (
    <article className="cart-line">
      <div>
        <strong>{line.quantity} x {summary.pizzaName}</strong>
        <span>
          {summary.baseName} / {summary.sizeName} /{" "}
          {summary.toppingNames.length ? summary.toppingNames.join(", ") : "No extra toppings"}
        </span>
      </div>
      <div>
        <b>{formatMoney(summary.lineTotal)}</b>
        <button type="button" onClick={() => onRemove(line.id)} aria-label={`Remove ${summary.pizzaName}`}>
          <Trash2 />
        </button>
      </div>
    </article>
  );
}
