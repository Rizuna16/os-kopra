import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "../routes/router";
import { AuthProvider } from "../auth/AuthContext";
import { bootAuth } from "./testUtils";

const BID = "11111111-1111-1111-1111-111111111111";

describe("Owner Dashboard route /app/dashboard", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  function seedBusinessContext(businessId: string) {
    localStorage.setItem(
      "kopera_businesses",
      JSON.stringify([
        {
          id: businessId,
          name: "Toko Contoh",
          status: "ONBOARDING",
          created_at: "2024-01-01T00:00:00Z",
        },
      ]),
    );
    localStorage.setItem("kopera_current_business", businessId);
    localStorage.setItem("kopera_current_location", "l1");
  }

  it("authenticated user with business context: /app/dashboard resolves to OwnerDashboard (loading state)", async () => {
    await bootAuth(true);
    seedBusinessContext(BID);
    render(
      <MemoryRouter initialEntries={["/app/dashboard"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("dashboard-loading")).toBeTruthy(),
    );
  });

  it("unauthenticated user: /app/dashboard redirects to login", async () => {
    await bootAuth(false);
    seedBusinessContext(BID);
    render(
      <MemoryRouter initialEntries={["/app/dashboard"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("login-submit")).toBeTruthy(),
    );
  });

  it("authenticated user without business context: /app/dashboard redirects to onboarding", async () => {
    await bootAuth(true);
    render(
      <MemoryRouter initialEntries={["/app/dashboard"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("onboarding")).toBeTruthy(),
    );
  });

  it("existing /app route still resolves to AppHome (non-regression)", async () => {
    await bootAuth(true);
    seedBusinessContext(BID);
    render(
      <MemoryRouter initialEntries={["/app"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("app-home")).toBeTruthy(),
    );
  });
});
