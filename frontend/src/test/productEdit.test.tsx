import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { ProductEdit } from "../pages/ProductEdit";

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

function renderEdit() {
  seedCurrentBusiness();
  return render(
    <MemoryRouter initialEntries={[`/products/${PID}/edit`]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/products/:productId/edit" element={<ProductEdit />} />
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

describe("ProductEdit", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("loads the existing product and populates name and price", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response(JSON.stringify(productResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("product-edit-form")).toBeTruthy());
    expect((screen.getByTestId("product-name-input") as HTMLInputElement).value).toBe("Beras 5kg");
    expect((screen.getByTestId("product-price-input") as HTMLInputElement).value).toBeTruthy();
  });

  it("submits PATCH with only writable fields", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/products/${PID}/`)) {
        if (init?.method === "PATCH") {
          expect(init?.method).toBe("PATCH");
          const body = JSON.parse(String(init?.body));
          expect(Object.keys(body).sort()).toEqual(["name", "price"]);
          expect(body).not.toHaveProperty("business");
          expect(body).not.toHaveProperty("id");
          expect(body).not.toHaveProperty("created_at");
          expect(body).not.toHaveProperty("updated_at");
          return new Response(JSON.stringify(productResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify(productResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify(productResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("product-edit-submit")).toBeTruthy());
    screen.getByTestId("product-edit-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("does NOT use PUT", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/products/${PID}/`)) {
        if (init?.method === "PATCH") {
          expect(init?.method).toBe("PATCH");
          return new Response(JSON.stringify(productResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify(productResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify(productResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("product-edit-submit")).toBeTruthy());
    screen.getByTestId("product-edit-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("handles backend 400 validation errors", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/products/${PID}/`)) {
        if (init?.method === "PATCH") {
          return new Response(JSON.stringify({ price: ["Price must not be negative."] }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify(productResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify(productResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("product-edit-submit")).toBeTruthy());
    screen.getByTestId("product-edit-submit").click();
    await waitFor(() => expect(screen.getByTestId("product-edit-error")).toBeTruthy());
  });

  it("handles 404 gracefully", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/api/v1/businesses/${BID}/products/${PID}/`)) return new Response("Not found", { status: 404 });
      return new Response(JSON.stringify(productResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("product-edit-error")).toBeTruthy());
  });

  it("handles 401 gracefully", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("Unauthorized", { status: 401 });
    });
    seedCurrentBusiness();
    render(
      <MemoryRouter initialEntries={[`/products/${PID}/edit`]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/products/:productId/edit" element={<ProductEdit />} />
              <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });

  it("handles a successful update", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/products/${PID}/`)) {
        return new Response(JSON.stringify(productResponse({ name: "Beras 10kg" })), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify(productResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("product-edit-submit")).toBeTruthy());
    screen.getByTestId("product-edit-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });
});
