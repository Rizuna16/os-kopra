import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "../routes/router";
import { AuthProvider } from "../auth/AuthContext";
import { bootAuth } from "./testUtils";

describe("PART 22 Router — locked route verification", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  const merchantRoutes = [
    "/stores",
    "/stores/create",
    "/stores/store-123/products",
    "/stores/toko-makmur/orders",
  ];

  const publicRoutes = [
    "/store/toko-makmur",
    "/store/toko-makmur/cart",
    "/store/toko-makmur/checkout",
  ];

  merchantRoutes.forEach((route) => {
    it(`merchant route ${route} requires authentication (redirect to login when unauthenticated)`, async () => {
      await bootAuth(false);
      render(
        <MemoryRouter initialEntries={[route]}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>,
      );
      await waitFor(() => expect(screen.getByTestId("login-submit")).toBeTruthy());
    });
  });

  merchantRoutes.forEach((route) => {
    it(`merchant route ${route} is reachable with authentication`, async () => {
      await bootAuth(true);
      render(
        <MemoryRouter initialEntries={[route]}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>,
      );
      await waitFor(() => expect(screen.queryByTestId("login-submit")).not.toBeTruthy());
    });
  });

  publicRoutes.forEach((route) => {
    it(`public route ${route} is reachable without authentication`, async () => {
      await bootAuth(false);
      render(
        <MemoryRouter initialEntries={[route]}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>,
      );
      await waitFor(() => expect(screen.getByTestId("storefront")).toBeTruthy());
      expect(screen.queryByTestId("login-submit")).not.toBeTruthy();
    });
  });
});