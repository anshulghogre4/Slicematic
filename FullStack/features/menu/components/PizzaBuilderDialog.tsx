"use client";

import { ShoppingBag, X } from "lucide-react";

import { getLineUnitPrice, money } from "../../../lib/pricing";
import type { MenuItem, MenuPayload } from "../../../lib/types";

export type PizzaBuilderValue = {
  baseId: number;
  sizeId: string;
  toppingIds: number[];
  quantity: number;
};

type PizzaBuilderDialogProps = {
  pizza: MenuItem;
  menu: MenuPayload;
  value: PizzaBuilderValue;
  maxQuantity: number;
  onChange: (value: PizzaBuilderValue) => void;
  onAddToCart: () => void;
  onClose: () => void;
};

export function PizzaBuilderDialog({
  pizza,
  menu,
  value,
  maxQuantity,
  onChange,
  onAddToCart,
  onClose
}: PizzaBuilderDialogProps) {
  const activeBases = menu.bases.filter((base) => base.available);
  const activeSizes = menu.sizes.filter((size) => size.available);
  const activeToppings = menu.toppings.filter((topping) => topping.available);
  const titleId = `pizza-builder-title-${pizza.id}`;
  const descriptionId = `pizza-builder-description-${pizza.id}`;
  const unitPrice = getLineUnitPrice(
    {
      id: "preview",
      pizzaId: pizza.id,
      baseId: value.baseId,
      sizeId: value.sizeId,
      toppingIds: value.toppingIds,
      quantity: 1
    },
    menu
  );

  function update(nextValue: Partial<PizzaBuilderValue>) {
    onChange({ ...value, ...nextValue });
  }

  function toggleTopping(toppingId: number, checked: boolean) {
    update({
      toppingIds: checked
        ? [...value.toppingIds, toppingId]
        : value.toppingIds.filter((id) => id !== toppingId)
    });
  }

  return (
    <div className="builder-overlay" onClick={onClose}>
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="builder-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <img src={pizza.image} alt={pizza.name} />
        <div style={{ position: "relative" }}>
          <button
            aria-label="Close pizza customizer"
            onClick={onClose}
            style={{
              position: "absolute",
              top: "0",
              right: "0",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0.5rem"
            }}
            type="button"
          >
            <X aria-hidden="true" size={24} />
          </button>

          <p className="eyebrow">Customize pizza</p>
          <h2 id={titleId}>{pizza.name}</h2>
          <p id={descriptionId}>{pizza.description}</p>

          <div className="builder-group">
            <h3>Crust</h3>
            {activeBases.map((base) => (
              <button
                aria-pressed={value.baseId === base.id}
                className={value.baseId === base.id ? "active" : ""}
                key={base.id}
                onClick={() => update({ baseId: base.id })}
                type="button"
              >
                {base.name}<span>{money(base.price)}</span>
              </button>
            ))}
          </div>

          <div className="builder-group">
            <h3>Size</h3>
            {activeSizes.map((size) => (
              <button
                aria-pressed={value.sizeId === size.id}
                className={value.sizeId === size.id ? "active" : ""}
                key={size.id}
                onClick={() => update({ sizeId: size.id })}
                type="button"
              >
                {size.name}<span>{size.extra ? `+ ${money(size.extra)}` : "Included"}</span>
              </button>
            ))}
          </div>

          <div className="builder-group toppings">
            <h3>Toppings</h3>
            {activeToppings.map((topping) => (
              <label key={topping.id}>
                <input
                  checked={value.toppingIds.includes(topping.id)}
                  onChange={(event) => toggleTopping(topping.id, event.target.checked)}
                  type="checkbox"
                />
                {topping.name}<span>+ {money(topping.price)}</span>
              </label>
            ))}
          </div>

          <div className="builder-footer">
            <input
              aria-label="Pizza quantity"
              max={maxQuantity}
              min={1}
              onChange={(event) => update({ quantity: Number(event.target.value) })}
              type="number"
              value={value.quantity}
            />
            <strong aria-live="polite">{money(unitPrice * value.quantity)}</strong>
            <button className="primary" onClick={onAddToCart} type="button">
              <ShoppingBag aria-hidden="true" /> Add to cart
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
