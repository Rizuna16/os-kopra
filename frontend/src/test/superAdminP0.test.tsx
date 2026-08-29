import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "../routes/router";
import { AuthProvider } from "../auth/AuthContext";
import { bootAuthCapture } from "./testUtils";

const capturedUrls: string[] = [];

async function bootAndCapture(authed: boolean, opts: { superuser?: boolean } = {}) {
  await bootAuthCapture(authed, opts);
  const base = (globalThis as any).fetch as (u: string, i?: any) => Promise<Response>;
  (globalThis as any).fetch = vi.fn(async (u: string, i?: any) => {
    capturedUrls.push(String(u));
    return base(u, i);
  });
}

describe("Super Admin P0 Frontend — Governance Foundation (GREEN)", () => {
  beforeEach(() => {
    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch {}
    capturedUrls.length = 0;
    vi.restoreAllMocks();
    (window as any).confirm = vi.fn(() => true);
  });

  it("accounts list route renders for superuser", async () => {
    await bootAndCapture(true, { superuser: true });
    render(
      <MemoryRouter initialEntries={["/platform-admin/accounts"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(capturedUrls.some((u) => u.includes("/admin/accounts/"))).toBe(true);
    });
  });

  it("owners list route renders for superuser", async () => {
    await bootAndCapture(true, { superuser: true });
    render(
      <MemoryRouter initialEntries={["/platform-admin/owners"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(capturedUrls.some((u) => u.includes("/admin/owners/"))).toBe(true);
    });
  });

  it("users list route renders for superuser", async () => {
    await bootAndCapture(true, { superuser: true });
    render(
      <MemoryRouter initialEntries={["/platform-admin/users"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(capturedUrls.some((u) => u.includes("/admin/users/"))).toBe(true);
    });
  });

  it("admins list route renders for superuser", async () => {
    await bootAndCapture(true, { superuser: true });
    render(
      <MemoryRouter initialEntries={["/platform-admin/admins"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(capturedUrls.some((u) => u.includes("/admin/admins/"))).toBe(true);
    });
  });

  it("platform admin routes deny non-superuser", async () => {
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

  it("platform routes do not require BusinessContext", async () => {
    await bootAndCapture(true, { superuser: true });
    const { queryByTestId } = render(
      <MemoryRouter initialEntries={["/platform-admin/accounts"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(queryByTestId("business-selector")).toBeNull();
    });
  });
});