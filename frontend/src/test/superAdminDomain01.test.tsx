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

describe("Domain 01: Super Admin Dashboard Frontend (RED)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    capturedUrls.length = 0;
    vi.restoreAllMocks();
  });

  it("1. Super Admin Dashboard renders and requests GET /api/v1/admin/dashboard/", async () => {
    await bootAndCapture(true, { superuser: true });
    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/platform-admin/dashboard"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(getByTestId("super-admin-dashboard")).toBeTruthy(),
    );
    expect(
      capturedUrls.some((u) => u.includes("/api/v1/admin/dashboard/ :: GET")),
    ).toBe(true);
  });

  it("2. Super Admin Dashboard renders required platform metrics", async () => {
    await bootAndCapture(true, { superuser: true });
    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/platform-admin/dashboard"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(getByTestId("metric-total-accounts")).toBeTruthy();
      expect(getByTestId("metric-total-owners")).toBeTruthy();
      expect(getByTestId("metric-total-businesses")).toBeTruthy();
      expect(getByTestId("metric-total-users")).toBeTruthy();
      expect(getByTestId("metric-active-subscriptions")).toBeTruthy();
      expect(getByTestId("metric-revenue-summary")).toBeTruthy();
      expect(getByTestId("metric-system-status")).toBeTruthy();
    });
  });
});
