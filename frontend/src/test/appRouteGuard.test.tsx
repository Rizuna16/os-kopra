import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "../routes/router";
import { AuthProvider } from "../auth/AuthContext";
import { bootAuth } from "./testUtils";

describe("App route guard /app (BusinessContext-aware)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("authenticated user without currentBusinessId: /app redirects to /onboarding", async () => {
    await bootAuth(true);
    render(
      <MemoryRouter initialEntries={["/app"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("onboarding")).toBeTruthy(),
    );
  });

  it("authenticated user with current business: /app is allowed", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify({ id: "1", email: "a@b.com", first_name: "", last_name: "", is_email_verified: true }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes("/reports/overview/")) {
        return new Response(JSON.stringify({
          sales: { total: 0, completed: 0, voided: 0, draft: 0, revenue: "0.00", loyalty_earned: "0.00" },
          purchasing: { total: 0, confirmed: 0, cancelled: 0, draft: 0, cost: "0.00" },
          finance: { expense_total: "0.00", journal: { DRAFT: 0, POSTED: 0, REVERSED: 0 }, journal_entry: { DEBIT: "0.00", CREDIT: "0.00" } },
          counts: { customers: 0, products: 0, variants: 0, employees: 0, employees_active: 0 },
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    localStorage.setItem(
      "kopera_businesses",
      JSON.stringify([
        {
          id: "11111111-1111-1111-1111-111111111111",
          name: "Toko Contoh",
          status: "ONBOARDING",
          created_at: "2024-01-01T00:00:00Z",
        },
      ]),
    );
    localStorage.setItem(
      "kopera_current_business",
      "11111111-1111-1111-1111-111111111111",
    );
    render(
      <MemoryRouter initialEntries={["/app"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("dashboard-business-name")).toBeTruthy());
  });

  it("does not accept arbitrary client-created business ids to bypass the guard", async () => {
    await bootAuth(true);
    localStorage.setItem(
      "kopera_businesses",
      JSON.stringify([{ id: "fake", name: "Fake" }]),
    );
    localStorage.setItem("kopera_current_business", "fake");
    render(
      <MemoryRouter initialEntries={["/app"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("onboarding")).toBeTruthy(),
    );
  });
});
