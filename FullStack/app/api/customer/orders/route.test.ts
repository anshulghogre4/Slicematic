import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../lib/customer-auth", () => ({
  requireCustomerOwnership: vi.fn()
}));
vi.mock("../../../../lib/data-service", () => ({
  loadCustomerOrderHistoryByCustomerId: vi.fn()
}));
vi.mock("../../../../lib/supabase", () => ({
  hasSupabaseEnv: vi.fn(() => true),
  hasSupabaseAdminEnv: vi.fn(() => true)
}));

import { GET } from "./route";
import { requireCustomerOwnership } from "../../../../lib/customer-auth";
import { loadCustomerOrderHistoryByCustomerId } from "../../../../lib/data-service";

const VALID_UUID = "11111111-1111-4111-8111-111111111111";

describe("GET /api/customer/orders", () => {
  beforeEach(() => {
    vi.mocked(requireCustomerOwnership).mockReset();
    vi.mocked(loadCustomerOrderHistoryByCustomerId).mockReset();
  });

  it("short-circuits with the auth helper's response when ownership check fails", async () => {
    vi.mocked(requireCustomerOwnership).mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: "nope" }), { status: 403 }) as any
    );

    const request = new Request(`http://localhost/api/customer/orders?customer_id=${VALID_UUID}`);
    const response = await GET(request);

    expect(response.status).toBe(403);
    expect(loadCustomerOrderHistoryByCustomerId).not.toHaveBeenCalled();
  });

  it("returns order history once ownership is verified", async () => {
    vi.mocked(requireCustomerOwnership).mockResolvedValue(null);
    vi.mocked(loadCustomerOrderHistoryByCustomerId).mockResolvedValue({ orders: [], customer_id: VALID_UUID });

    const request = new Request(`http://localhost/api/customer/orders?customer_id=${VALID_UUID}`);
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(requireCustomerOwnership).toHaveBeenCalledWith(request, { customerId: VALID_UUID });
  });

  it("rejects malformed customer_id before calling the ownership check", async () => {
    const request = new Request("http://localhost/api/customer/orders?customer_id=not-a-uuid");
    const response = await GET(request);

    expect(response.status).toBe(400);
    expect(requireCustomerOwnership).not.toHaveBeenCalled();
  });
});
