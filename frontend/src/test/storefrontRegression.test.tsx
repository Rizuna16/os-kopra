import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "../routes/router";
import { AuthProvider } from "../auth/AuthContext";
import { bootAuth } from "./testUtils";

describe("Public storefront regression (must stay unauthenticated)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("/store/:slug is reachable without authentication", async () => {
    await bootAuth(false);
    render(
      <MemoryRouter initialEntries={["/store/budi-fashion"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("storefront")).toBeTruthy());
  });

  it("/store/:slug/products stays publicly reachable", async () => {
    await bootAuth(false);
    render(
      <MemoryRouter initialEntries={["/store/budi-fashion/products"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("storefront")).toBeTruthy());
  });

  it("/store/:slug/cart stays publicly reachable", async () => {
    await bootAuth(false);
    render(
      <MemoryRouter initialEntries={["/store/budi-fashion/cart"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("storefront")).toBeTruthy());
  });

  it("storefront routes are NOT behind ProtectedRoute (no redirect to /login)", async () => {
    await bootAuth(false);
    render(
      <MemoryRouter initialEntries={["/store/budi-fashion/checkout"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.queryByTestId("login-submit")).not.toBeTruthy(),
    );
    expect(screen.getByTestId("storefront")).toBeTruthy();
  });
});
