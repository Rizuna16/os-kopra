import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Link } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider, useBusiness } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { FinanceAccountList } from "../pages/FinanceAccountList";

const BID = "11111111-1111-1111-1111-111111111111";
const AID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

const account = {
  id: AID,
  name: "Kas",
  code: "1000",
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
    <MemoryRouter initialEntries={["/finance/accounts"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/finance/accounts" element={<FinanceAccountList />} />
            <Route
              path="/finance/accounts/:accountId"
              element={<div data-testid="account-detail-nav">{AID}</div>}
            />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("FinanceAccountList", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("requests accounts for the active business and renders the returned array", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/api/v1/businesses/${BID}/accounts/`)) return new Response(JSON.stringify([account]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderList();
    await waitFor(() => expect(screen.getByTestId("finance-account-list")).toBeTruthy());
    expect(screen.getByText("Kas")).toBeTruthy();
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes(`/api/v1/businesses/${BID}/accounts/`))).toBe(true);
  });

  it("shows a loading state", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response(JSON.stringify([account]), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderList();
    expect(screen.getByTestId("finance-account-list-loading")).toBeTruthy();
  });

  it("handles an empty array with an empty state", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderList();
    await waitFor(() => expect(screen.getByTestId("finance-account-list-empty")).toBeTruthy());
  });

  it("handles an API error with a generic error state", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("Server error", { status: 500 });
    });
    renderList();
    await waitFor(() => expect(screen.getByTestId("finance-account-list-error")).toBeTruthy());
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

  it("navigates to the correct detail route when an account name is clicked", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/api/v1/businesses/${BID}/accounts/`)) return new Response(JSON.stringify([account]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200 });
    });
    renderList();
    await waitFor(() => expect(screen.getByTestId("finance-account-list")).toBeTruthy());
    const link = screen.getByRole("link", { name: "Kas" });
    expect(link.getAttribute("href")).toBe(`/finance/accounts/${AID}`);
    link.click();
    await waitFor(() => expect(screen.getByTestId("account-detail-nav")).toBeTruthy());
  });

  it("reloads data and does not display previous business accounts after context switch", async () => {
    await bootAuth(true);
    const BID_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const BID_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    const accountA = { ...account, id: "ca", business: BID_A, name: "Kas A" };
    const accountB = { ...account, id: "cb", business: BID_B, name: "Kas B" };
    const byBiz: Record<string, unknown[]> = { [BID_A]: [accountA], [BID_B]: [accountB] };
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      const m = String(url).match(/\/api\/v1\/businesses\/([^/]+)\/accounts\//);
      const biz = m ? m[1] : BID_A;
      return new Response(JSON.stringify(byBiz[biz] ?? []), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    localStorage.setItem("kopera_businesses", JSON.stringify([
      { id: BID_A, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" },
      { id: BID_B, name: "Toko B", status: "ACTIVE", created_at: "2024-01-02T00:00:00Z" },
    ]));
    localStorage.setItem("kopera_current_business", BID_A);
    localStorage.setItem("kopera_current_location", "l1");

    function Harness() {
      const b = useBusiness();
      return (
        <div>
          <button data-testid="switch-b" onClick={() => b.selectBusiness(BID_B)}>switch-b</button>
          <FinanceAccountList />
        </div>
      );
    }

    render(
      <MemoryRouter initialEntries={["/finance/accounts"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/finance/accounts" element={<Harness />} />
              <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("Kas A")).toBeTruthy());
    screen.getByTestId("switch-b").click();
    await waitFor(() => expect(screen.queryByText("Kas A")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Kas B")).toBeTruthy());
    expect(screen.queryByText("Kas A")).toBeNull();
  });
});
