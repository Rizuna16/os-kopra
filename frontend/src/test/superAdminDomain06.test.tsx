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
    capturedUrls.push(`${String(u)} :: ${(i?.method ?? "GET").toUpperCase()}`);
    return base(u, i);
  });
}

describe("Domain 06: Subscription & Plan Governance Frontend (GREEN)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    capturedUrls.length = 0;
    vi.restoreAllMocks();
    (window as any).confirm = vi.fn(() => true);
  });

  it("1. Subscription list renders and requests GET /api/v1/admin/subscriptions/", async () => {
    await bootAndCapture(true, { superuser: true });
    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/platform-admin/subscriptions"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(getByTestId("super-admin-subscriptions")).toBeTruthy(),
    );
    expect(
      capturedUrls.some((u) => u.includes("/api/v1/admin/subscriptions/ :: GET")),
    ).toBe(true);
  });

  it("2. Subscription detail renders and requests GET /api/v1/admin/subscriptions/<id>/", async () => {
    await bootAndCapture(true, { superuser: true });
    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/platform-admin/subscriptions/sub-1"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(getByTestId("super-admin-subscription-detail")).toBeTruthy(),
    );
    expect(
      capturedUrls.some((u) =>
        u.includes("/api/v1/admin/subscriptions/sub-1/ :: GET"),
      ),
    ).toBe(true);
  });

  it("3. Plan list renders and requests GET /api/v1/admin/plans/", async () => {
    await bootAndCapture(true, { superuser: true });
    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/platform-admin/plans"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(getByTestId("super-admin-plans")).toBeTruthy());
    expect(
      capturedUrls.some((u) => u.includes("/api/v1/admin/plans/ :: GET")),
    ).toBe(true);
  });

  it("4. Plan create submits POST /api/v1/admin/plans/", async () => {
    await bootAndCapture(true, { superuser: true });
    const { getByTestId, getByLabelText } = render(
      <MemoryRouter initialEntries={["/platform-admin/plans/new"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(getByTestId("super-admin-plan-detail")).toBeTruthy());
    fireEvent.change(getByLabelText("Nama"), { target: { value: "Enterprise" } });
    fireEvent.change(getByLabelText("Code"), { target: { value: "ent" } });
    fireEvent.change(getByLabelText("Amount"), { target: { value: "500000" } });
    fireEvent.click(
      within(getByTestId("super-admin-plan-detail")).getByText("Buat"),
    );
    await waitFor(() =>
      expect(
        capturedUrls.some((u) => u.includes("/api/v1/admin/plans/ :: POST")),
      ).toBe(true),
    );
  });

  it("5. Plan edit submits PATCH /api/v1/admin/plans/<id>/", async () => {
    await bootAndCapture(true, { superuser: true });
    const { getByTestId, getByLabelText } = render(
      <MemoryRouter initialEntries={["/platform-admin/plans/plan-1"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(getByTestId("super-admin-plan-detail")).toBeTruthy());
    fireEvent.change(getByLabelText("Nama"), { target: { value: "Renamed" } });
    fireEvent.click(
      within(getByTestId("super-admin-plan-detail")).getByText("Simpan Perubahan"),
    );
    await waitFor(() =>
      expect(
        capturedUrls.some((u) => u.includes("/api/v1/admin/plans/plan-1/ :: PATCH")),
      ).toBe(true),
    );
  });

  it("6. Plan enable/disable submits POST enable/disable/", async () => {
    await bootAndCapture(true, { superuser: true });
    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/platform-admin/plans/plan-1"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(getByTestId("super-admin-plan-detail")).toBeTruthy());
    fireEvent.click(
      within(getByTestId("super-admin-plan-detail")).getByText("Disable"),
    );
    await waitFor(() =>
      expect(
        capturedUrls.some((u) =>
          u.includes("/api/v1/admin/plans/plan-1/disable/ :: POST"),
        ),
      ).toBe(true),
    );
  });

  it("7. Platform navigation contains Subscriptions & Plans links", async () => {
    await bootAndCapture(true, { superuser: true });
    const { getByText } = render(
      <MemoryRouter initialEntries={["/platform-admin"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(getByText("Subscriptions")).toBeTruthy();
      expect(getByText("Plans")).toBeTruthy();
    });
  });

  it("8. Platform Domain 06 routes do not require BusinessContext (no BusinessSelector)", async () => {
    await bootAndCapture(true, { superuser: true });
    const { queryByTestId, queryByText } = render(
      <MemoryRouter initialEntries={["/platform-admin/subscriptions"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(queryByTestId("super-admin-subscriptions")).toBeTruthy(),
    );
    expect(queryByTestId("business-selector")).toBeNull();
    expect(queryByText(/select business|pilih usaha/i)).toBeNull();
  });
});
