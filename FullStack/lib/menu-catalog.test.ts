import { describe, expect, it } from "vitest";
import { seedMenu } from "./seed-data";
import { filterMenuPizzas, getDefaultCrustPrice } from "./menu-catalog";

describe("menu catalog helpers", () => {
  it("returns only available pizzas for the All category", () => {
    const pizzas = seedMenu.pizzas.map((pizza) =>
      pizza.id === 1 ? { ...pizza, available: false } : pizza
    );

    expect(filterMenuPizzas(pizzas, "All", "").some((pizza) => pizza.id === 1)).toBe(false);
  });

  it("filters pizzas by category and case-insensitive menu text", () => {
    const results = filterMenuPizzas(seedMenu.pizzas, "Veg", "PANEER spicy");

    expect(results.map((pizza) => pizza.name)).toEqual(["Paneer Tikka"]);
  });

  it("matches descriptions and tags", () => {
    expect(filterMenuPizzas(seedMenu.pizzas, "All", "slow-melted")[0]?.name).toBe("Chicago Deep Dish");
    expect(filterMenuPizzas(seedMenu.pizzas, "All", "smoky")[0]?.name).toBe("BBQ Chicken");
  });

  it("uses the first available base for the displayed starting price", () => {
    const bases = seedMenu.bases.map((base, index) =>
      index === 0 ? { ...base, available: false } : base
    );

    expect(getDefaultCrustPrice(bases)).toBe(seedMenu.bases[1].price);
    expect(getDefaultCrustPrice([])).toBe(0);
  });
});
