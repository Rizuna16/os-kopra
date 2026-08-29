import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "../routes/router";
import { AuthProvider } from "../auth/AuthContext";
import { bootAuthCapture } from "./testUtils";

const capturedUrls: string[] = [];

async function bootAndCapture(authed: boolean, opts: { superuser?: boolean } = {}) {
  await bootAuthCapture(authed, opts);
  const base = (globalThis as any).fetch as (u: string, i?: any) => Promise<Response>;
  (globalThis as any).fetch = vi.fn(async (u: string, i?: any) => {
    capturedUrls.push(`${String(u)} :: ${(i?.method ?? "GET").toUpperCase()}`);
    return base(u, i);
  });
}

describe("Domain 02: Account Management Frontend", () => {
  beforeEach(() => {
    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch {}
    capturedUrls.length = 0;
    vi.restoreAllMocks();
    (window as any).confirm = vi.fn(() => true);
  });

  it("1. Account list route requests GET /api/v1/admin/accounts/", async () => {
    await bootAndCapture(true, { superuser: true });
    render(
      <MemoryRouter initialEntries={["/platform-admin/accounts"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(
        capturedUrls.some((u) => u.includes("/api/v1/admin/accounts/ :: GET")),
      ).toBe(true),
    );
  });

  it("2. Account list renders the account table with required columns", async () => {
    await bootAndCapture(true, { superuser: true });
    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/platform-admin/accounts"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(getByTestId("super-admin-accounts")).toBeTruthy();
    });
  });

  it("3. Account detail route requests GET /api/v1/admin/accounts/:ownerUserId/", async () => {
    await bootAndCapture(true, { superuser: true });
    const base = (globalThis as any).fetch as (u: string, i?: any) => Promise<Response>;
    (globalThis as any).fetch = vi.fn(async (u: string, i?: any) => {
      if (String(u).includes("/api/v1/admin/accounts/") && !String(u).endsWith("/accounts/")) {
        capturedUrls.push(`${String(u)} :: ${(i?.method ?? "GET").toUpperCase()}`);
        return new Response(
          JSON.stringify({
            owner_id: "00000000-0000-0000-0000-000000000001",
            owner_email: "owner@example.com",
            owner_name: "Owner One",
            business_count: 1,
            businesses: [{ id: "biz-1", name: "Biz", status: "ACTIVE" }],
            user_count: 3,
            subscription_summary: { total: 1, active: 1, expired: 0 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return base(u, i);
    });
    render(
      <MemoryRouter initialEntries={["/platform-admin/accounts/00000000-0000-0000-0000-000000000001"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(
        capturedUrls.some((u) => u.includes("/api/v1/admin/accounts/") && u.includes(":: GET")),
      ).toBe(true),
    );
  });

  it("4. Account detail renders required owner identity and aggregation fields", async () => {
    await bootAndCapture(true, { superuser: true });
    const base = (globalThis as any).fetch as (u: string, i?: any) => Promise<Response>;
    (globalThis as any).fetch = vi.fn(async (u: string, i?: any) => {
      if (String(u).includes("/api/v1/admin/accounts/") && !String(u).endsWith("/accounts/")) {
        return new Response(
          JSON.stringify({
            owner_id: "00000000-0000-0000-0000-000000000001",
            owner_email: "owner@example.com",
            owner_name: "Owner One",
            business_count: 1,
            businesses: [{ id: "biz-1", name: "Biz", status: "ACTIVE" }],
            user_count: 3,
            subscription_summary: { total: 1, active: 1, expired: 0 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return base(u, i);
    });
    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/platform-admin/accounts/00000000-0000-0000-0000-000000000001"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(getByTestId("super-admin-account-detail")).toBeTruthy();
    });
  });

  it("5. Account management is denied to non-superuser (forbidden)", async () => {
    await bootAndCapture(true, { superuser: false });
    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/platform-admin/accounts"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(getByTestId("forbidden")).toBeTruthy();
    });
  });
});
