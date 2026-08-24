import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { LoyaltyProgramDetail } from "../pages/LoyaltyProgramDetail";

const BID = "11111111-1111-1111-1111-111111111111";
const PROGID = "33333333-3333-3333-3333-333333333333";

const program = {
  id: PROGID,
  business: BID,
  name: "Loyalty Pro",
  status: "ACTIVE",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

function seedContext() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([{ id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" }]),
  );
  localStorage.setItem("kopera_current_business", BID);
  localStorage.setItem("kopera_current_location", "l1");
}

function tree() {
  seedContext();
  return (
    <MemoryRouter initialEntries={[`/loyalty-programs/${PROGID}`]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/loyalty-programs/:programId" element={<LoyaltyProgramDetail />} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("LoyaltyProgramDetail", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows a loading state", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response(JSON.stringify(program), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    render(tree());
    expect(screen.getByTestId("loyalty-program-detail-loading")).toBeTruthy();
  });

  it("loads the correct program by id and renders all fields", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/loyalty-programs/${PROGID}/`)) {
        return new Response(JSON.stringify(program), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    render(tree());
    await waitFor(() => expect(screen.getByTestId("loyalty-program-detail")).toBeTruthy());
    expect(screen.getByTestId("loyalty-program-detail-id").textContent).toBe(PROGID);
    expect(screen.getByTestId("loyalty-program-detail-business").textContent).toBe(BID);
    expect(screen.getByTestId("loyalty-program-detail-name").textContent).toBe("Loyalty Pro");
    expect(screen.getByTestId("loyalty-program-detail-status").textContent).toBe("ACTIVE");
    const called = fetchMock.mock.calls.some((c) => String(c[0]).includes(`/api/v1/businesses/${BID}/loyalty-programs/${PROGID}/`));
    expect(called).toBe(true);
  });

  it("handles a generic error state on failure", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response("Server error", { status: 500 });
    });
    (globalThis as any).fetch = fetchMock;
    render(tree());
    await waitFor(() => expect(screen.getByTestId("loyalty-program-detail-error")).toBeTruthy());
  });

  it("handles 401 gracefully by navigating to login", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response("Unauthorized", { status: 401 });
    });
    (globalThis as any).fetch = fetchMock;
    render(tree());
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });

  it("handles 404 gracefully with a generic error", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/loyalty-programs/${PROGID}/`)) {
        return new Response("Not found", { status: 404 });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    render(tree());
    await waitFor(() => expect(screen.getByTestId("loyalty-program-detail-error")).toBeTruthy());
  });
});
