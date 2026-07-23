import type { MenuItem } from "./types";

export const MENU_CATEGORIES = ["All", "Veg", "Chicken", "Cheese", "Spicy"] as const;

export type MenuCategory = (typeof MENU_CATEGORIES)[number];

/** House-pick badges that should sort first and get featured card treatment. */
const HOUSE_PICK_BADGE = /local favorite|best value|fastest bake|bestseller|best seller/i;

export function isHousePickPizza(pizza: MenuItem): boolean {
  return Boolean(pizza.badge && HOUSE_PICK_BADGE.test(pizza.badge));
}

export function filterMenuPizzas(
  pizzas: MenuItem[],
  category: string,
  query: string
): MenuItem[] {
  const normalizedQuery = query.trim().toLowerCase();

  return pizzas.filter((pizza) => {
    if (!pizza.available) return false;

    const matchesCategory = category === "All" || pizza.tags?.includes(category);
    const haystack = `${pizza.name} ${pizza.description ?? ""} ${pizza.tags?.join(" ") ?? ""}`.toLowerCase();

    return Boolean(matchesCategory && haystack.includes(normalizedQuery));
  });
}

/** Default browse view: house picks first, then A–Z. Filtered views keep filter order. */
export function sortMenuPizzasForDisplay(
  pizzas: MenuItem[],
  category: string,
  query: string
): MenuItem[] {
  const filtered = filterMenuPizzas(pizzas, category, query);
  if (category !== "All" || query.trim()) return filtered;

  return [...filtered].sort((a, b) => {
    const aPick = isHousePickPizza(a) ? 0 : 1;
    const bPick = isHousePickPizza(b) ? 0 : 1;
    if (aPick !== bPick) return aPick - bPick;
    return a.name.localeCompare(b.name);
  });
}

export function getDefaultCrustPrice(bases: MenuItem[]): number {
  return bases.find((base) => base.available)?.price ?? 0;
}
