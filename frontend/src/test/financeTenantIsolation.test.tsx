import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider, useBusiness } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { FinanceAccountList } from "../pages/FinanceAccountList";

const BID_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const BID_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const accountA = {
  id: "ca",
  name: "Kas A",
  code: "1001",
  business: BID_A,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};
const accountB = {
  id: "cb",
  name: "Kas B",
  code: "1002",
  business: BID_B,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

function seedContextWithCurrent(bid: string) {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([
      { id: BID_A, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" },
      { id: BID_B, name: "Toko B", status: "ACTIVE", created_at: "2024-01-02T00:00:00Z" },
    ]),
  );
  localStorage.setItem("kopera_current_business", bid);
  localStorage.setItem("kopera_current_location", "l1");
}

function renderAccountList() {
  return render(
    <MemoryRouter initialEntries={["/finance/accounts"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/finance/accounts" element={<FinanceAccountList />} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("Finance tenant isolation", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows only business A accounts when business A is current", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      const m = String(url).match(/\/api\/v1\/businesses\/([^/]+)\/accounts\//);
      const biz = m ? m[1] : "";
      if (biz === BID_A) return new Response(JSON.stringify([accountA]), { status: 200, headers: { "Content-Type": "application/json" } });
      if (biz === BID_B) return new Response(JSON.stringify([accountB]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    seedContextWithCurrent(BID_A);
    renderAccountList();
    await waitFor(() => expect(screen.getByText("Kas A")).toBeTruthy());
    expect(screen.queryByText("Kas B")).toBeNull();
  });

  it("shows only business B accounts when business B is current after switching", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      const m = String(url).match(/\/api\/v1\/businesses\/([^/]+)\/accounts\//);
      const biz = m ? m[1] : "";
      if (biz === BID_A) return new Response(JSON.stringify([accountA]), { status: 200, headers: { "Content-Type": "application/json" } });
      if (biz === BID_B) return new Response(JSON.stringify([accountB]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    seedContextWithCurrent(BID_A);

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

  it("blocks cross-business access returning 404 for account detail", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/api/v1/businesses/${BID_A}/accounts/`)) return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/api/v1/businesses/${BID_B}/accounts/`)) return new Response("Not found", { status: 404 });
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    seedContextWithCurrent(BID_A);
    render(
      <MemoryRouter initialEntries={[`/finance/accounts/${accountA.id}`]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/finance/accounts/:accountId" element={<div data-testid="account-detail-nav" />} />
              <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("account-detail-nav")).toBeTruthy());
  });
});