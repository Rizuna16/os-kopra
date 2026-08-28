import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, fireEvent, waitFor, within } from "@testing-library/react";
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

describe("Module 00: KOPERA Platform / Super Admin Frontend (GREEN)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    capturedUrls.length = 0;
    vi.restoreAllMocks();
    (window as any).confirm = vi.fn(() => true);
  });

  it("1. unauthenticated access to /platform-admin redirects to /login", async () => {
    await bootAuthCapture(false);
    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/platform-admin"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(getByTestId("login")).toBeTruthy();
    });
  });

  it("2. OWNER cannot access Super Admin platform (denied / forbidden)", async () => {
    await bootAndCapture(true); // non-superuser -> /admin/* returns 403
    const { getByTestId, queryByText } = render(
      <MemoryRouter initialEntries={["/platform-admin"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(getByTestId("forbidden")).toBeTruthy();
      expect(queryByText(/kopera platform \/ super admin/i)).toBeNull();
    });
  });

  it("3. ADMIN cannot access Super Admin platform (denied / forbidden)", async () => {
    await bootAndCapture(true);
    const { getByTestId, queryByText } = render(
      <MemoryRouter initialEntries={["/platform-admin"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(getByTestId("forbidden")).toBeTruthy();
      expect(queryByText(/kopera platform \/ super admin/i)).toBeNull();
    });
  });

  it("4. KASIR cannot access Super Admin platform (denied / forbidden)", async () => {
    await bootAndCapture(true);
    const { getByTestId, queryByText } = render(
      <MemoryRouter initialEntries={["/platform-admin"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(getByTestId("forbidden")).toBeTruthy();
      expect(queryByText(/kopera platform \/ super admin/i)).toBeNull();
    });
  });

  it("5. Superuser reaches the platform shell with identity 'KOPERA PLATFORM / SUPER ADMIN'", async () => {
    await bootAndCapture(true, { superuser: true });
    const { getByText } = render(
      <MemoryRouter initialEntries={["/platform-admin"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(getByText(/kopera platform \/ super admin/i)).toBeTruthy();
    });
  });

  it("6. Platform navigation contains the required links", async () => {
    await bootAndCapture(true, { superuser: true });
    const { getByText } = render(
      <MemoryRouter initialEntries={["/platform-admin"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(getByText("Platform Dashboard")).toBeTruthy();
      expect(getByText("Usaha Management")).toBeTruthy();
      expect(getByText("Audit Logs")).toBeTruthy();
      expect(getByText("Backup & Restore")).toBeTruthy();
    });
  });

  it("7. Platform dashboard requires system monitoring data from GET /api/v1/admin/monitoring/", async () => {
    await bootAndCapture(true, { superuser: true });
    render(
      <MemoryRouter initialEntries={["/platform-admin/dashboard"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(
        capturedUrls.some((u) => u.includes("/api/v1/admin/monitoring/")),
      ).toBe(true);
    });
  });

  it("8. Usaha page requires GET /api/v1/admin/businesses/", async () => {
    await bootAndCapture(true, { superuser: true });
    render(
      <MemoryRouter initialEntries={["/platform-admin/businesses"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(
        capturedUrls.some((u) => u.includes("/api/v1/admin/businesses/")),
      ).toBe(true);
    });
  });

  it("9. Backup trigger requires POST /api/v1/admin/backups/trigger/", async () => {
    await bootAndCapture(true, { superuser: true });
    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/platform-admin/backups"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    let triggerBtn: HTMLElement;
    await waitFor(() => {
      triggerBtn = getByTestId("trigger-backup-btn");
      expect(triggerBtn).toBeTruthy();
    });
    fireEvent.click(triggerBtn!);
    await waitFor(() => {
      expect(
        capturedUrls.some((u) => u.includes("/api/v1/admin/backups/trigger/")),
      ).toBe(true);
    });
  });

  it("10. Restore action requires POST /api/v1/admin/backups/<id>/restore/", async () => {
    await bootAndCapture(true, { superuser: true });
    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/platform-admin/backups"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    let restoreBtn: HTMLElement;
    await waitFor(() => {
      restoreBtn = getByTestId("restore-backup-btn-bk-1");
      expect(restoreBtn).toBeTruthy();
    });
    fireEvent.click(restoreBtn!);
    await waitFor(() => {
      expect(
        capturedUrls.some(
          (u) => u.includes("/api/v1/admin/backups/") && u.includes("/restore/"),
        ),
      ).toBe(true);
    });
  });

  it("11. Platform route does not require business_id / BusinessSelector", async () => {
    await bootAndCapture(true, { superuser: true });
    const { queryByTestId, queryByText } = render(
      <MemoryRouter initialEntries={["/platform-admin"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      // BusinessSelector (tenant context) must not be required.
      expect(queryByTestId("business-selector")).toBeNull();
      expect(queryByText(/select business|pilih usaha/i)).toBeNull();
    });
  });
});
