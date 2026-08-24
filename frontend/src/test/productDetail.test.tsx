import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { ProductDetail } from "../pages/ProductDetail";

const BID = "11111111-1111-1111-1111-111111111111";
const PID = "22222222-2222-2222-2222-222222222222";

function seedCurrentBusiness() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([{ id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" }]),
  );
  localStorage.setItem("kopera_current_business", BID);
  localStorage.setItem("kopera_current_location", "l1");
}

function renderDetail() {
  seedCurrentBusiness();
  return render(
    <MemoryRouter initialEntries={[`/products/${PID}`]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/products/:productId" element={<ProductDetail />} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function productResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: PID,
    name: "Beras 5kg",
    price: 55000,
    business: BID,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("ProductDetail", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("requests the correct business_id and product_id", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify(productResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("product-detail")).toBeTruthy());
    const called = fetchMock.mock.calls.some((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID}/products/${PID}/`),
    );
    expect(called).toBe(true);
  });

  it("renders id, name, price, business, created_at and updated_at", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response(JSON.stringify(productResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("product-detail")).toBeTruthy());
    expect(screen.getByTestId("product-detail-id").textContent).toBe(PID);
    expect(screen.getByTestId("product-detail-name").textContent).toBe("Beras 5kg");
    expect(screen.getByTestId("product-detail-business").textContent).toBe(BID);
    expect(screen.getByTestId("product-detail-created-at").textContent).toBeTruthy();
    expect(screen.getByTestId("product-detail-updated-at").textContent).toBeTruthy();
  });

  it("handles an integer price representation", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response(JSON.stringify(productResponse({ price: 55000 })), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("product-detail")).toBeTruthy());
    expect(screen.getByTestId("product-detail-price").textContent).toBe("55000");
  });

  it("handles a decimal-string price representation", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response(JSON.stringify(productResponse({ price: "55000.50" })), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("product-detail")).toBeTruthy());
    expect(screen.getByTestId("product-detail-price").textContent).toBe("55000.50");
  });

  it("handles 404 gracefully", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/api/v1/businesses/${BID}/products/${PID}/`)) return new Response("Not found", { status: 404 });
      return new Response(JSON.stringify(productResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("product-detail-error")).toBeTruthy());
  });

  it("handles 401 gracefully", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("Unauthorized", { status: 401 });
    });
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });
});
