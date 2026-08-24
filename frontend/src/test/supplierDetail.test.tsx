import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { SupplierDetail } from "../pages/SupplierDetail";

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

function tree() {
  seedContext();
  return (
    <MemoryRouter initialEntries={[`/suppliers/${SID}`]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/suppliers/:supplierId" element={<SupplierDetail />} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("SupplierDetail", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows a loading state", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response(JSON.stringify(supplier), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    render(tree());
    expect(screen.getByTestId("supplier-detail-loading")).toBeTruthy();
  });

  it("loads the correct supplier by id and renders all fields", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/suppliers/${SID}/`)) {
        return new Response(JSON.stringify(supplier), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    render(tree());
    await waitFor(() => expect(screen.getByTestId("supplier-detail")).toBeTruthy());
    expect(screen.getByTestId("supplier-detail-id").textContent).toBe(SID);
    expect(screen.getByTestId("supplier-detail-business").textContent).toBe(BID);
    expect(screen.getByTestId("supplier-detail-name").textContent).toBe("Supplier A");
    expect(screen.getByTestId("supplier-detail-phone").textContent).toBe("081234567890");
    expect(screen.getByTestId("supplier-detail-email").textContent).toBe("a@supplier.com");
    expect(screen.getByTestId("supplier-detail-address").textContent).toBe("Jl. Contoh 1");
    expect(screen.getByTestId("supplier-detail-created-at").textContent).toBe("2024-01-01T00:00:00Z");
    expect(screen.getByTestId("supplier-detail-updated-at").textContent).toBe("2024-01-01T00:00:00Z");
    const called = fetchMock.mock.calls.some((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID}/suppliers/${SID}/`),
    );
    expect(called).toBe(true);
  });

  it("co-renders the delete control on the detail route", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/suppliers/${SID}/`)) {
        return new Response(JSON.stringify(supplier), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    render(tree());
    await waitFor(() => expect(screen.getByTestId("supplier-detail")).toBeTruthy());
    expect(screen.getByTestId("supplier-delete")).toBeTruthy();
    expect(screen.getByTestId("supplier-delete-submit")).toBeTruthy();
  });

  it("handles a generic error state on failure", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response("Server error", { status: 500 });
    });
    (globalThis as any).fetch = fetchMock;
    render(tree());
    await waitFor(() => expect(screen.getByTestId("supplier-detail-error")).toBeTruthy());
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
      if (String(url).includes(`/api/v1/businesses/${BID}/suppliers/${SID}/`)) {
        return new Response("Not found", { status: 404 });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    render(tree());
    await waitFor(() => expect(screen.getByTestId("supplier-detail-error")).toBeTruthy());
  });
});
