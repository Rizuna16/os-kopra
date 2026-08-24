import { describe, it, expect, beforeEach, vi } from "vitest";
import { apiFetch, setOnUnauthorized } from "../lib/apiClient";
import { setRefreshToken, clearTokens, getRefreshToken } from "../lib/tokenStore";
import { ApiError } from "../auth/types";

async function setGlobalFetch(fn: (url: string, init?: RequestInit) => Promise<Response>) {
  (globalThis as any).fetch = fn as unknown as typeof fetch;
}

describe("Error handling reuses Foundation apiClient (no second client)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
    clearTokens();
  });

  it("403 throws ApiError and must NOT logout (no onUnauthorized call)", async () => {
    const cb = vi.fn();
    setOnUnauthorized(cb);
    await setGlobalFetch(async () =>
      new Response(
        JSON.stringify({ error: true, message: "forbidden", status_code: 403 }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      ),
    );
    let thrown: unknown;
    try {
      await apiFetch("/businesses/x/");
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(ApiError);
    expect((thrown as ApiError).status).toBe(403);
    expect(cb).not.toHaveBeenCalled();
  });

  it("429 surfaces Retry-After from the backend", async () => {
    await setGlobalFetch(async () =>
      new Response(
        JSON.stringify({ error: true, message: "throttled", status_code: 429 }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", "Retry-After": "30" },
        },
      ),
    );
    let thrown: unknown;
    try {
      await apiFetch("/billing/plans/");
    } catch (e) {
      thrown = e;
    }
    expect((thrown as ApiError).status).toBe(429);
    expect((thrown as ApiError).retryAfter).toBe("30");
  });

  it("401 triggers the Foundation refresh flow then retries", async () => {
    setRefreshToken("ref");
    setOnUnauthorized(null);
    let resourceCalls = 0;
    await setGlobalFetch(async (url: string) => {
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
    expect(await apiFetch("/businesses/x/locations/")).toEqual({ ok: true });
    expect(getRefreshToken()).toBe("nr");
  });

  it("network error is surfaced safely (rejects, no crash)", async () => {
    await setGlobalFetch(async () => {
      throw new Error("network down");
    });
    await expect(apiFetch("/businesses/x/")).rejects.toThrow();
  });
});
