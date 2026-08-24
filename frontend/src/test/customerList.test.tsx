import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Link } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider, useBusiness } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { CustomerList } from "../pages/CustomerList";

const BID = "11111111-1111-1111-1111-111111111111";
const CID = "33333333-3333-3333-3333-333333333333";

const customer = {
  id: CID,
  business: BID,
  name: "Customer A",
  phone: "081234567890",
  email: "a@customer.com",
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
    <MemoryRouter initialEntries={["/customers"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/customers" element={<CustomerList />} />
            <Route
              path="/customers/:customerId"
              element={<div data-testid="customer-detail-nav">{CID}</div>}
            />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("CustomerList", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("requests customers for the active business and renders the returned plain array", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/customers/`)) {
        return new Response(JSON.stringify([customer]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderList();
    await waitFor(() => expect(screen.getByTestId("customer-list")).toBeTruthy());
    expect(screen.getByText("Customer A")).toBeTruthy();
    const calledForBiz = fetchMock.mock.calls.some((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID}/customers/`),
    );
    expect(calledForBiz).toBe(true);
  });

  it("shows a loading state", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response(JSON.stringify([customer]), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderList();
    expect(screen.getByTestId("customer-list-loading")).toBeTruthy();
  });

  it("handles an empty customer array with an empty state", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderList();
    await waitFor(() => expect(screen.getByTestId("customer-list-empty")).toBeTruthy());
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
    await waitFor(() => expect(screen.getByTestId("customer-list-error")).toBeTruthy());
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
      if (String(url).includes(`/api/v1/businesses/${BID}/customers/`)) {
        return new Response("Not found", { status: 404 });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderList();
    await waitFor(() => expect(screen.getByTestId("customer-list-error")).toBeTruthy());
  });

  it("navigates to the correct detail route when a customer name is clicked", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/customers/`)) {
        return new Response(JSON.stringify([customer]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderList();
    await waitFor(() => expect(screen.getByTestId("customer-list")).toBeTruthy());
    const link = screen.getByRole("link", { name: "Customer A" });
    expect(link.getAttribute("href")).toBe(`/customers/${CID}`);
    link.click();
    await waitFor(() => expect(screen.getByTestId("customer-detail-nav")).toBeTruthy());
  });

  it("reloads data and does not display previous business customers after context switch", async () => {
    await bootAuth(true);
    const BID_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const BID_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    const customerA = { ...customer, id: "ca", business: BID_A, name: "Customer A" };
    const customerB = { ...customer, id: "cb", business: BID_B, name: "Customer B" };
    const customersByBiz: Record<string, unknown[]> = {
      [BID_A]: [customerA],
      [BID_B]: [customerB],
    };
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      const match = String(url).match(/\/api\/v1\/businesses\/([^/]+)\/customers\//);
      const biz = match ? match[1] : BID_A;
      return new Response(JSON.stringify(customersByBiz[biz] ?? []), {
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
          <CustomerList />
        </div>
      );
    }

    render(
      <MemoryRouter initialEntries={["/customers"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/customers" element={<Harness />} />
              <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("Customer A")).toBeTruthy());
    screen.getByTestId("switch-b").click();
    await waitFor(() => expect(screen.queryByText("Customer A")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Customer B")).toBeTruthy());
    expect(screen.queryByText("Customer A")).toBeNull();
  });
});
