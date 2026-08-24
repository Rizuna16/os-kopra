import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { CustomerDetail } from "../pages/CustomerDetail";

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

function tree() {
  seedContext();
  return (
    <MemoryRouter initialEntries={[`/customers/${CID}`]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/customers/:customerId" element={<CustomerDetail />} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("CustomerDetail", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows a loading state", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response(JSON.stringify(customer), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    render(tree());
    expect(screen.getByTestId("customer-detail-loading")).toBeTruthy();
  });

  it("loads the correct customer by id and renders all fields", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/customers/${CID}/`)) {
        return new Response(JSON.stringify(customer), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    render(tree());
    await waitFor(() => expect(screen.getByTestId("customer-detail")).toBeTruthy());
    expect(screen.getByTestId("customer-detail-id").textContent).toBe(CID);
    expect(screen.getByTestId("customer-detail-business").textContent).toBe(BID);
    expect(screen.getByTestId("customer-detail-name").textContent).toBe("Customer A");
    expect(screen.getByTestId("customer-detail-phone").textContent).toBe("081234567890");
    expect(screen.getByTestId("customer-detail-email").textContent).toBe("a@customer.com");
    expect(screen.getByTestId("customer-detail-address").textContent).toBe("Jl. Contoh 1");
    expect(screen.getByTestId("customer-detail-created-at").textContent).toBe("2024-01-01T00:00:00Z");
    expect(screen.getByTestId("customer-detail-updated-at").textContent).toBe("2024-01-01T00:00:00Z");
    const called = fetchMock.mock.calls.some((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID}/customers/${CID}/`),
    );
    expect(called).toBe(true);
  });

  it("co-renders the delete control on the detail route", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/customers/${CID}/`)) {
        return new Response(JSON.stringify(customer), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    render(tree());
    await waitFor(() => expect(screen.getByTestId("customer-detail")).toBeTruthy());
    expect(screen.getByTestId("customer-delete")).toBeTruthy();
    expect(screen.getByTestId("customer-delete-submit")).toBeTruthy();
  });

  it("handles a generic error state on failure", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response("Server error", { status: 500 });
    });
    (globalThis as any).fetch = fetchMock;
    render(tree());
    await waitFor(() => expect(screen.getByTestId("customer-detail-error")).toBeTruthy());
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

  it("handles 404 gracefully with a generic error (no cross-tenant exposure)", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/customers/${CID}/`)) {
        return new Response("Not found", { status: 404 });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    render(tree());
    await waitFor(() => expect(screen.getByTestId("customer-detail-error")).toBeTruthy());
  });
});
