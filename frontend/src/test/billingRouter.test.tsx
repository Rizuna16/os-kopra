import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "../routes/router";
import { AuthProvider } from "../auth/AuthContext";
import { bootAuth } from "./testUtils";

describe("PART 20 — Router & Protected Routes for Billing", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("redirects unauthenticated /billing to /login", async () => {
    await bootAuth(false);
    render(
      <MemoryRouter initialEntries={["/billing"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId("login-submit")).toBeTruthy());
  });

  it("requires BusinessRoute protection for authenticated /billing without business context", async () => {
    await bootAuth(true);
    render(
      <MemoryRouter initialEntries={["/billing"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId("onboarding")).toBeTruthy());
  });
});
