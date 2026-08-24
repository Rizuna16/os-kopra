import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "../auth/AuthContext";
import { useState, useEffect } from "react";

const userObj = {
  id: "1",
  email: "a@b.com",
  first_name: "",
  last_name: "",
  is_email_verified: true,
  created_at: "",
  updated_at: "",
};

function Probe() {
  const { status, user } = useAuth();
  return (
    <div data-testid="probe">
      {status}:{user?.email ?? "none"}
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("starts unauthenticated when no refresh token exists", async () => {
    const { clearTokens } = await import("../lib/tokenStore");
    clearTokens();
    render(
      <MemoryRouter>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("probe").textContent).toBe(
        "unauthenticated:none",
      ),
    );
  });

  it("loads current user via /me when a refresh token exists", async () => {
    const { setRefreshToken, setAccessToken } = await import(
      "../lib/tokenStore"
    );
    setRefreshToken("r");
    setAccessToken("a");
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    render(
      <MemoryRouter>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("probe").textContent).toBe(
        "authenticated:a@b.com",
      ),
    );
  });

  it("login stores tokens and authenticates the context", async () => {
    const { clearTokens } = await import("../lib/tokenStore");
    clearTokens();
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/login/")) {
        return new Response(
          JSON.stringify({
            access: "acc",
            refresh: "ref",
            user: userObj,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    function Harness() {
      const { login, status, user } = useAuth();
      const [done, setDone] = useState(false);
      useEffect(() => {
        login({ email: "a@b.com", password: "p" }).then(() => setDone(true));
      }, [login]);
      return (
        <div data-testid="h">
          {status}:{user?.email ?? "none"}:{done ? "done" : ""}
        </div>
      );
    }

    render(
      <MemoryRouter>
        <AuthProvider>
          <Harness />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("h").textContent).toContain(
        "authenticated:a@b.com",
      ),
    );
    const { getAccessToken, getRefreshToken } = await import(
      "../lib/tokenStore"
    );
    expect(getAccessToken()).toBe("acc");
    expect(getRefreshToken()).toBe("ref");
  });

  it("logout clears tokens and resets context", async () => {
    const { setAccessToken, setRefreshToken } = await import(
      "../lib/tokenStore"
    );
    setAccessToken("a");
    setRefreshToken("r");
    (globalThis as any).fetch = vi.fn(async () =>
      new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    function Harness() {
      const { logout, status, user } = useAuth();
      const [label, setLabel] = useState("init");
      useEffect(() => {
        logout().then(() => setLabel("logged-out"));
      }, [logout]);
      return (
        <div data-testid="h">
          {label}:{status}:{user?.email ?? "none"}
        </div>
      );
    }
    render(
      <MemoryRouter>
        <AuthProvider>
          <Harness />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("h").textContent).toContain("logged-out"),
    );
    const { getAccessToken, getRefreshToken } = await import(
      "../lib/tokenStore"
    );
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});
