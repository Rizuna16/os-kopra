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

describe("Domain 03: Owner Management Frontend", () => {
  beforeEach(() => {
    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch {}
    capturedUrls.length = 0;
    vi.restoreAllMocks();
    (window as any).confirm = vi.fn(() => true);
  });

  it("1. Owner list route requests GET /api/v1/admin/owners/", async () => {
    await bootAndCapture(true, { superuser: true });
    render(
      <MemoryRouter initialEntries={["/platform-admin/owners"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(
        capturedUrls.some((u) => u.includes("/api/v1/admin/owners/ :: GET")),
      ).toBe(true),
    );
  });

  it("2. Owner list renders owner identity fields", async () => {
    await bootAndCapture(true, { superuser: true });
    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/platform-admin/owners"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(getByTestId("super-admin-owners")).toBeTruthy();
    });
  });

  it("3. Owner list renders owner status fields", async () => {
    await bootAndCapture(true, { superuser: true });
    render(
      <MemoryRouter initialEntries={["/platform-admin/owners"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(
        capturedUrls.some(
          (u) => u.includes("/api/v1/admin/owners/") && u.includes(":: GET")),
        ).toBe(true);
    });
  });

  it("4. Owner detail route requests GET /api/v1/admin/owners/:ownerId/", async () => {
    await bootAndCapture(true, { superuser: true });
    const base = (globalThis as any).fetch as (u: string, i?: any) => Promise<Response>;
    (globalThis as any).fetch = vi.fn(async (u: string, i?: any) => {
      if (String(u).includes("/api/v1/admin/owners/") && !String(u).endsWith("/owners/")) {
        capturedUrls.push(`${String(u)} :: ${(i?.method ?? "GET").toUpperCase()}`);
        return new Response(
          JSON.stringify({
            id: "00000000-0000-0000-0000-000000000001",
            email: "owner@example.com",
            first_name: "Owner",
            last_name: "One",
            is_active: true,
            is_email_verified: true,
            business_count: 1,
            businesses: [{ id: "biz-1", name: "Biz", status: "ACTIVE" }],
            subscription_summary: { total: 1, active: 1, expired: 0 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return base(u, i);
    });
    render(
      <MemoryRouter initialEntries={["/platform-admin/owners/00000000-0000-0000-0000-000000000001"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(
        capturedUrls.some((u) => u.includes("/api/v1/admin/owners/") && u.includes(":: GET")),
      ).toBe(true),
    );
  });

  it("5. Owner detail renders owner identity fields", async () => {
    await bootAndCapture(true, { superuser: true });
    const base = (globalThis as any).fetch as (u: string, i?: any) => Promise<Response>;
    (globalThis as any).fetch = vi.fn(async (u: string, i?: any) => {
      if (String(u).includes("/api/v1/admin/owners/") && !String(u).endsWith("/owners/")) {
        return new Response(
          JSON.stringify({
            id: "00000000-0000-0000-0000-000000000001",
            email: "owner@example.com",
            first_name: "Owner",
            last_name: "One",
            is_active: true,
            is_email_verified: true,
            business_count: 1,
            businesses: [{ id: "biz-1", name: "Biz", status: "ACTIVE" }],
            subscription_summary: { total: 1, active: 1, expired: 0 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return base(u, i);
    });
    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/platform-admin/owners/00000000-0000-0000-0000-000000000001"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(getByTestId("super-admin-owner-detail")).toBeTruthy();
    });
  });

  it("6. Owner detail renders owner aggregation fields", async () => {
    await bootAndCapture(true, { superuser: true });
    const base = (globalThis as any).fetch as (u: string, i?: any) => Promise<Response>;
    (globalThis as any).fetch = vi.fn(async (u: string, i?: any) => {
      if (String(u).includes("/api/v1/admin/owners/") && !String(u).endsWith("/owners/")) {
        return new Response(
          JSON.stringify({
            id: "00000000-0000-0000-0000-000000000001",
            email: "owner@example.com",
            first_name: "Owner",
            last_name: "One",
            is_active: true,
            is_email_verified: true,
            business_count: 1,
            businesses: [{ id: "biz-1", name: "Biz", status: "ACTIVE" }],
            subscription_summary: { total: 1, active: 1, expired: 0 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return base(u, i);
    });
    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/platform-admin/owners/00000000-0000-0000-0000-000000000001"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(getByTestId("super-admin-owner-detail")).toBeTruthy();
    });
  });

  it("7. Non-superuser access to owner management is forbidden", async () => {
    await bootAndCapture(true, { superuser: false });
    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/platform-admin/owners"]}>
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