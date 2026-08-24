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
    await waitFor(() => expect(screen.getByTestId("app-home")).toBeTruthy());
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
