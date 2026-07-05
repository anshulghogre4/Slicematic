import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../../lib/supabase", () => ({
  hasSupabaseAdminEnv: vi.fn(),
  getSupabaseServerClient: vi.fn()
}));

import * as supabaseModule from "../../../../../lib/supabase";
import { GET, POST } from "./route";

function buildRequest(method: "GET" | "POST", token?: string, body?: unknown) {
  return new Request("http://localhost/api/admin/outlet/brand", {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: method === "POST" ? JSON.stringify(body ?? {}) : undefined
  });
}

describe("GET /api/admin/outlet/brand", () => {
  beforeEach(() => {
    vi.mocked(supabaseModule.hasSupabaseAdminEnv).mockReturnValue(true);
  });

  it("returns 200 with brandConfig if found", async () => {
    vi.mocked(supabaseModule.getSupabaseServerClient).mockReturnValue({
      schema: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { setting_value: { name: "Test Brand" } }, error: null })
            })
          })
        })
      })
    } as any);

    const response = await GET(buildRequest("GET", "demo-bypass"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.brandConfig.name).toBe("Test Brand");
  });
});

describe("POST /api/admin/outlet/brand", () => {
  beforeEach(() => {
    vi.mocked(supabaseModule.hasSupabaseAdminEnv).mockReturnValue(true);
  });

  it("returns 401 without a token", async () => {
    const response = await POST(buildRequest("POST", undefined, { brandConfig: { name: "Test" } }));
    expect(response.status).toBe(401);
  });

  it("POST with valid config saves and returns ok", async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabaseModule.getSupabaseServerClient).mockReturnValue({
      schema: () => ({ from: () => ({ upsert: mockUpsert }) })
    } as any);
    
    const response = await POST(
      buildRequest("POST", "demo-bypass", { brandConfig: { name: "Test" } })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(mockUpsert).toHaveBeenCalledOnce();
  });
});
