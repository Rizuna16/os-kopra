import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { ProductList } from "../pages/ProductList";
import { ProductCreate } from "../pages/ProductCreate";
import { ProductDetail } from "../pages/ProductDetail";
import { ProductEdit } from "../pages/ProductEdit";
import { ProductDelete } from "../pages/ProductDelete";

const BID = "11111111-1111-1111-1111-111111111111";

const mockProduct = {
  id: "p1",
  name: "Test Product",
  price: 55000,
  business: BID,
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

function setupFetchMock(overrides: Record<string, { status: number; body: unknown }> = {}) {
  return vi.fn(async (url: string) => {
    const u = String(url);
    if (u.includes("/auth/me/")) {
      return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (u.includes(`/api/v1/businesses/${BID}/products/`)) {
      const o = overrides[`/api/v1/businesses/${BID}/products/`];
      if (o) return new Response(JSON.stringify(o.body), { status: o.status, headers: { "Content-Type": "application/json" } });
      if (u.match(/\/products\/[^/]+\/?$/)) {
        return new Response(JSON.stringify(mockProduct), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify([mockProduct]), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response("[]", { status: 200 });
  });
}

describe("Product — UI Normalization V1 RED contract", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("ProductList has baseline root, container, card, title, list items", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={["/products"]}>
        <AuthProvider>
          <BusinessProvider>
            <ProductList />
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("product-list")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="product-list"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
  });

  it("ProductCreate has baseline root, container, card, title, inputs, button", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={["/products/new"]}>
        <AuthProvider>
          <BusinessProvider>
            <ProductCreate />
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("product-create-form")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="product-create-form"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
    const nameInput = screen.getByTestId("product-name-input");
    expect(nameInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");
    const priceInput = screen.getByTestId("product-price-input");
    expect(priceInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");
    const submitBtn = screen.getByTestId("product-create-submit");
    expect(submitBtn).toHaveClass("py-3", "px-4", "bg-blue-600", "hover:bg-blue-700", "font-medium", "text-sm", "text-white", "rounded-xl", "shadow-sm", "transition-colors", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:ring-offset-2", "disabled:opacity-50", "disabled:cursor-not-allowed");
  });

  it("ProductDetail has baseline root, container, card, title, detail fields", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={[`/products/${mockProduct.id}`]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/products/:productId" element={<ProductDetail />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("product-detail")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="product-detail"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
  });

  it("ProductEdit has baseline root, container, card, title, inputs, button", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={[`/products/${mockProduct.id}/edit`]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/products/:productId/edit" element={<ProductEdit />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("product-edit-form")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="product-edit-form"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
    const nameInput = screen.getByTestId("product-name-input");
    expect(nameInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");
    const priceInput = screen.getByTestId("product-price-input");
    expect(priceInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");
    const submitBtn = screen.getByTestId("product-edit-submit");
    expect(submitBtn).toHaveClass("py-3", "px-4", "bg-blue-600", "hover:bg-blue-700", "font-medium", "text-sm", "text-white", "rounded-xl", "shadow-sm", "transition-colors", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:ring-offset-2", "disabled:opacity-50", "disabled:cursor-not-allowed");
  });

  it("ProductDelete has baseline root, container, card, delete button", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={[`/products/${mockProduct.id}`]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/products/:productId" element={<ProductDelete />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("product-delete")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="product-delete"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const deleteBtn = screen.getByTestId("product-delete-confirm-button");
    expect(deleteBtn).toHaveClass("bg-red-600", "hover:bg-red-700", "font-medium", "text-sm", "text-white", "rounded-xl", "shadow-sm", "transition-colors", "focus:outline-none", "focus:ring-2", "focus:ring-red-600", "focus:ring-offset-2", "disabled:opacity-50", "disabled:cursor-not-allowed");
  });
});