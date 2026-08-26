import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "../routes/router";
import { AuthProvider } from "../auth/AuthContext";
import { bootAuth, userObj } from "./testUtils";

describe("Onboarding route /onboarding", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("unauthenticated access to /onboarding redirects to /login", async () => {
    await bootAuth(false);
    render(
      <MemoryRouter initialEntries={["/onboarding"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("login-submit")).toBeTruthy());
  });

  it("authenticated user without business can reach /onboarding", async () => {
    await bootAuth(true);
    render(
      <MemoryRouter initialEntries={["/onboarding"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("onboarding")).toBeTruthy(),
    );
  });

  it("authenticated user with business context on /onboarding can continue to /app", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (String(url).includes("/businesses/b1/locations/")) {
        return new Response(
          JSON.stringify([{ id: "l1", name: "Toko Utama" }]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (String(url).includes("/reports/overview/")) {
        return new Response(
          JSON.stringify({
            sales: { total: 0, completed: 0, voided: 0, draft: 0, revenue: "0.00", loyalty_earned: "0.00" },
            purchasing: { total: 0, confirmed: 0, cancelled: 0, draft: 0, cost: "0.00" },
            finance: { expense_total: "0.00", journal: { DRAFT: 0, POSTED: 0, REVERSED: 0 }, journal_entry: { DEBIT: "0.00", CREDIT: "0.00" } },
            counts: { customers: 0, products: 0, variants: 0, employees: 0, employees_active: 0 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    localStorage.setItem(
      "kopera_businesses",
      JSON.stringify([
        {
          id: "b1",
          name: "Toko Satu",
          status: "ONBOARDING",
          created_at: "2024-01-01T00:00:00Z",
        },
      ]),
    );
    localStorage.setItem("kopera_current_business", "b1");
    localStorage.setItem("kopera_current_location", "l1");
    render(
      <MemoryRouter initialEntries={["/onboarding"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(
        screen.getByTestId("dashboard-empty"),
      ).toBeTruthy(),
    );
  });
});
