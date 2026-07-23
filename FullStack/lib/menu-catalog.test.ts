import { describe, expect, it } from "vitest";
import { seedMenu } from "./seed-data";
import {
  filterMenuPizzas,
  getDefaultCrustPrice,
  isHousePickPizza,
  sortMenuPizzasForDisplay,
} from "./menu-catalog";

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

  it("recognizes house-pick badges", () => {
    expect(isHousePickPizza({ ...seedMenu.pizzas[0], badge: "Fastest bake" })).toBe(true);
    expect(isHousePickPizza({ ...seedMenu.pizzas[0], badge: "Loaded" })).toBe(false);
    expect(isHousePickPizza({ ...seedMenu.pizzas[0], badge: "Local favorite" })).toBe(true);
  });

  it("sorts house picks first on the default browse view only", () => {
    const sorted = sortMenuPizzasForDisplay(seedMenu.pizzas, "All", "");
    const firstNames = sorted.slice(0, 3).map((p) => p.name);
    expect(firstNames.every((name) => {
      const pizza = seedMenu.pizzas.find((p) => p.name === name)!;
      return isHousePickPizza(pizza);
    })).toBe(true);

    const vegSorted = sortMenuPizzasForDisplay(seedMenu.pizzas, "Veg", "");
    const vegFiltered = filterMenuPizzas(seedMenu.pizzas, "Veg", "");
    expect(vegSorted.map((p) => p.id)).toEqual(vegFiltered.map((p) => p.id));
  });
});
