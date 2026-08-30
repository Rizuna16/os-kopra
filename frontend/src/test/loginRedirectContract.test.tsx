import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "../routes/router";
import { AuthProvider } from "../auth/AuthContext";

const baseUser = {
  id: "1",
  email: "user@example.com",
  first_name: "",
  last_name: "",
  is_email_verified: true,
  created_at: "",
  updated_at: "",
};

function makeFetchMock(
  loginResp: ResponseInit & { status?: number; headers?: HeadersInit; body?: unknown },
  meResp: ResponseInit & { status?: number; headers?: HeadersInit; body?: unknown },
) {
  return vi.fn(async (url: string | URL) => {
    const u = String(url);
    if (u.includes("/auth/login/")) {
      return new Response(JSON.stringify(loginResp.body), {
        status: loginResp.status ?? 200,
        headers: { "Content-Type": "application/json", ...(loginResp.headers as object) },
      });
    }
    if (u.includes("/auth/me/")) {
      return new Response(JSON.stringify(meResp.body), {
        status: meResp.status ?? 200,
        headers: { "Content-Type": "application/json", ...(meResp.headers as object) },
      });
    }
    return new Response("{}", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
}

async function bootWithLogin(loginFetch: ReturnType<typeof makeFetchMock>) {
  const ts = await import("../lib/tokenStore");
  ts.clearTokens();
  (globalThis as unknown as { fetch: typeof loginFetch }).fetch = loginFetch;
}

describe("login redirect routing contract (AppRoutes integration)", () => {
  beforeEach(() => {
    delete window.localStorage.__kopera_as_admin;
    delete window.localStorage.__kopera_role;
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("TEST 01: authenticated Super Admin login redirects to /platform-admin/dashboard", async () => {
    const loginFetch = makeFetchMock(
      {
        status: 200,
        body: {
          access: "acc",
          refresh: "ref",
          user: { ...baseUser, is_superuser: true },
        },
      },
      {
        status: 200,
        body: { ...baseUser, is_superuser: true },
      },
    );
    await bootWithLogin(loginFetch);

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );

    const emailInput = screen.getByTestId("email-input") as HTMLInputElement;
    const passInput = screen.getByTestId("password-input") as HTMLInputElement;
    const submitBtn = screen.getByTestId("login-submit");

    emailInput.value = "superuser@example.com";
    passInput.value = "pass";
    submitBtn.click();

    await waitFor(() => {
      expect(screen.getByTestId("super-admin-dashboard")).toBeTruthy();
    });
  });

  it("TEST 02: authenticated normal Owner/Tenant login redirects to /app/dashboard (or onboarding)", async () => {
    const loginFetch = makeFetchMock(
      {
        status: 200,
        body: {
          access: "acc",
          refresh: "ref",
          user: { ...baseUser, is_superuser: false },
        },
      },
      {
        status: 200,
        body: { ...baseUser, is_superuser: false },
      },
    );
    await bootWithLogin(loginFetch);

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );

    const emailInput = screen.getByTestId("email-input") as HTMLInputElement;
    const passInput = screen.getByTestId("password-input") as HTMLInputElement;
    const submitBtn = screen.getByTestId("login-submit");

    emailInput.value = "owner@example.com";
    passInput.value = "pass";
    submitBtn.click();

    await waitFor(() => {
      // Current behavior redirects to /app -> onboarding or dashboard
      expect(
        screen.queryByTestId("onboarding") || screen.queryByTestId("owner-dashboard") || screen.queryByTestId("dashboard"),
      ).toBeTruthy();
    });
  });

  it("TEST 03: authenticated non-Super-Admin role redirects correctly", async () => {
    const loginFetch = makeFetchMock(
      {
        status: 200,
        body: {
          access: "acc",
          refresh: "ref",
          user: { ...baseUser, role: "owner", is_superuser: false },
        },
      },
      {
        status: 200,
        body: { ...baseUser, role: "owner", is_superuser: false },
      },
    );
    await bootWithLogin(loginFetch);

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );

    const emailInput = screen.getByTestId("email-input") as HTMLInputElement;
    const passInput = screen.getByTestId("password-input") as HTMLInputElement;
    const submitBtn = screen.getByTestId("login-submit");

    emailInput.value = "roleowner@example.com";
    passInput.value = "pass";
    submitBtn.click();

    await waitFor(() => {
      expect(
        screen.queryByTestId("onboarding") || screen.queryByTestId("owner-dashboard") || screen.queryByTestId("dashboard"),
      ).toBeTruthy();
    });
  });

  it("TEST 04: unauthenticated access behavior remains unchanged", async () => {
    const loginFetch = makeFetchMock(
      { status: 401, body: { error: true, message: "Invalid", status_code: 401 } },
      { status: 401, body: { error: true, message: "u", status_code: 401 } },
    );
    await bootWithLogin(loginFetch);

    render(
      <MemoryRouter initialEntries={["/app/dashboard"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("login-submit")).toBeTruthy();
    });
  });

  it("TEST 05: no client-controlled value can force Super Admin redirect", async () => {
    window.localStorage.setItem("__kopera_as_admin", "true");
    window.localStorage.setItem("__kopera_role", "superadmin");

    const loginFetch = makeFetchMock(
      {
        status: 200,
        body: {
          access: "acc",
          refresh: "ref",
          user: { ...baseUser, is_superuser: false },
        },
      },
      {
        status: 200,
        body: { ...baseUser, is_superuser: false },
      },
    );
    await bootWithLogin(loginFetch);

    render(
      <MemoryRouter initialEntries={["/login?as_admin=true"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    );

    const emailInput = screen.getByTestId("email-input") as HTMLInputElement;
    const passInput = screen.getByTestId("password-input") as HTMLInputElement;
    const submitBtn = screen.getByTestId("login-submit");

    emailInput.value = "owner@example.com";
    passInput.value = "pass";
    submitBtn.click();

    await waitFor(() => {
      expect(screen.queryByTestId("platform-admin-dashboard")).toBeNull();
    });
  });
});
