import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { FinanceExpenseList } from "../pages/FinanceExpenseList";

const BID = "11111111-1111-1111-1111-111111111111";
const EID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";

const expense = {
  id: EID,
  account: "a1",
  description: "Listrik",
  amount: "50000.00",
  business: BID,
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
    <MemoryRouter initialEntries={["/finance/expenses"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/finance/expenses" element={<FinanceExpenseList />} />
            <Route path="/finance/expenses/new" element={<div data-testid="expense-create-nav" />} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("FinanceExpenseList", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("requests expenses for the active business and renders the array", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/api/v1/businesses/${BID}/expenses/`)) return new Response(JSON.stringify([expense]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderList();
    await waitFor(() => expect(screen.getByTestId("finance-expense-list")).toBeTruthy());
    expect(screen.getByText("Listrik")).toBeTruthy();
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes(`/api/v1/businesses/${BID}/expenses/`))).toBe(true);
  });

  it("shows a loading state", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response(JSON.stringify([expense]), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderList();
    expect(screen.getByTestId("finance-expense-list-loading")).toBeTruthy();
  });

  it("handles an empty array with an empty state", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderList();
    await waitFor(() => expect(screen.getByTestId("finance-expense-list-empty")).toBeTruthy());
  });

  it("handles an API error with a generic error state", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("Server error", { status: 500 });
    });
    renderList();
    await waitFor(() => expect(screen.getByTestId("finance-expense-list-error")).toBeTruthy());
  });

  it("handles 401 gracefully by navigating to login", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("Unauthorized", { status: 401 });
    });
    renderList();
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });

  it("navigates to create page", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200 });
    });
    renderList();
    await waitFor(() => expect(screen.getByTestId("finance-expense-list")).toBeTruthy());
    const link = screen.getByRole("link", { name: /create expense|new expense/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("/finance/expenses/new");
  });
});