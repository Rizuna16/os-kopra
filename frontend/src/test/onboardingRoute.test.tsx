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
      return new Response("[]", { status: 200 });
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
        screen.getByTestId("app-home").textContent,
      ).toBeTruthy(),
    );
  });
});
