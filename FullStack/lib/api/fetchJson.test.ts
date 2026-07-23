import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchJson, FetchJsonError } from "./fetchJson";

describe("fetchJson", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns ok payloads", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, order: { orderId: "x1" } }),
    } as Response);

    const result = await fetchJson<{ order: { orderId: string } }>("/api/orders");
    expect(result.ok).toBe(true);
    expect(result.order.orderId).toBe("x1");
  });

  it("throws FetchJsonError on ok:false", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: false, errors: { server: "Nope" } }),
    } as Response);

    await expect(fetchJson("/api/orders")).rejects.toMatchObject({
      name: "FetchJsonError",
      message: "Nope",
    } satisfies Partial<FetchJsonError>);
  });

  it("throws on HTTP error with error string", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Boom" }),
    } as Response);

    await expect(fetchJson("/api/admin/forecast/refresh")).rejects.toMatchObject({
      message: "Boom",
      status: 500,
    });
  });
});
