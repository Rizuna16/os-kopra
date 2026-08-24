import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider, useBusiness } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { SaleList } from "../pages/SaleList";

const BID_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const BID_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const SALEID = "55555555-5555-5555-5555-555555555555";

const SALE_A = {
  id: "sa",
  business: BID_A,
  location: "la",
  status: "DRAFT",
  lines: [],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};
const SALE_B = {
  id: "sb",
  business: BID_B,
  location: "lb",
  status: "DRAFT",
  lines: [],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

function seedBusinesses() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([
      { id: BID_A, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" },
      { id: BID_B, name: "Toko B", status: "ACTIVE", created_at: "2024-01-02T00:00:00Z" },
    ]),
  );
  localStorage.setItem("kopera_current_business", BID_A);
  localStorage.setItem("kopera_current_location", "l1");
}

function renderWithSwitch() {
  seedBusinesses();
  function Harness() {
    const b = useBusiness();
    return (
      <div>
        <div data-testid="ctx-biz">{b.currentBusinessId}</div>
        <button data-testid="switch-b" onClick={() => b.selectBusiness(BID_B)}>
          switch-b
        </button>
        <SaleList />
      </div>
    );
  }

  return render(
    <MemoryRouter initialEntries={["/sales"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/sales" element={<Harness />} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("SaleTenantIsolation", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("uses currentBusinessId for the Sale list, then reloads with the new Business after switching", async () => {
    await bootAuth(true);
    const saleByBiz: Record<string, unknown[]> = {
      [BID_A]: [SALE_A],
      [BID_B]: [SALE_B],
    };
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      const m = String(url).match(/\/api\/v1\/businesses\/([^/]+)\/sales\//);
      const biz = m ? m[1] : BID_A;
      return new Response(JSON.stringify(saleByBiz[biz] ?? []), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;

    renderWithSwitch();

    await waitFor(() => expect(screen.getByText("sa")).toBeTruthy());
    const calledA = fetchMock.mock.calls.some((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID_A}/sales/`) &&
      (c[1]?.method ?? "GET") === "GET",
    );
    expect(calledA).toBe(true);

    screen.getByTestId("switch-b").click();

    await waitFor(() => expect(screen.queryByText("sa")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("sb")).toBeTruthy());
    const calledB = fetchMock.mock.calls.some((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID_B}/sales/`) &&
      (c[1]?.method ?? "GET") === "GET",
    );
    expect(calledB).toBe(true);
  });

  it("never keeps a stale sale from business A visible after switching business context", async () => {
    await bootAuth(true);
    const saleByBiz: Record<string, unknown[]> = {
      [BID_A]: [SALE_A],
      [BID_B]: [SALE_B],
    };
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      const m = String(url).match(/\/api\/v1\/businesses\/([^/]+)\/sales\//);
      const biz = m ? m[1] : BID_A;
      return new Response(JSON.stringify(saleByBiz[biz] ?? []), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;

    renderWithSwitch();
    await waitFor(() => expect(screen.getByText("sa")).toBeTruthy());
    screen.getByTestId("switch-b").click();
    await waitFor(() => expect(screen.queryByText("sa")).not.toBeInTheDocument());
  });

  it("surfaces a cross-business 404 and does not leak another tenant's sale", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID_A}/sales/`)) {
        return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID_B}/sales/`)) {
        return new Response("Not found", { status: 404 });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    seedBusinesses();
    localStorage.setItem("kopera_current_business", BID_B);
    function Harness() {
      return <SaleList />;
    }
    render(
      <MemoryRouter initialEntries={[`/sales/${SALEID}`]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/sales/:saleId" element={<Harness />} />
              <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("sale-list-error")).toBeTruthy());
  });

  it("never sends business in the request body (businessId comes only from context)", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID_A}/sales/`)) {
        return new Response(JSON.stringify([SALE_A]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    renderWithSwitch();
    await waitFor(() => expect(screen.getByText("sa")).toBeTruthy());
    const bodyHasBusiness = fetchMock.mock.calls.some((c) => {
      const init = c[1];
      if (!init || init.method === "GET" || init.body === undefined) return false;
      return String(init.body).includes("business");
    });
    expect(bodyHasBusiness).toBe(false);
  });
});
