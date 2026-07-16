import { ChefHat, Plus, SlidersHorizontal, Sparkles, Star } from "lucide-react";

import type { MenuItem } from "../../../lib/types";
import {
  filterMenuPizzas,
  getDefaultCrustPrice,
  MENU_CATEGORIES
} from "../../../lib/menu-catalog";

export type MenuCatalogProps = {
  pizzas: MenuItem[];
  bases: MenuItem[];
  category: string;
  query: string;
  onCategoryChange: (category: string) => void;
  onCustomize: (pizza: MenuItem) => void;
  onAdd: (pizza: MenuItem) => void;
  formatMoney: (value: number) => string;
};

export function MenuCatalog({
  pizzas,
  bases,
  category,
  query,
  onCategoryChange,
  onCustomize,
  onAdd,
  formatMoney
}: MenuCatalogProps) {
  const filteredPizzas = filterMenuPizzas(pizzas, category, query);
  const defaultCrustPrice = getDefaultCrustPrice(bases);

  return (
    <section className="menu-section">
      <div className="section-head">
        <div><h2>Signature pizzas</h2></div>
        <div className="category-row" aria-label="Pizza categories">
          {MENU_CATEGORIES.map((item) => (
            <button
              key={item}
              className={category === item ? "active" : ""}
              onClick={() => onCategoryChange(item)}
              type="button"
              aria-pressed={category === item}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="menu-grid" aria-live="polite">
        {filteredPizzas.map((pizza) => {
          const isVegetarian = pizza.tags?.includes("Veg") ?? false;

          return (
            <article className="pizza-card" key={pizza.id}>
              <div className="pizza-media">
                <img src={pizza.image} alt={pizza.name} />
                <span><Sparkles /> {pizza.badge}</span>
                <b><Star /> 4.{pizza.id}</b>
              </div>
              <div className="pizza-body">
                <div>
                  <h3 style={{ display: "inline-flex", alignItems: "center" }}>
                    <span
                      aria-label={isVegetarian ? "Vegetarian" : "Non-vegetarian"}
                      role="img"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "12px",
                        height: "12px",
                        border: `1px solid ${isVegetarian ? "#10b981" : "#ef4444"}`,
                        padding: "2px",
                        marginRight: "8px",
                        flexShrink: 0
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          backgroundColor: isVegetarian ? "#10b981" : "#ef4444"
                        }}
                      />
                    </span>
                    {pizza.name}
                  </h3>
                  <strong>{formatMoney(pizza.price + defaultCrustPrice)}</strong>
                </div>
                <p>{pizza.description}</p>
                <div className="chips">
                  <span><ChefHat /> Fresh</span>
                  <span>{pizza.prepMinutes} min</span>
                  {pizza.tags?.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}
                </div>
              </div>
              <div className="pizza-actions">
                <button className="primary" onClick={() => onCustomize(pizza)} type="button">
                  <SlidersHorizontal /> Customize
                </button>
                <button onClick={() => onAdd(pizza)} type="button" aria-label={`Add ${pizza.name}`}>
                  <Plus />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
