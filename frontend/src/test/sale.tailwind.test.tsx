import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { SaleList } from "../pages/SaleList";
import { SaleCreate } from "../pages/SaleCreate";
import { SaleDetail } from "../pages/SaleDetail";
import { SaleEdit } from "../pages/SaleEdit";
import { SaleDelete } from "../pages/SaleDelete";

const BID = "11111111-1111-1111-1111-111111111111";

const mockSale = {
  id: "s1",
  business: BID,
  location: "l1",
  status: "DRAFT" as const,
  lines: [
    { id: "sl1", variant: "v1", quantity: 2, unit_price: 25000, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }
  ],
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

function setupFetchMock() {
  return vi.fn(async (url: string) => {
    const u = String(url);
    if (u.includes("/auth/me/")) {
      return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (u.includes(`/api/v1/businesses/${BID}/sales/`)) {
      if (u.match(/\/sales\/[^/]+\/?$/)) {
        return new Response(JSON.stringify(mockSale), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify([mockSale]), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (u.includes(`/api/v1/businesses/${BID}/locations/`)) {
      return new Response(JSON.stringify([{ id: "l1", name: "Location A" }]), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (u.includes(`/api/v1/businesses/${BID}/products/`)) {
      return new Response(JSON.stringify([{ id: "p1", name: "Product A" }]), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (u.includes(`/api/v1/businesses/${BID}/products/p1/variants/`)) {
      return new Response(JSON.stringify([{ id: "v1", name: "Variant A" }]), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response("[]", { status: 200 });
  });
}

describe("Sales — UI Normalization V1 RED contract", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("SaleList has baseline root, container, card, title", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={["/sales"]}>
        <AuthProvider>
          <BusinessProvider>
            <SaleList />
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("sale-list")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="sale-list"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
  });

  it("SaleCreate has baseline root, container, card, title, inputs, button", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={["/sales/new"]}>
        <AuthProvider>
          <BusinessProvider>
            <SaleCreate />
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("sale-create-form")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="sale-create-form"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();

    const locationSelect = screen.getByTestId("sale-location-select");
    expect(locationSelect).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");

    const statusSelect = screen.getByTestId("sale-status-select");
    expect(statusSelect).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");

    const lineVariantSelect = screen.getByTestId("sale-line-variant-select");
    expect(lineVariantSelect).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");

    const lineQtyInput = screen.getByTestId("sale-line-quantity-input");
    expect(lineQtyInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");

    const linePriceInput = screen.getByTestId("sale-line-unit-price-input");
    expect(linePriceInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");

    const submitBtn = screen.getByTestId("sale-create-submit");
    expect(submitBtn).toHaveClass("py-3", "px-4", "bg-blue-600", "hover:bg-blue-700", "font-medium", "text-sm", "text-white", "rounded-xl", "shadow-sm", "transition-colors", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:ring-offset-2", "disabled:opacity-50", "disabled:cursor-not-allowed");
  });

  it("SaleCreate shows normalized error", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url);
      if (u.includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (u.includes(`/api/v1/businesses/${BID}/sales/`) && (!init?.method || init.method === "POST")) {
        return new Response(JSON.stringify({ detail: "Some error" }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      if (u.includes(`/api/v1/businesses/${BID}/locations/`)) {
        return new Response(JSON.stringify([{ id: "l1", name: "Location A" }]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (u.includes(`/api/v1/businesses/${BID}/products/`)) {
        return new Response(JSON.stringify([{ id: "p1", name: "Product A" }]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (u.includes(`/api/v1/businesses/${BID}/products/p1/variants/`)) {
        return new Response(JSON.stringify([{ id: "v1", name: "Variant A" }]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    seedContext();
    render(
      <MemoryRouter initialEntries={["/sales/new"]}>
        <AuthProvider>
          <BusinessProvider>
            <SaleCreate />
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("sale-create-form")).toBeTruthy());

    const submitBtn = screen.getByTestId("sale-create-submit");
    submitBtn.click();

    await waitFor(() => expect(screen.getByTestId("sale-create-error")).toBeTruthy());
    const err = screen.getByTestId("sale-create-error");
    expect(err).toHaveClass("text-sm", "text-red-600", "bg-red-50", "border", "border-red-100", "rounded-xl", "p-3", "sm:p-4");
  });

  it("SaleDetail has baseline root, container, card, title", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={[`/sales/${mockSale.id}`]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/sales/:saleId" element={<SaleDetail />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("sale-detail")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="sale-detail"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
  });

  it("SaleEdit has baseline root, container, card, title, inputs, button", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={[`/sales/${mockSale.id}/edit`]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/sales/:saleId/edit" element={<SaleEdit />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("sale-edit-form")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="sale-edit-form"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();

    const locationSelect = screen.getByTestId("sale-edit-location-select");
    expect(locationSelect).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");

    const statusSelect = screen.getByTestId("sale-edit-status-select");
    expect(statusSelect).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");

    const lineVariantSelect = screen.getByTestId("sale-edit-line-variant-select");
    expect(lineVariantSelect).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");

    const lineQtyInput = screen.getByTestId("sale-edit-line-quantity-input");
    expect(lineQtyInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");

    const linePriceInput = screen.getByTestId("sale-edit-line-unit-price-input");
    expect(linePriceInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");

    const submitBtn = screen.getByTestId("sale-edit-submit");
    expect(submitBtn).toHaveClass("py-3", "px-4", "bg-blue-600", "hover:bg-blue-700", "font-medium", "text-sm", "text-white", "rounded-xl", "shadow-sm", "transition-colors", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:ring-offset-2", "disabled:opacity-50", "disabled:cursor-not-allowed");
  });

  it("SaleEdit shows normalized error", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url);
      if (u.includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (u.includes(`/api/v1/businesses/${BID}/sales/`)) {
        if (init?.method === "PATCH") {
          return new Response(JSON.stringify({ detail: "Update failed" }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify(mockSale), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    seedContext();
    render(
      <MemoryRouter initialEntries={[`/sales/${mockSale.id}/edit`]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/sales/:saleId/edit" element={<SaleEdit />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("sale-edit-form")).toBeTruthy());

    const submitBtn = screen.getByTestId("sale-edit-submit");
    submitBtn.click();

    await waitFor(() => expect(screen.getByTestId("sale-edit-error")).toBeTruthy());
    const err = screen.getByTestId("sale-edit-error");
    expect(err).toHaveClass("text-sm", "text-red-600", "bg-red-50", "border", "border-red-100", "rounded-xl", "p-3", "sm:p-4");
  });

  it("SaleDelete has baseline root, container, card, delete button", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={[`/sales/${mockSale.id}`]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/sales/:saleId" element={<SaleDelete />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("sale-delete")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="sale-delete"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();

    const deleteBtn = screen.getByTestId("sale-delete-confirm-button");
    expect(deleteBtn).toHaveClass("bg-red-600", "hover:bg-red-700", "font-medium", "text-sm", "text-white", "rounded-xl", "shadow-sm", "transition-colors", "focus:outline-none", "focus:ring-2", "focus:ring-red-600", "focus:ring-offset-2", "disabled:opacity-50", "disabled:cursor-not-allowed");
  });
});
