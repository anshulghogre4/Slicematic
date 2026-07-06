import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../lib/customer-auth", () => ({
  requireCustomerOwnership: vi.fn()
}));
vi.mock("../../../../lib/data-service", () => ({
  lookupCustomerProfile: vi.fn()
}));

import { GET } from "./route";
import { requireCustomerOwnership } from "../../../../lib/customer-auth";
import { lookupCustomerProfile } from "../../../../lib/data-service";

describe("GET /api/customer/profile", () => {
  beforeEach(() => {
    vi.mocked(requireCustomerOwnership).mockReset();
    vi.mocked(lookupCustomerProfile).mockReset();
  });

  it("short-circuits with the auth helper's response when ownership check fails", async () => {
    vi.mocked(requireCustomerOwnership).mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: "nope" }), { status: 403 }) as any
    );

    const request = new Request("http://localhost/api/customer/profile?identifier=a@b.com");
    const response = await GET(request);

    expect(response.status).toBe(403);
    expect(lookupCustomerProfile).not.toHaveBeenCalled();
  });

  it("returns the profile once ownership is verified", async () => {
    vi.mocked(requireCustomerOwnership).mockResolvedValue(null);
    vi.mocked(lookupCustomerProfile).mockResolvedValue({
      customerId: "1",
      name: "Aarav Sharma",
      phone: "9876543210",
      email: "a@b.com",
      city: "Delhi NCR"
    });

    const request = new Request("http://localhost/api/customer/profile?identifier=a@b.com");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.profile.name).toBe("Aarav Sharma");
  });

  it("returns 400 without calling the ownership check when identifier is missing", async () => {
    const request = new Request("http://localhost/api/customer/profile");
    const response = await GET(request);

    expect(response.status).toBe(400);
    expect(requireCustomerOwnership).not.toHaveBeenCalled();
  });
});
