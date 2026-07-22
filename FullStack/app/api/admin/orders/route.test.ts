import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../lib/supabase", () => ({
  hasSupabaseAdminEnv: vi.fn(),
  getSupabaseServerClient: vi.fn()
}));

vi.mock("../../../../lib/data-service", () => ({
  loadAdminSummary: vi.fn()
}));

import * as supabaseModule from "../../../../lib/supabase";
import * as dataService from "../../../../lib/data-service";
import { GET } from "./route";

function buildRequest(token?: string, format?: string) {
  const url = format
    ? `http://localhost/api/admin/orders?format=${format}`
    : "http://localhost/api/admin/orders";
  return new Request(url, {
    method: "GET",
    headers: token ? { authorization: `Bearer ${token}` } : undefined
  });
}

const emptySummary = {
  totalRevenue: 0,
  orderCount: 0,
  avgOrderValue: 0,
  topPizza: "N/A",
  busiestHour: "N/A",
  paymentMix: [],
  hourlyDemand: [],
  recentOrders: [],
  forecast: []
};

describe("GET /api/admin/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dataService.loadAdminSummary).mockResolvedValue(emptySummary as any);
  });

  it("returns 401 without a token when admin env is configured", async () => {
    vi.mocked(supabaseModule.hasSupabaseAdminEnv).mockReturnValue(true);
    const response = await GET(buildRequest());
    expect(response.status).toBe(401);
    expect(dataService.loadAdminSummary).not.toHaveBeenCalled();
  });

  it("returns summary JSON with demo-bypass when admin env is configured", async () => {
    vi.mocked(supabaseModule.hasSupabaseAdminEnv).mockReturnValue(true);
    const response = await GET(buildRequest("demo-bypass"));
    expect(response.status).toBe(200);
    expect(dataService.loadAdminSummary).toHaveBeenCalledOnce();
    const body = await response.json();
    expect(body.orderCount).toBe(0);
  });

  it("returns CSV with demo-bypass when format=csv", async () => {
    vi.mocked(supabaseModule.hasSupabaseAdminEnv).mockReturnValue(true);
    const response = await GET(buildRequest("demo-bypass", "csv"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/text\/csv/);
    const text = await response.text();
    expect(text).toContain("order_id,created_at,customer_name");
  });

  it("skips auth and loads summary when admin env is absent (demo mode)", async () => {
    vi.mocked(supabaseModule.hasSupabaseAdminEnv).mockReturnValue(false);
    const response = await GET(buildRequest());
    expect(response.status).toBe(200);
    expect(dataService.loadAdminSummary).toHaveBeenCalledOnce();
  });
});
