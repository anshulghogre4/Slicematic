import { describe, it, expect } from "vitest";
import { loadMenu } from "./data-service";
import * as supabaseModule from "./supabase";

// Mock the supabase server client
import { vi } from "vitest";
vi.mock("./supabase", () => {
  return {
    getSupabaseServerClient: vi.fn()
  };
});

describe("TDD Parity: Menu Loading Logic", () => {
  it("disables items with null-like names and zero prices", async () => {
    const mockSupabase = {
      schema: () => ({
        from: (table: string) => ({
          select: () => ({
            order: () => {
              if (table === "pizza_types") {
                return {
                  data: [
                    { id: 1, pizza_name: "Good Pizza", price: 299 },
                    { id: 2, pizza_name: "na", price: 299 },
                    { id: 3, pizza_name: "NaN", price: 299 },
                    { id: 4, pizza_name: "none", price: 299 },
                    { id: 5, pizza_name: "Bad Pizza", price: 0 },
                    { id: 6, pizza_name: "Negative Pizza", price: -50 }
                  ]
                };
              }
              return { data: [] }; // Return empty for others
            }
          })
        })
      })
    };
    
    vi.mocked(supabaseModule.getSupabaseServerClient).mockReturnValue(mockSupabase as any);

    const menu = await loadMenu();
    
    // Check Pizza 1: Good
    expect(menu.pizzas[0].name).toBe("Good Pizza");
    expect(menu.pizzas[0].price).toBe(299);
    expect(menu.pizzas[0].available).toBe(true);

    // Check Pizza 2: "na" -> disabled
    expect(menu.pizzas[1].name).toBe("Unnamed");
    expect(menu.pizzas[1].price).toBe(0);
    expect(menu.pizzas[1].available).toBe(false);

    // Check Pizza 3: "NaN" -> disabled
    expect(menu.pizzas[2].name).toBe("Unnamed");
    expect(menu.pizzas[2].price).toBe(0);
    expect(menu.pizzas[2].available).toBe(false);

    // Check Pizza 4: "none" -> disabled
    expect(menu.pizzas[3].name).toBe("Unnamed");
    expect(menu.pizzas[3].price).toBe(0);
    expect(menu.pizzas[3].available).toBe(false);

    // Check Pizza 5: Zero price -> disabled
    expect(menu.pizzas[4].price).toBe(0);
    expect(menu.pizzas[4].available).toBe(false);

    // Check Pizza 6: Negative price -> disabled
    expect(menu.pizzas[5].price).toBe(0);
    expect(menu.pizzas[5].available).toBe(false);
  });

  it("deduplicates exact rows", async () => {
    const mockSupabase = {
      schema: () => ({
        from: (table: string) => ({
          select: () => ({
            order: () => {
              if (table === "pizza_bases") {
                return {
                  data: [
                    { id: 1, base_name: "Good Base", price: 100 },
                    { id: 1, base_name: "Good Base", price: 100 }, // Exact duplicate
                    { id: 2, base_name: "Other Base", price: 150 }
                  ]
                };
              }
              return { data: [] }; // Return empty for others
            }
          })
        })
      })
    };
    
    vi.mocked(supabaseModule.getSupabaseServerClient).mockReturnValue(mockSupabase as any);

    const menu = await loadMenu();
    
    // Bases should only have 2 unique items
    expect(menu.bases.length).toBe(2);
    expect(menu.bases[0].name).toBe("Good Base");
    expect(menu.bases[1].name).toBe("Other Base");
  });
});
