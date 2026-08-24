import { describe, it, expect, beforeEach, vi } from "vitest";
import * as tokenStore from "../lib/tokenStore";
import { apiFetch } from "../lib/apiClient";
import * as authService from "../auth/authService";
import * as apiClient from "../lib/apiClient";
import { AuthProvider, useAuth } from "../auth/AuthContext";
import { ProtectedRoute } from "../routes/ProtectedRoute";
import { PublicRoute } from "../routes/PublicRoute";

describe("Foundation regression — modules and token storage unchanged", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("Foundation modules still export their locked APIs", () => {
    expect(typeof tokenStore.getAccessToken).toBe("function");
    expect(typeof tokenStore.setAccessToken).toBe("function");
    expect(typeof tokenStore.getRefreshToken).toBe("function");
    expect(typeof tokenStore.setRefreshToken).toBe("function");
    expect(typeof tokenStore.clearTokens).toBe("function");
    expect(typeof apiClient.apiFetch).toBe("function");
    expect(typeof apiClient.apiRequestRaw).toBe("function");
    expect(typeof authService.login).toBe("function");
    expect(typeof authService.register).toBe("function");
    expect(typeof authService.logout).toBe("function");
    expect(typeof authService.me).toBe("function");
    expect(typeof AuthProvider).toBe("function");
    expect(typeof useAuth).toBe("function");
    expect(typeof ProtectedRoute).toBe("function");
    expect(typeof PublicRoute).toBe("function");
  });

  it("access token stays in-memory (never written to localStorage)", () => {
    tokenStore.setAccessToken("access-123");
    expect(localStorage.getItem("kopera_access_token")).toBeNull();
    expect(localStorage.getItem("access_token")).toBeNull();
    expect(tokenStore.getAccessToken()).toBe("access-123");
  });

  it("refresh token stays in sessionStorage (never in localStorage)", () => {
    tokenStore.setRefreshToken("refresh-123");
    expect(localStorage.getItem("kopera_refresh_token")).toBeNull();
    expect(sessionStorage.getItem("kopera_refresh_token")).toBe("refresh-123");
  });

  it("Foundation refresh mutex behavior is intact (single refresh on 401)", async () => {
    tokenStore.setRefreshToken("ref");
    apiClient.setOnUnauthorized(null);
    let resourceCalls = 0;
    (globalThis as any).fetch = (async (
      url: string,
    ) => {
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
    }) as any;
    expect(await apiFetch("/r/")).toEqual({ ok: true });
    expect(tokenStore.getRefreshToken()).toBe("nr");
  });
});
