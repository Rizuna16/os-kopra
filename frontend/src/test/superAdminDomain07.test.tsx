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

describe("Domain 07: Payment & Billing Governance Frontend (GREEN)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    capturedUrls.length = 0;
    vi.restoreAllMocks();
  });

  it("1. Payment list renders under PlatformLayout and requests GET /api/v1/admin/payments/", async () => {
    await bootAndCapture(true, { superuser: true });
    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/platform-admin/payments"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(getByTestId("super-admin-payments")).toBeTruthy(),
    );
    expect(
      capturedUrls.some((u) => u.includes("/api/v1/admin/payments/ :: GET")),
    ).toBe(true);
  });

  it("2. Non-superuser is forbidden on payment list", async () => {
    await bootAndCapture(true, { superuser: false });
    const { getByText } = render(
      <MemoryRouter initialEntries={["/platform-admin/payments"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(getByText(/forbidden/i)).toBeTruthy());
  });
});
