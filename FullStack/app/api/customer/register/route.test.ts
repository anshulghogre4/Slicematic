import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../lib/customer-auth", () => ({
  requireCustomerOwnership: vi.fn()
}));
vi.mock("../../../../lib/data-service", () => ({
  registerCustomer: vi.fn()
}));

import { POST } from "./route";
import { requireCustomerOwnership } from "../../../../lib/customer-auth";
import { registerCustomer } from "../../../../lib/data-service";

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/customer/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/customer/register", () => {
  beforeEach(() => {
    vi.mocked(requireCustomerOwnership).mockReset();
    vi.mocked(registerCustomer).mockReset();
  });

  it("short-circuits with the auth helper's response when ownership check fails (prevents registering/probing another person's email)", async () => {
    vi.mocked(requireCustomerOwnership).mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: "nope" }), { status: 403 }) as any
    );

    const request = makeRequest({ name: "Aarav Sharma", phone: "9876543210", email: "victim@slicematic.in", city: "Delhi NCR" });
    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(registerCustomer).not.toHaveBeenCalled();
  });

  it("registers the customer once ownership of the email being registered is verified", async () => {
    vi.mocked(requireCustomerOwnership).mockResolvedValue(null);
    vi.mocked(registerCustomer).mockResolvedValue("new-customer-id");

    const request = makeRequest({ name: "Aarav Sharma", phone: "9876543210", email: "aarav@slicematic.in", city: "Delhi NCR" });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.customer_id).toBe("new-customer-id");
    expect(requireCustomerOwnership).toHaveBeenCalledWith(request, { identifier: "aarav@slicematic.in" });
  });
});
