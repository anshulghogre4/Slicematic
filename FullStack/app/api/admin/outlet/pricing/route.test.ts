import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../../lib/supabase", () => ({
  hasSupabaseAdminEnv: vi.fn(),
  getSupabaseServerClient: vi.fn()
}));

import * as supabaseModule from "../../../../../lib/supabase";
import { GET, POST } from "./route";

function buildRequest(method: "GET" | "POST", token?: string, body?: unknown) {
  return new Request("http://localhost/api/admin/outlet/pricing", {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: method === "POST" ? JSON.stringify(body ?? {}) : undefined
  });
}

describe("GET /api/admin/outlet/pricing", () => {
  beforeEach(() => {
    vi.mocked(supabaseModule.hasSupabaseAdminEnv).mockReturnValue(true);
  });

  it("returns 401 without a token", async () => {
    const response = await GET(buildRequest("GET"));
    expect(response.status).toBe(401);
  });

  it("succeeds with a demo-bypass token", async () => {
    vi.mocked(supabaseModule.getSupabaseServerClient).mockReturnValue(null);
    const response = await GET(buildRequest("GET", "demo-bypass"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.pricingConfig.gstRate).toBeCloseTo(0.18);
  });
});

describe("POST /api/admin/outlet/pricing", () => {
  beforeEach(() => {
    vi.mocked(supabaseModule.hasSupabaseAdminEnv).mockReturnValue(true);
  });

  it("returns 401 without a token", async () => {
    const response = await POST(buildRequest("POST", undefined, { pricingConfig: { gstRate: 0.2 } }));
    expect(response.status).toBe(401);
  });

  it("sanitizes bad input and reports failure when Supabase is unavailable", async () => {
    vi.mocked(supabaseModule.getSupabaseServerClient).mockReturnValue(null);
    const response = await POST(
      buildRequest("POST", "demo-bypass", { pricingConfig: { gstRate: 5, maxOrderQty: -3 } })
    );
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.ok).toBe(false);
  });

  it("POST with valid config saves and returns updated config", async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabaseModule.getSupabaseServerClient).mockReturnValue({
      schema: () => ({ from: () => ({ upsert: mockUpsert }) })
    } as any);
    
    const response = await POST(
      buildRequest("POST", "demo-bypass", { pricingConfig: { gstRate: 0.10 } })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.pricingConfig.gstRate).toBeCloseTo(0.10);
    expect(mockUpsert).toHaveBeenCalledOnce();
  });
});

