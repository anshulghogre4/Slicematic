import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./supabase", () => ({
  getSupabaseServerClient: vi.fn(),
  hasSupabaseEnv: vi.fn(() => true)
}));

import { requireCustomerOwnership } from "./customer-auth";
import * as supabaseModule from "./supabase";

function makeRequest(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/customer/profile?identifier=aarav@slicematic.in", { headers });
}

describe("requireCustomerOwnership", () => {
  beforeEach(() => {
    vi.mocked(supabaseModule.hasSupabaseEnv).mockReturnValue(true);
    vi.mocked(supabaseModule.getSupabaseServerClient).mockReset();
  });

  it("returns 401 when no Authorization header is present", async () => {
    const request = makeRequest();
    const result = await requireCustomerOwnership(request, { identifier: "aarav@slicematic.in" });

    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it("returns null (authorized) when the JWT's email matches the requested email identifier", async () => {
    vi.mocked(supabaseModule.getSupabaseServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { email: "Aarav@Slicematic.in" } }, error: null }))
      }
    } as any);

    const request = makeRequest({ authorization: "Bearer valid-token" });
    const result = await requireCustomerOwnership(request, { identifier: "aarav@slicematic.in" });

    expect(result).toBeNull();
  });

  it("returns 403 when the JWT's email does not match the requested email identifier", async () => {
    vi.mocked(supabaseModule.getSupabaseServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { email: "attacker@evil.com" } }, error: null }))
      }
    } as any);

    const request = makeRequest({ authorization: "Bearer valid-token" });
    const result = await requireCustomerOwnership(request, { identifier: "victim@slicematic.in" });

    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("returns null (authorized) when the JWT's email matches the customer row for the requested customerId", async () => {
    const maybeSingle = vi.fn(async () => ({ data: { email: "aarav@slicematic.in" }, error: null }));
    vi.mocked(supabaseModule.getSupabaseServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { email: "aarav@slicematic.in" } }, error: null }))
      },
      schema: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({ maybeSingle })
          })
        })
      })
    } as any);

    const request = new Request("http://localhost/api/customer/orders?customer_id=abc-123", {
      headers: { authorization: "Bearer valid-token" }
    });
    const result = await requireCustomerOwnership(request, { customerId: "abc-123" });

    expect(result).toBeNull();
  });

  it("returns 403 when the JWT's email does not match the customer row for the requested customerId", async () => {
    const maybeSingle = vi.fn(async () => ({ data: { email: "victim@slicematic.in" }, error: null }));
    vi.mocked(supabaseModule.getSupabaseServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { email: "attacker@evil.com" } }, error: null }))
      },
      schema: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({ maybeSingle })
          })
        })
      })
    } as any);

    const request = new Request("http://localhost/api/customer/orders?customer_id=victim-id", {
      headers: { authorization: "Bearer valid-token" }
    });
    const result = await requireCustomerOwnership(request, { customerId: "victim-id" });

    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("accepts the demo-bypass token for the demo identity's own email identifier", async () => {
    vi.mocked(supabaseModule.getSupabaseServerClient).mockReturnValue({
      auth: { getUser: vi.fn() },
      schema: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: vi.fn() }) }) }) })
    } as any);

    const request = makeRequest({ authorization: "Bearer demo-bypass" });
    const result = await requireCustomerOwnership(request, { identifier: "demo@slicematic.in" });

    expect(result).toBeNull();
  });

  it("accepts the demo-bypass token for the demo identity's own phone identifier", async () => {
    vi.mocked(supabaseModule.getSupabaseServerClient).mockReturnValue({
      auth: { getUser: vi.fn() },
      schema: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: vi.fn() }) }) }) })
    } as any);

    const request = makeRequest({ authorization: "Bearer demo-bypass" });
    const result = await requireCustomerOwnership(request, { identifier: "9999999999" });

    expect(result).toBeNull();
  });

  it("rejects the demo-bypass token for a real customer's email identifier (cannot recreate the vulnerability)", async () => {
    vi.mocked(supabaseModule.getSupabaseServerClient).mockReturnValue({
      auth: { getUser: vi.fn() },
      schema: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: vi.fn() }) }) }) })
    } as any);

    const request = makeRequest({ authorization: "Bearer demo-bypass" });
    const result = await requireCustomerOwnership(request, { identifier: "victim@slicematic.in" });

    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("rejects the demo-bypass token for a real customer's customerId, even when the demo row also exists (cannot recreate the vulnerability)", async () => {
    const maybeSingle = vi.fn(async () => ({ data: { email: "victim@slicematic.in", mobile_number: "8123456780" }, error: null }));
    vi.mocked(supabaseModule.getSupabaseServerClient).mockReturnValue({
      auth: { getUser: vi.fn() },
      schema: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({ maybeSingle })
          })
        })
      })
    } as any);

    const request = new Request("http://localhost/api/customer/orders?customer_id=victim-id", {
      headers: { authorization: "Bearer demo-bypass" }
    });
    const result = await requireCustomerOwnership(request, { customerId: "victim-id" });

    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("resolves a phone-number identifier to its owning email via DB lookup before comparing", async () => {
    const maybeSingle = vi.fn(async () => ({ data: { email: "aarav@slicematic.in" }, error: null }));
    vi.mocked(supabaseModule.getSupabaseServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { email: "aarav@slicematic.in" } }, error: null }))
      },
      schema: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({ maybeSingle })
          })
        })
      })
    } as any);

    const request = makeRequest({ authorization: "Bearer valid-token" });
    const result = await requireCustomerOwnership(request, { identifier: "9876543210" });

    expect(result).toBeNull();
  });

  it("accepts the demo-bypass token for the demo customer's own customerId (resolved via DB row)", async () => {
    const maybeSingle = vi.fn(async () => ({ data: { email: "demo@slicematic.in", mobile_number: "9999999999" }, error: null }));
    vi.mocked(supabaseModule.getSupabaseServerClient).mockReturnValue({
      auth: { getUser: vi.fn() },
      schema: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({ maybeSingle })
          })
        })
      })
    } as any);

    const request = new Request("http://localhost/api/customer/orders?customer_id=demo-id", {
      headers: { authorization: "Bearer demo-bypass" }
    });
    const result = await requireCustomerOwnership(request, { customerId: "demo-id" });

    expect(result).toBeNull();
  });
});
