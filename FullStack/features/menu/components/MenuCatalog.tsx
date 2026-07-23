"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus, Search, SlidersHorizontal } from "lucide-react";

import type { MenuItem } from "../../../lib/types";
import {
  getDefaultCrustPrice,
  isHousePickPizza,
  MENU_CATEGORIES,
  sortMenuPizzasForDisplay,
} from "../../../lib/menu-catalog";
import { MenuCardSkeleton, EmptyState, FilterChip, TagChip } from "../../../components/ui";
import { money } from "../../../lib/pricing";

export type MenuCatalogProps = {
  pizzas: MenuItem[];
  bases: MenuItem[];
  /** Initial category — component manages its own state after mount */
  category?: string;
  /** Initial query — component manages its own state after mount */
  query?: string;
  onQueryChange?: (query: string) => void;
  onCategoryChange?: (category: string) => void;
  onCustomize: (pizza: MenuItem) => void;
  onAdd: (pizza: MenuItem) => void;
  formatMoney?: (value: number) => string;
  loading?: boolean;
};

export function MenuCatalog({
  pizzas,
  bases,
  category: initialCategory = "All",
  query: initialQuery = "",
  onQueryChange,
  onCategoryChange,
  onCustomize,
  onAdd,
  formatMoney = money,
  loading = false,
}: MenuCatalogProps) {
  // Fully self-managed — parent can pass initial values but doesn't need to own state
  const [localCategory, setLocalCategory] = useState(initialCategory || "All");
  const [localQuery, setLocalQuery] = useState(initialQuery || "");
  const [justAdded, setJustAdded] = useState<number | null>(null);

  // Sync if parent explicitly changes the prop (controlled usage)
  useEffect(() => { if (initialCategory) setLocalCategory(initialCategory); }, [initialCategory]);
  useEffect(() => { if (initialQuery !== undefined) setLocalQuery(initialQuery); }, [initialQuery]);

  const filteredPizzas = sortMenuPizzasForDisplay(pizzas, localCategory, localQuery);
  const defaultCrustPrice = getDefaultCrustPrice(bases);
  const housePickCount = filteredPizzas.filter(isHousePickPizza).length;
  const isDefaultBrowse = localCategory === "All" && !localQuery.trim();

  function handleCategoryChange(cat: string) {
    setLocalCategory(cat);
    onCategoryChange?.(cat);
  }
  function handleQueryChange(q: string) {
    setLocalQuery(q);
    onQueryChange?.(q);
  }

  function clearFilters() {
    handleCategoryChange("All");
    handleQueryChange("");
  }

  const handleAdd = useCallback((pizza: MenuItem) => {
    onAdd(pizza);
    setJustAdded(pizza.id);
    setTimeout(() => setJustAdded(null), 450);
  }, [onAdd]);

  return (
    <section className="menu-section animate-fade-in-up" aria-busy={loading || undefined}>
      {/* Section header */}
      <div className="section-head" style={{ marginBottom: "var(--space-md)" }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 4 }}>Live outlet menu</p>
          <h2 className="section-heading">Signature pizzas</h2>
          <p className="section-subheading" style={{ marginTop: 4 }}>
            Customize crust, size, and toppings.{" "}
            {isDefaultBrowse && housePickCount > 0
              ? "House picks appear first."
              : "Filter or search to narrow the list."}
          </p>
        </div>
        {!loading && filteredPizzas.length > 0 ? (
          <p className="menu-section__count" aria-live="polite">
            {filteredPizzas.length} pizza{filteredPizzas.length === 1 ? "" : "s"}
            {isDefaultBrowse && housePickCount > 0 ? ` · ${housePickCount} house pick${housePickCount === 1 ? "" : "s"}` : ""}
          </p>
        ) : null}
      </div>

      {/* Filter bar with search + category chips */}
      <div className="filter-bar" role="toolbar" aria-label="Menu filters">
        <label className="filter-bar__search-wrap">
          <Search size={16} aria-hidden="true" className="filter-bar__search-icon" />
          <input
            className="filter-bar__search"
            type="search"
            placeholder="Search pizzas…"
            value={localQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            aria-label="Search menu"
          />
        </label>
        {MENU_CATEGORIES.map((item) => (
          <FilterChip
            key={item}
            label={item}
            active={localCategory === item}
            onClick={() => handleCategoryChange(item)}
          />
        ))}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="menu-grid stagger-children" aria-label="Loading menu">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <MenuCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredPizzas.length === 0 ? (
        <EmptyState
          illustration="empty-cart"
          title="No pizzas found"
          description={
            localQuery
              ? `No results for “${localQuery}”. Try a different search or clear filters.`
              : "No pizzas match this filter."
          }
          action={
            <button
              type="button"
              className="sui-button sui-button--secondary"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          }
        />
      ) : (
        /* Pizza grid with stagger animation */
        <div className="menu-grid stagger-children" aria-live="polite">
          {filteredPizzas.map((pizza) => {
            const isVegetarian = pizza.tags?.includes("Veg") ?? false;
            const isSpicy = pizza.tags?.includes("Spicy") ?? false;
            const isBestseller = pizza.badge?.toLowerCase().includes("best") ?? false;
            const isHousePick = isHousePickPizza(pizza);

            return (
              <article
                className={`menu-card-premium${isHousePick ? " menu-card-premium--featured" : ""}`}
                key={pizza.id}
              >
                {/* Image area */}
                <div
                  className="menu-card-premium__image"
                  style={pizza.image ? { backgroundImage: `url(${pizza.image})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                  role="img"
                  aria-label={pizza.name}
                >
                  {pizza.badge ? (
                    <span className="menu-card-premium__badge">{pizza.badge}</span>
                  ) : null}
                  {isHousePick ? (
                    <span className="menu-card-premium__featured-flag">House pick</span>
                  ) : null}
                </div>

                {/* Body */}
                <div className="menu-card-premium__body">
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="menu-card-premium__name">{pizza.name}</span>
                  </div>
                  <span className="menu-card-premium__price">{formatMoney(pizza.price + defaultCrustPrice)}</span>
                  {pizza.description && (
                    <p style={{ margin: 0, fontSize: "var(--text-small)", color: "var(--sui-text-secondary)", lineHeight: 1.4 }}>
                      {pizza.description}
                    </p>
                  )}
                  {/* Tag chips */}
                  <div className="menu-card-premium__tags">
                    {isVegetarian && <TagChip variant="veg">Veg</TagChip>}
                    {isSpicy && <TagChip variant="spicy">Spicy</TagChip>}
                    {isBestseller && <TagChip variant="popular">Bestseller</TagChip>}
                    {pizza.prepMinutes && pizza.prepMinutes <= 15 && (
                      <TagChip variant="fast">{pizza.prepMinutes} min</TagChip>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="menu-card-premium__actions">
                  <button
                    className={`menu-card-premium__add-btn ${justAdded === pizza.id ? "just-added" : ""}`}
                    onClick={() => handleAdd(pizza)}
                    type="button"
                    aria-label={`Add ${pizza.name} to cart`}
                  >
                    <Plus size={16} /> Add
                  </button>
                  <button
                    className="menu-card-premium__customize-btn"
                    onClick={() => onCustomize(pizza)}
                    type="button"
                    aria-label={`Customize ${pizza.name}`}
                  >
                    <SlidersHorizontal size={14} aria-hidden="true" /> Customize
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
