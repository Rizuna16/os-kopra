import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { CustomerLoyaltyRecordList } from "../pages/CustomerLoyaltyRecordList";

const BID = "11111111-1111-1111-1111-111111111111";
const PROGID = "33333333-3333-3333-3333-333333333333";

const record = {
  id: "44444444-4444-4444-4444-444444444444",
  business: BID,
  program: PROGID,
  customer: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  points_balance: "100.00",
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

function renderList() {
  seedContext();
  return render(
    <MemoryRouter initialEntries={[`/loyalty-programs/${PROGID}/customers`]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/loyalty-programs/:programId/customers" element={<CustomerLoyaltyRecordList />} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("CustomerLoyaltyRecordList", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("requests records for the active business + program and renders the returned plain array", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/loyalty-programs/${PROGID}/customers/`)) {
        return new Response(JSON.stringify([record]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderList();
    await waitFor(() => expect(screen.getByTestId("customer-loyalty-record-list")).toBeTruthy());
    expect(screen.getByText("100.00")).toBeTruthy();
    const called = fetchMock.mock.calls.some((c) => String(c[0]).includes(`/api/v1/businesses/${BID}/loyalty-programs/${PROGID}/customers/`));
    expect(called).toBe(true);
  });

  it("shows a loading state", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderList();
    expect(screen.getByTestId("customer-loyalty-record-list-loading")).toBeTruthy();
  });

  it("shows empty state when no records", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderList();
    await waitFor(() => expect(screen.getByTestId("customer-loyalty-record-list-empty")).toBeTruthy());
  });

  it("handles API error with generic error state", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response("Server error", { status: 500 });
    });
    (globalThis as any).fetch = fetchMock;
    renderList();
    await waitFor(() => expect(screen.getByTestId("customer-loyalty-record-list-error")).toBeTruthy());
  });

  it("handles 401 gracefully by navigating to login", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response("Unauthorized", { status: 401 });
    });
    (globalThis as any).fetch = fetchMock;
    renderList();
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });

  it("handles 404 gracefully with a generic error state", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/loyalty-programs/${PROGID}/customers/`)) {
        return new Response("Not found", { status: 404 });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderList();
    await waitFor(() => expect(screen.getByTestId("customer-loyalty-record-list-error")).toBeTruthy());
  });
});
