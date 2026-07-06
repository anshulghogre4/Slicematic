import { describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({
  hasSupabaseAdminEnv: vi.fn(),
  getSupabaseServerClient: vi.fn()
}));

import * as supabaseModule from "./supabase";
import { requireAdminSession } from "./admin-auth";

function buildRequest(token?: string) {
  return new Request("http://localhost/api/admin/menu", {
    headers: token ? { authorization: `Bearer ${token}` } : undefined
  });
}

describe("requireAdminSession", () => {
  it("allows the request through when Supabase admin env is not configured", async () => {
    vi.mocked(supabaseModule.hasSupabaseAdminEnv).mockReturnValue(false);

    const result = await requireAdminSession(buildRequest());
    expect(result).toBeNull();
  });

  it("rejects with 401 when no authorization header is sent", async () => {
    vi.mocked(supabaseModule.hasSupabaseAdminEnv).mockReturnValue(true);

    const result = await requireAdminSession(buildRequest());
    expect(result).not.toBeNull();
    expect(result?.status).toBe(401);
  });

  it("allows the demo-bypass bearer token through without hitting Supabase", async () => {
    vi.mocked(supabaseModule.hasSupabaseAdminEnv).mockReturnValue(true);
    const getUser = vi.fn();
    vi.mocked(supabaseModule.getSupabaseServerClient).mockReturnValue({ auth: { getUser } } as any);

    const result = await requireAdminSession(buildRequest("demo-bypass"));
    expect(result).toBeNull();
    expect(getUser).not.toHaveBeenCalled();
  });

  it("allows a real, valid Supabase session token", async () => {
    vi.mocked(supabaseModule.hasSupabaseAdminEnv).mockReturnValue(true);
    vi.mocked(supabaseModule.getSupabaseServerClient).mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }) }
    } as any);

    const result = await requireAdminSession(buildRequest("valid-session-token"));
    expect(result).toBeNull();
  });

  it("rejects with 401 for an invalid or expired session token", async () => {
    vi.mocked(supabaseModule.hasSupabaseAdminEnv).mockReturnValue(true);
    vi.mocked(supabaseModule.getSupabaseServerClient).mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error("expired") }) }
    } as any);

    const result = await requireAdminSession(buildRequest("expired-token"));
    expect(result?.status).toBe(401);
  });

  it("rejects with 503 when Supabase admin env is configured but the client fails to build", async () => {
    vi.mocked(supabaseModule.hasSupabaseAdminEnv).mockReturnValue(true);
    vi.mocked(supabaseModule.getSupabaseServerClient).mockReturnValue(null);

    const result = await requireAdminSession(buildRequest("some-token"));
    expect(result?.status).toBe(503);
  });
});
