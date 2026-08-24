import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider, useBusiness } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { PurchaseOrderList } from "../pages/PurchaseOrderList";

const BID_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const BID_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const POID = "55555555-5555-5555-5555-555555555555";

const PO_A = {
  id: "poa",
  business: BID_A,
  supplier: "sa",
  location: "la",
  status: "DRAFT",
  lines: [],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};
const PO_B = {
  id: "pob",
  business: BID_B,
  supplier: "sb",
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
        <PurchaseOrderList />
      </div>
    );
  }

  return render(
    <MemoryRouter initialEntries={["/purchasing"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/purchasing" element={<Harness />} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("PurchaseOrderTenantIsolation", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("uses currentBusinessId for the Purchase Order list, then reloads with the new Business after switching", async () => {
    await bootAuth(true);
    const poByBiz: Record<string, unknown[]> = {
      [BID_A]: [PO_A],
      [BID_B]: [PO_B],
    };
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      const m = String(url).match(/\/api\/v1\/businesses\/([^/]+)\/purchase-orders\//);
      const biz = m ? m[1] : BID_A;
      return new Response(JSON.stringify(poByBiz[biz] ?? []), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;

    renderWithSwitch();

    await waitFor(() => expect(screen.getByText("poa")).toBeTruthy());
    const calledA = fetchMock.mock.calls.some((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID_A}/purchase-orders/`) &&
      (c[1]?.method ?? "GET") === "GET",
    );
    expect(calledA).toBe(true);

    screen.getByTestId("switch-b").click();

    await waitFor(() => expect(screen.queryByText("poa")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("pob")).toBeTruthy());
    const calledB = fetchMock.mock.calls.some((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID_B}/purchase-orders/`) &&
      (c[1]?.method ?? "GET") === "GET",
    );
    expect(calledB).toBe(true);
  });

  it("never keeps a stale PO from business A visible after switching business context", async () => {
    await bootAuth(true);
    const poByBiz: Record<string, unknown[]> = {
      [BID_A]: [PO_A],
      [BID_B]: [PO_B],
    };
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      const m = String(url).match(/\/api\/v1\/businesses\/([^/]+)\/purchase-orders\//);
      const biz = m ? m[1] : BID_A;
      return new Response(JSON.stringify(poByBiz[biz] ?? []), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;

    renderWithSwitch();
    await waitFor(() => expect(screen.getByText("poa")).toBeTruthy());
    screen.getByTestId("switch-b").click();
    await waitFor(() => expect(screen.queryByText("poa")).not.toBeInTheDocument());
  });

  it("surfaces a cross-business 404 and does not leak another tenant's purchase order", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID_A}/purchase-orders/`)) {
        return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID_B}/purchase-orders/`)) {
        return new Response("Not found", { status: 404 });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    seedBusinesses();
    localStorage.setItem("kopera_current_business", BID_B);
    function Harness() {
      return <PurchaseOrderList />;
    }
    render(
      <MemoryRouter initialEntries={[`/purchasing/${POID}`]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/purchasing/:poId" element={<Harness />} />
              <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("purchase-order-list-error")).toBeTruthy());
  });

  it("never sends business in the request body (businessId comes only from context)", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID_A}/purchase-orders/`)) {
        return new Response(JSON.stringify([PO_A]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    renderWithSwitch();
    await waitFor(() => expect(screen.getByText("poa")).toBeTruthy());
    const bodyHasBusiness = fetchMock.mock.calls.some((c) => {
      const init = c[1];
      if (!init || init.method === "GET" || init.body === undefined) return false;
      return String(init.body).includes("business");
    });
    expect(bodyHasBusiness).toBe(false);
  });
});
