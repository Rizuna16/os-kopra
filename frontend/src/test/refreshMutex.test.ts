import { describe, it, expect, beforeEach, vi } from "vitest";

describe("refresh mutex", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("performs a single token refresh for concurrent 401 responses", async () => {
    const { setRefreshToken, setAccessToken, getAccessToken } = await import(
      "../lib/tokenStore"
    );
    const { apiFetch, setOnUnauthorized } = await import("../lib/apiClient");

    setRefreshToken("valid-refresh");
    setAccessToken(null);
    setOnUnauthorized(null);

    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/token/refresh/")) {
        return new Response(
          JSON.stringify({ access: "new-access", refresh: "new-refresh" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      const u = String(url);
      const attempts: Record<string, number> = ((globalThis as any).__att =
        (globalThis as any).__att ?? {});
      attempts[u] = (attempts[u] ?? 0) + 1;
      if (attempts[u] === 1) {
        return new Response(
          JSON.stringify({ error: true, message: "unauth", status_code: 401 }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    (globalThis as any).fetch = fetchMock;

    const [r1, r2] = await Promise.all([apiFetch("/r1/"), apiFetch("/r2/")]);

    const refreshCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes("/auth/token/refresh/"),
    ).length;

    expect(refreshCalls).toBe(1);
    expect(r1).toEqual({ ok: true });
    expect(r2).toEqual({ ok: true });
    expect(getAccessToken()).toBe("new-access");
  });
});
