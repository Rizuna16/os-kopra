import { describe, it, expect, beforeEach, vi } from "vitest";

describe("apiClient", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  const userObj = {
    id: "1",
    email: "a@b.com",
    first_name: "",
    last_name: "",
    is_email_verified: true,
    created_at: "",
    updated_at: "",
  };

  it("returns parsed JSON on 200", async () => {
    const { apiRequestRaw } = await import("../lib/apiClient");
    (globalThis as any).fetch = vi.fn(async () =>
      new Response(JSON.stringify({ a: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(await apiRequestRaw("/x/")).toEqual({ a: 1 });
  });

  it("attaches Bearer authorization when access token present", async () => {
    const { apiRequestRaw } = await import("../lib/apiClient");
    const { setAccessToken } = await import("../lib/tokenStore");
    setAccessToken("tok-123");
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () =>
      new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    (globalThis as any).fetch = fetchMock;
    await apiRequestRaw("/x/");
    const call = fetchMock.mock.calls[0];
    const headers = (call[1] as RequestInit).headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer tok-123");
  });

  it("apiFetch refreshes once then retries on 401", async () => {
    const { apiFetch, setOnUnauthorized } = await import("../lib/apiClient");
    const { setRefreshToken } = await import("../lib/tokenStore");
    setRefreshToken("ref");
    setOnUnauthorized(null);

    let resourceCalls = 0;
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/token/refresh/")) {
        return new Response(
          JSON.stringify({ access: "na", refresh: "nr" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      resourceCalls++;
      if (resourceCalls === 1) {
        return new Response(
          JSON.stringify({ error: true, message: "u", status_code: 401 }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    expect(await apiFetch("/r/")).toEqual({ ok: true });
    const { getAccessToken } = await import("../lib/tokenStore");
    expect(getAccessToken()).toBe("na");
  });

  it("apiFetch clears tokens and calls onUnauthorized when refresh fails", async () => {
    const { apiFetch, setOnUnauthorized } = await import("../lib/apiClient");
    const { setRefreshToken, getRefreshToken } = await import("../lib/tokenStore");
    setRefreshToken("ref");
    const cb = vi.fn();
    setOnUnauthorized(cb);

    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/token/refresh/")) {
        return new Response("err", { status: 401 });
      }
      return new Response(
        JSON.stringify({ error: true, message: "u", status_code: 401 }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    });

    await expect(apiFetch("/r/")).rejects.toThrow();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(getRefreshToken()).toBeNull();
  });

  it("throws ApiError on 403 without calling onUnauthorized (no logout)", async () => {
    const { apiFetch, setOnUnauthorized } = await import("../lib/apiClient");
    const cb = vi.fn();
    setOnUnauthorized(cb);
    (globalThis as any).fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({ error: true, message: "forbidden", status_code: 403 }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      ),
    );
    const { ApiError } = await import("../auth/types");
    let thrown: any;
    try {
      await apiFetch("/admin/");
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(ApiError);
    expect(thrown.status).toBe(403);
    expect(cb).not.toHaveBeenCalled();
  });

  it("surfaces Retry-After on 429 throttling", async () => {
    const { apiFetch } = await import("../lib/apiClient");
    (globalThis as any).fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({ error: true, message: "throttled", status_code: 429 }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60",
          },
        },
      ),
    );
    const { ApiError } = await import("../auth/types");
    let thrown: any;
    try {
      await apiFetch("/auth/login/");
    } catch (e) {
      thrown = e;
    }
    expect(thrown.status).toBe(429);
    expect(thrown.retryAfter).toBe("60");
  });
});
