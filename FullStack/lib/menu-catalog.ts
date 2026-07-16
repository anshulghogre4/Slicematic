import type { MenuItem } from "./types";

export const MENU_CATEGORIES = ["All", "Veg", "Chicken", "Cheese", "Spicy"] as const;

export type MenuCategory = (typeof MENU_CATEGORIES)[number];

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

export function getDefaultCrustPrice(bases: MenuItem[]): number {
  return bases.find((base) => base.available)?.price ?? 0;
}
