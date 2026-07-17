"use client";

import { ShoppingBag, X, Check } from "lucide-react";
import { useEffect, useRef } from "react";

import { getLineUnitPrice, money } from "../../../lib/pricing";
import type { MenuItem, MenuPayload } from "../../../lib/types";
import { QuantityStepper } from "../../../components/ui/Primitives";

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
  const panelRef = useRef<HTMLElement>(null);

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

  const lineTotal = unitPrice * value.quantity;

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

  /* Focus trap: trap focus inside the dialog */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <>
      {/* Overlay with backdrop blur */}
      <div className="bottom-sheet-overlay" onClick={onClose} aria-hidden="true" />

      {/* Dialog / Bottom sheet */}
      <section
        ref={panelRef}
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="bottom-sheet"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        style={{ maxWidth: 540, margin: "0 auto" }}
      >
        {/* Drag handle */}
        <div className="bottom-sheet__handle" />

        {/* Hero image */}
        {pizza.image && (
          <div
            style={{
              width: "100%",
              height: 180,
              background: `url(${pizza.image}) center / cover, linear-gradient(135deg, var(--dough), var(--mozzarella))`,
              borderRadius: 0,
            }}
            role="img"
            aria-label={pizza.name}
          />
        )}

        {/* Content */}
        <div style={{ padding: "var(--space-lg)", paddingBottom: "var(--space-sm)" }}>
          {/* Close button */}
          <button
            aria-label="Close pizza customizer"
            onClick={onClose}
            type="button"
            style={{
              position: "absolute",
              top: "var(--space-sm)",
              right: "var(--space-sm)",
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--glass-strong)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              border: "1px solid var(--sui-border-soft)",
              borderRadius: "var(--sui-radius-sm)",
              cursor: "pointer",
              color: "var(--sui-text-secondary)",
              zIndex: 2,
            }}
          >
            <X size={18} />
          </button>

          <p style={{ fontSize: "var(--text-micro)", fontWeight: 700, color: "var(--sui-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>
            Customize pizza
          </p>
          <h2 id={titleId} style={{ fontSize: "var(--text-title)", fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
            {pizza.name}
          </h2>
          <p id={descriptionId} style={{ fontSize: "var(--text-small)", color: "var(--sui-text-secondary)", margin: "0 0 var(--space-lg)", lineHeight: 1.5 }}>
            {pizza.description}
          </p>

          {/* Crust selection */}
          <div style={{ marginBottom: "var(--space-lg)" }}>
            <h3 style={{ fontSize: "var(--text-small)", fontWeight: 700, margin: "0 0 var(--space-sm)", color: "var(--sui-text-primary)" }}>Crust</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
              {activeBases.map((base) => (
                <button
                  key={base.id}
                  type="button"
                  onClick={() => update({ baseId: base.id })}
                  aria-pressed={value.baseId === base.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    border: `2px solid ${value.baseId === base.id ? "var(--tomato)" : "var(--sui-border)"}`,
                    borderRadius: "var(--sui-radius-sm)",
                    background: value.baseId === base.id ? "rgba(197, 54, 44, 0.04)" : "var(--sui-surface-card)",
                    cursor: "pointer",
                    transition: "border-color var(--sui-motion-fast) ease, background var(--sui-motion-fast) ease",
                    color: "var(--sui-text-primary)",
                    fontWeight: 600,
                    fontSize: "var(--text-body)",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {value.baseId === base.id && <Check size={16} style={{ color: "var(--tomato)" }} />}
                    {base.name}
                  </span>
                  <span style={{ color: "var(--sui-text-secondary)", fontWeight: 700 }}>{money(base.price)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Size selection */}
          <div style={{ marginBottom: "var(--space-lg)" }}>
            <h3 style={{ fontSize: "var(--text-small)", fontWeight: 700, margin: "0 0 var(--space-sm)", color: "var(--sui-text-primary)" }}>Size</h3>
            <div style={{ display: "flex", gap: "var(--space-sm)" }}>
              {activeSizes.map((size) => (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => update({ sizeId: size.id })}
                  aria-pressed={value.sizeId === size.id}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    border: `2px solid ${value.sizeId === size.id ? "var(--tomato)" : "var(--sui-border)"}`,
                    borderRadius: "var(--sui-radius-sm)",
                    background: value.sizeId === size.id ? "rgba(197, 54, 44, 0.04)" : "var(--sui-surface-card)",
                    cursor: "pointer",
                    transition: "border-color var(--sui-motion-fast) ease, background var(--sui-motion-fast) ease",
                    textAlign: "center",
                    color: "var(--sui-text-primary)",
                    fontWeight: 600,
                    fontSize: "var(--text-body)",
                  }}
                >
                  {size.name}
                  <br />
                  <span style={{ fontSize: "var(--text-micro)", color: "var(--sui-text-secondary)", fontWeight: 700 }}>
                    {size.extra ? `+ ${money(size.extra)}` : "Included"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Toppings */}
          <div style={{ marginBottom: "var(--space-lg)" }}>
            <h3 style={{ fontSize: "var(--text-small)", fontWeight: 700, margin: "0 0 var(--space-sm)", color: "var(--sui-text-primary)" }}>Toppings</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "var(--space-sm)" }}>
              {activeToppings.map((topping) => {
                const isSelected = value.toppingIds.includes(topping.id);
                return (
                  <label
                    key={topping.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      border: `1.5px solid ${isSelected ? "var(--basil)" : "var(--sui-border)"}`,
                      borderRadius: "var(--sui-radius-sm)",
                      background: isSelected ? "var(--sui-success-soft)" : "var(--sui-surface-card)",
                      cursor: "pointer",
                      transition: "border-color var(--sui-motion-fast) ease, background var(--sui-motion-fast) ease",
                      fontSize: "var(--text-small)",
                      fontWeight: 600,
                      color: "var(--sui-text-primary)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => toggleTopping(topping.id, e.target.checked)}
                      style={{ accentColor: "var(--basil)", width: 16, height: 16 }}
                    />
                    <span style={{ flex: 1 }}>{topping.name}</span>
                    <span style={{ color: "var(--sui-text-secondary)", fontWeight: 700, fontSize: "var(--text-micro)" }}>
                      + {money(topping.price)}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sticky footer with quantity + price + add to cart */}
        <div className="bottom-sheet__sticky-footer">
          <QuantityStepper
            value={value.quantity}
            min={1}
            max={maxQuantity}
            onChange={(qty) => update({ quantity: qty })}
          />
          <strong
            style={{
              fontSize: "var(--text-title)",
              fontWeight: 800,
              color: "var(--tomato)",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.01em",
            }}
            aria-live="polite"
          >
            {money(lineTotal)}
          </strong>
          <button
            className="sui-button sui-button--primary sui-button--lg"
            onClick={onAddToCart}
            type="button"
            style={{ flex: "0 0 auto" }}
          >
            <ShoppingBag size={18} /> Add to cart
          </button>
        </div>
      </section>
    </>
  );
}
