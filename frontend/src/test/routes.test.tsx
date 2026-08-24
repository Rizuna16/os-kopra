import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "../routes/router";
import { AuthProvider } from "../auth/AuthContext";

const userObj = {
  id: "1",
  email: "a@b.com",
  first_name: "",
  last_name: "",
  is_email_verified: true,
  created_at: "",
  updated_at: "",
};

async function boot(authed: boolean) {
  const ts = await import("../lib/tokenStore");
  if (authed) {
    ts.setRefreshToken("r");
    ts.setAccessToken("a");
  } else {
    ts.clearTokens();
  }
  (globalThis as any).fetch = vi.fn(async (url: string) => {
    if (String(url).includes("/auth/me/")) {
      if (authed) {
        return new Response(JSON.stringify(userObj), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({ error: true, message: "u", status_code: 401 }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response("{}", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
}

describe("routing", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("redirects unauthenticated /app to /login", async () => {
    await boot(false);
    render(
      <MemoryRouter initialEntries={["/app"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("login-submit")).toBeTruthy(),
    );
  });

  it("redirects authenticated /login to /app then /onboarding without business context", async () => {
    await boot(true);
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("onboarding")).toBeTruthy(),
    );
  });

  it("renders the public storefront /store/:slug without auth guard", async () => {
    await boot(false);
    render(
      <MemoryRouter initialEntries={["/store/budi-fashion"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("storefront")).toBeTruthy(),
    );
    expect(screen.getByText("Online Store: budi-fashion")).toBeTruthy();
  });
});
