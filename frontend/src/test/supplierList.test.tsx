import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Link } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider, useBusiness } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { SupplierList } from "../pages/SupplierList";

const BID = "11111111-1111-1111-1111-111111111111";
const SID = "33333333-3333-3333-3333-333333333333";

const supplier = {
  id: SID,
  business: BID,
  name: "Supplier A",
  phone: "081234567890",
  email: "a@supplier.com",
  address: "Jl. Contoh 1",
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
    <MemoryRouter initialEntries={["/suppliers"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/suppliers" element={<SupplierList />} />
            <Route
              path="/suppliers/:supplierId"
              element={<div data-testid="supplier-detail-nav">{SID}</div>}
            />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("SupplierList", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("requests suppliers for the active business and renders the returned plain array", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/suppliers/`)) {
        return new Response(JSON.stringify([supplier]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderList();
    await waitFor(() => expect(screen.getByTestId("supplier-list")).toBeTruthy());
    expect(screen.getByText("Supplier A")).toBeTruthy();
    const calledForBiz = fetchMock.mock.calls.some((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID}/suppliers/`),
    );
    expect(calledForBiz).toBe(true);
  });

  it("shows a loading state", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response(JSON.stringify([supplier]), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderList();
    expect(screen.getByTestId("supplier-list-loading")).toBeTruthy();
  });

  it("handles an empty supplier array with an empty state", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderList();
    await waitFor(() => expect(screen.getByTestId("supplier-list-empty")).toBeTruthy());
  });

  it("handles an API error with a generic error state", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("Server error", { status: 500 });
    });
    (globalThis as any).fetch = fetchMock;
    renderList();
    await waitFor(() => expect(screen.getByTestId("supplier-list-error")).toBeTruthy());
  });

  it("handles 401 gracefully by navigating to login", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("Unauthorized", { status: 401 });
    });
    (globalThis as any).fetch = fetchMock;
    renderList();
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });

  it("handles 404 gracefully with a generic error state", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/suppliers/`)) {
        return new Response("Not found", { status: 404 });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderList();
    await waitFor(() => expect(screen.getByTestId("supplier-list-error")).toBeTruthy());
  });

  it("navigates to the correct detail route when a supplier name is clicked", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/suppliers/`)) {
        return new Response(JSON.stringify([supplier]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderList();
    await waitFor(() => expect(screen.getByTestId("supplier-list")).toBeTruthy());
    const link = screen.getByRole("link", { name: "Supplier A" });
    expect(link.getAttribute("href")).toBe(`/suppliers/${SID}`);
    link.click();
    await waitFor(() => expect(screen.getByTestId("supplier-detail-nav")).toBeTruthy());
  });

  it("reloads data and does not display previous business suppliers after context switch", async () => {
    await bootAuth(true);
    const BID_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const BID_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    const supplierA = { ...supplier, id: "sa", business: BID_A, name: "Supplier A" };
    const supplierB = { ...supplier, id: "sb", business: BID_B, name: "Supplier B" };
    const suppliersByBiz: Record<string, unknown[]> = {
      [BID_A]: [supplierA],
      [BID_B]: [supplierB],
    };
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      const match = String(url).match(/\/api\/v1\/businesses\/([^/]+)\/suppliers\//);
      const biz = match ? match[1] : BID_A;
      return new Response(JSON.stringify(suppliersByBiz[biz] ?? []), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    (globalThis as any).fetch = fetchMock;

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
          <button data-testid="switch-b" onClick={() => b.selectBusiness(BID_B)}>
            switch-b
          </button>
          <SupplierList />
        </div>
      );
    }

    render(
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

    await waitFor(() => expect(screen.getByText("Supplier A")).toBeTruthy());
    screen.getByTestId("switch-b").click();
    await waitFor(() => expect(screen.queryByText("Supplier A")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Supplier B")).toBeTruthy());
    expect(screen.queryByText("Supplier A")).toBeNull();
  });
});
