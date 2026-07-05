import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../lib/supabase", () => ({
  hasSupabaseAdminEnv: vi.fn(),
  getSupabaseServerClient: vi.fn(),
  getSupabaseAdminClient: vi.fn()
}));

import * as supabaseModule from "../../../../lib/supabase";
import { PATCH } from "./route";

function buildRequest(body: unknown, token?: string) {
  return new Request("http://localhost/api/admin/menu", {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
}

describe("PATCH /api/admin/menu", () => {
  beforeEach(() => {
    vi.mocked(supabaseModule.hasSupabaseAdminEnv).mockReturnValue(true);
  });

  it("returns 401 without a token", async () => {
    const response = await PATCH(
      buildRequest({ section: "pizzas", id: 1, item: { name: "Margherita", price: 299 } })
    );
    expect(response.status).toBe(401);
  });

  it("returns 401 with a garbage token", async () => {
    vi.mocked(supabaseModule.getSupabaseServerClient).mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error("bad token") }) }
    } as any);

    const response = await PATCH(
      buildRequest({ section: "pizzas", id: 1, item: { name: "Margherita", price: 299 } }, "garbage-token")
    );
    expect(response.status).toBe(401);
  });

  it("rejects an invalid name/price with demo-bypass token", async () => {
    const response = await PATCH(
      buildRequest({ section: "pizzas", id: 1, item: { name: "A", price: -5 } }, "demo-bypass")
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.errors.name).toMatch(/2-60 characters/);
    expect(body.errors.price).toMatch(/positive number/);
  });

  it("updates a pizza row in Supabase and returns the updated item with demo-bypass token", async () => {
    const updatedRow = {
      pizza_type_id: 1,
      code: "P1",
      pizza_name: "Updated Margherita",
      price: 349,
      description: "Classic, refreshed.",
      image_url: "/assets/pizza-hero.jpg",
      badge: "Signature",
      tags: ["Veg"],
      prep_minutes: 20,
      is_available: false
    };
    const single = vi.fn().mockResolvedValue({ data: updatedRow, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });
    const schema = vi.fn().mockReturnValue({ from });
    vi.mocked(supabaseModule.getSupabaseServerClient).mockReturnValue({ schema } as any);

    const response = await PATCH(
      buildRequest(
        { section: "pizzas", id: 1, item: { name: "Updated Margherita", price: 349, available: false } },
        "demo-bypass"
      )
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.item).toMatchObject({ id: 1, name: "Updated Margherita", price: 349, available: false });
    expect(schema).toHaveBeenCalledWith("slicematic");
    expect(from).toHaveBeenCalledWith("pizza_types");
    expect(eq).toHaveBeenCalledWith("pizza_type_id", 1);
  });
});
