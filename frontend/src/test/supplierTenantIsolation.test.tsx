import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider, useBusiness } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { SupplierList } from "../pages/SupplierList";

const BID_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const BID_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const SUPPLIER_A = {
  id: "sa",
  business: BID_A,
  name: "Supplier A",
  phone: "",
  email: "",
  address: "",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};
const SUPPLIER_B = {
  id: "sb",
  business: BID_B,
  name: "Supplier B",
  phone: "",
  email: "",
  address: "",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

function renderWithSwitch() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([
      { id: BID_A, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" },
      { id: BID_B, name: "Toko B", status: "ACTIVE", created_at: "2024-01-02T00:00:00Z" },
    ]),
  );
  localStorage.setItem("kopera_current_business", BID_A);
  localStorage.setItem("kopera_current_location", "l1");

  function Harness() {
    const b = useBusiness();
    return (
      <div>
        <div data-testid="ctx-biz">{b.currentBusinessId}</div>
        <button data-testid="switch-b" onClick={() => b.selectBusiness(BID_B)}>
          switch-b
        </button>
        <SupplierList />
      </div>
    );
  }

  return render(
    <MemoryRouter initialEntries={["/suppliers"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/suppliers" element={<Harness />} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("SupplierTenantIsolation", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("uses currentBusinessId for Supplier list, then reloads with new Business after switching", async () => {
    await bootAuth(true);
    const suppliersByBiz: Record<string, unknown[]> = {
      [BID_A]: [SUPPLIER_A],
      [BID_B]: [SUPPLIER_B],
    };
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      const m = String(url).match(/\/api\/v1\/businesses\/([^/]+)\/suppliers\//);
      const biz = m ? m[1] : BID_A;
      return new Response(JSON.stringify(suppliersByBiz[biz] ?? []), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;

    renderWithSwitch();

    await waitFor(() => expect(screen.getByText("Supplier A")).toBeTruthy());
    const calledA = fetchMock.mock.calls.some((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID_A}/suppliers/`) &&
      (c[1]?.method ?? "GET") === "GET",
    );
    expect(calledA).toBe(true);

    screen.getByTestId("switch-b").click();

    await waitFor(() => expect(screen.queryByText("Supplier A")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Supplier B")).toBeTruthy());
    const calledB = fetchMock.mock.calls.some((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID_B}/suppliers/`) &&
      (c[1]?.method ?? "GET") === "GET",
    );
    expect(calledB).toBe(true);
  });

  it("never keeps a stale Supplier A visible after switching business context", async () => {
    await bootAuth(true);
    const suppliersByBiz: Record<string, unknown[]> = {
      [BID_A]: [SUPPLIER_A],
      [BID_B]: [SUPPLIER_B],
    };
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      const m = String(url).match(/\/api\/v1\/businesses\/([^/]+)\/suppliers\//);
      const biz = m ? m[1] : BID_A;
      return new Response(JSON.stringify(suppliersByBiz[biz] ?? []), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;

    renderWithSwitch();
    await waitFor(() => expect(screen.getByText("Supplier A")).toBeTruthy());
    screen.getByTestId("switch-b").click();
    await waitFor(() => expect(screen.queryByText("Supplier A")).not.toBeInTheDocument());
  });

  it("never sends business in the request body", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID_A}/suppliers/`)) {
        return new Response(JSON.stringify([SUPPLIER_A]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    renderWithSwitch();
    await waitFor(() => expect(screen.getByText("Supplier A")).toBeTruthy());
    const bodyHasBusiness = fetchMock.mock.calls.some((c) => {
      const init = c[1];
      if (!init || init.method === "GET" || init.body === undefined) return false;
      return String(init.body).includes("business");
    });
    expect(bodyHasBusiness).toBe(false);
  });
});
