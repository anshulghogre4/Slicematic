import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../lib/supabase", () => ({
  hasSupabaseAdminEnv: vi.fn(),
  getSupabaseServerClient: vi.fn()
}));

import * as supabaseModule from "../../../../lib/supabase";
import { POST } from "./route";

function buildFormRequest(file: File | null, token?: string) {
  const form = new FormData();
  if (file) form.append("file", file);
  return new Request("http://localhost/api/admin/upload", {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
    body: form
  });
}

describe("POST /api/admin/upload", () => {
  beforeEach(() => {
    vi.mocked(supabaseModule.hasSupabaseAdminEnv).mockReturnValue(true);
  });

  it("returns 401 without a token", async () => {
    const file = new File(["fake"], "pizza.jpg", { type: "image/jpeg" });
    const response = await POST(buildFormRequest(file));
    expect(response.status).toBe(401);
  });

  it("rejects disallowed file types with a demo-bypass token", async () => {
    const file = new File(["fake"], "pizza.txt", { type: "text/plain" });
    const response = await POST(buildFormRequest(file, "demo-bypass"));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
  });

  it("rejects oversized files with a demo-bypass token", async () => {
    const bytes = new Uint8Array(4 * 1024 * 1024 + 1);
    const file = new File([bytes], "pizza.jpg", { type: "image/jpeg" });
    const response = await POST(buildFormRequest(file, "demo-bypass"));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/4 MB/);
  });

  it("uploads to Supabase Storage and returns a public bucket URL", async () => {
    const upload = vi.fn().mockResolvedValue({ data: { path: "1700000000-pizza.jpg" }, error: null });
    const getPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: "https://project.supabase.co/storage/v1/object/public/menu-images/1700000000-pizza.jpg" }
    });
    const from = vi.fn().mockReturnValue({ upload, getPublicUrl });
    vi.mocked(supabaseModule.getSupabaseServerClient).mockReturnValue({ storage: { from } } as any);

    const file = new File(["fake-image-bytes"], "pizza.jpg", { type: "image/jpeg" });
    const response = await POST(buildFormRequest(file, "demo-bypass"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.url).toBe("https://project.supabase.co/storage/v1/object/public/menu-images/1700000000-pizza.jpg");
    expect(body.url).not.toMatch(/^\/uploads\//);
    expect(from).toHaveBeenCalledWith("menu-images");
  });

  it("returns a clear error when Supabase Storage is not configured", async () => {
    vi.mocked(supabaseModule.getSupabaseServerClient).mockReturnValue(null);
    const file = new File(["fake"], "pizza.jpg", { type: "image/jpeg" });
    const response = await POST(buildFormRequest(file, "demo-bypass"));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/Supabase/i);
  });
});
