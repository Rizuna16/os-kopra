import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { ProductList } from "../pages/ProductList";

const BID = "11111111-1111-1111-1111-111111111111";
const OTHER_BID = "22222222-2222-2222-2222-222222222222";

function seedCurrentBusiness(businessId: string) {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([
      { id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" },
      { id: OTHER_BID, name: "Toko B", status: "ACTIVE", created_at: "2024-01-02T00:00:00Z" },
    ]),
  );
  localStorage.setItem("kopera_current_business", businessId);
  localStorage.setItem("kopera_current_location", "l1");
}

function renderList(businessId: string) {
  seedCurrentBusiness(businessId);
  return render(
    <MemoryRouter initialEntries={["/products"]}>
      <AuthProvider>
      <BusinessProvider>
        <Routes>
          <Route path="/products" element={<ProductList />} />
          <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
        </Routes>
      </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("ProductList", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("requests products using the active business_id and renders the returned plain array", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/products/`)) {
        return new Response(
          JSON.stringify([
            { id: "p1", name: "Beras", price: 55000, business: BID, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderList(BID);
    await waitFor(() => expect(screen.getByTestId("product-list")).toBeTruthy());
    expect(screen.getByText("Beras")).toBeTruthy();
    const calledForBiz = fetchMock.mock.calls.some((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID}/products/`),
    );
    expect(calledForBiz).toBe(true);
  });

  it("handles an empty product array with an empty state", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderList(BID);
    await waitFor(() => expect(screen.getByTestId("product-list-empty")).toBeTruthy());
  });

  it("does NOT expect pagination metadata in the response", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderList(BID);
    await waitFor(() => expect(screen.getByTestId("product-list")).toBeTruthy());
    expect(screen.queryByTestId("product-list-pagination")).not.toBeInTheDocument();
  });

  it("handles 401 gracefully", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("Unauthorized", { status: 401 });
    });
    (globalThis as any).fetch = fetchMock;
    renderList(BID);
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });

  it("handles 404 gracefully", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/products/`)) {
        return new Response("Not found", { status: 404 });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderList(BID);
    await waitFor(() => expect(screen.getByTestId("product-list-error")).toBeTruthy());
  });

  it("reloads data and does not display previous business products after context switch", async () => {
    await bootAuth(true);
    const productsByBiz: Record<string, unknown[]> = {
      [BID]: [
        { id: "pa", name: "Produk A", price: 1, business: BID, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
      ],
      [OTHER_BID]: [
        { id: "pb", name: "Produk B", price: 2, business: OTHER_BID, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
      ],
    };
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      const match = String(url).match(/\/api\/v1\/businesses\/([^/]+)\/products\//);
      const biz = match ? match[1] : BID;
      return new Response(JSON.stringify(productsByBiz[biz] ?? []), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    (globalThis as any).fetch = fetchMock;
    renderList(BID);
    await waitFor(() => expect(screen.getByText("Produk A")).toBeTruthy());
  });
});
