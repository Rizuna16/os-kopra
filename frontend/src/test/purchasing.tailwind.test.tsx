import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { PurchaseOrderList } from "../pages/PurchaseOrderList";
import { PurchaseOrderCreate } from "../pages/PurchaseOrderCreate";
import { PurchaseOrderDetail } from "../pages/PurchaseOrderDetail";
import { PurchaseOrderEdit } from "../pages/PurchaseOrderEdit";
import { PurchaseOrderDelete } from "../pages/PurchaseOrderDelete";

const BID = "11111111-1111-1111-1111-111111111111";

const mockPO = {
  id: "po1",
  business: BID,
  supplier: "s1",
  location: "l1",
  status: "DRAFT" as const,
  lines: [
    { id: "pol1", variant: "v1", quantity: 5, unit_price: 15000, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }
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

function setupFetchMock(overrides: Record<string, { status: number; body: unknown }> = {}) {
  return vi.fn(async (url: string) => {
    const u = String(url);
    if (u.includes("/auth/me/")) {
      return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (u.includes(`/api/v1/businesses/${BID}/purchase-orders/`)) {
      const o = overrides[`/api/v1/businesses/${BID}/purchase-orders/`];
      if (o) return new Response(JSON.stringify(o.body), { status: o.status, headers: { "Content-Type": "application/json" } });
      if (u.match(/\/purchase-orders\/[^/]+\/?$/)) {
        return new Response(JSON.stringify(mockPO), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify([mockPO]), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (u.includes(`/api/v1/businesses/${BID}/suppliers/`)) {
      return new Response(JSON.stringify([{ id: "s1", name: "Supplier A" }]), { status: 200, headers: { "Content-Type": "application/json" } });
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

describe("Purchasing — UI Normalization V1 RED contract", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("PurchaseOrderList has baseline root, container, card, title", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={["/purchasing"]}>
        <AuthProvider>
          <BusinessProvider>
            <PurchaseOrderList />
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("purchase-order-list")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="purchase-order-list"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
  });

  it("PurchaseOrderCreate has baseline root, container, card, title, inputs, button", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={["/purchasing/new"]}>
        <AuthProvider>
          <BusinessProvider>
            <PurchaseOrderCreate />
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("purchase-order-create-form")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="purchase-order-create-form"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();

    const supplierSelect = screen.getByTestId("purchase-order-supplier-select");
    expect(supplierSelect).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");

    const locationSelect = screen.getByTestId("purchase-order-location-select");
    expect(locationSelect).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");

    const statusSelect = screen.getByTestId("purchase-order-status-select");
    expect(statusSelect).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");

    const lineVariantSelect = screen.getByTestId("purchase-order-line-variant-select");
    expect(lineVariantSelect).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");

    const lineQtyInput = screen.getByTestId("purchase-order-line-quantity-input");
    expect(lineQtyInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");

    const linePriceInput = screen.getByTestId("purchase-order-line-unit-price-input");
    expect(linePriceInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");

    const submitBtn = screen.getByTestId("purchase-order-create-submit");
    expect(submitBtn).toHaveClass("py-3", "px-4", "bg-blue-600", "hover:bg-blue-700", "font-medium", "text-sm", "text-white", "rounded-xl", "shadow-sm", "transition-colors", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:ring-offset-2", "disabled:opacity-50", "disabled:cursor-not-allowed");
  });

  it("PurchaseOrderCreate shows normalized error", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock({
      [`/api/v1/businesses/${BID}/purchase-orders/`]: {
        status: 400,
        body: { detail: "Some error" }
      }
    });
    seedContext();
    render(
      <MemoryRouter initialEntries={["/purchasing/new"]}>
        <AuthProvider>
          <BusinessProvider>
            <PurchaseOrderCreate />
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("purchase-order-create-form")).toBeTruthy());

    // Trigger submit to trigger error display
    const submitBtn = screen.getByTestId("purchase-order-create-submit");
    submitBtn.click();

    await waitFor(() => expect(screen.getByTestId("purchase-order-create-error")).toBeTruthy());
    const err = screen.getByTestId("purchase-order-create-error");
    expect(err).toHaveClass("text-sm", "text-red-600", "bg-red-50", "border", "border-red-100", "rounded-xl", "p-3", "sm:p-4");
  });

  it("PurchaseOrderDetail has baseline root, container, card, title", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={[`/purchasing/${mockPO.id}`]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/purchasing/:poId" element={<PurchaseOrderDetail />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("purchase-order-detail")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="purchase-order-detail"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
  });

  it("PurchaseOrderEdit has baseline root, container, card, title, inputs, button", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={[`/purchasing/${mockPO.id}/edit`]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/purchasing/:poId/edit" element={<PurchaseOrderEdit />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("purchase-order-edit-form")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="purchase-order-edit-form"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();

    const supplierSelect = screen.getByTestId("purchase-order-edit-supplier-select");
    expect(supplierSelect).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");

    const locationSelect = screen.getByTestId("purchase-order-edit-location-select");
    expect(locationSelect).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");

    const statusSelect = screen.getByTestId("purchase-order-edit-status-select");
    expect(statusSelect).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");

    const lineVariantSelect = screen.getByTestId("purchase-order-edit-line-variant-select");
    expect(lineVariantSelect).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");

    const lineQtyInput = screen.getByTestId("purchase-order-edit-line-quantity-input");
    expect(lineQtyInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");

    const linePriceInput = screen.getByTestId("purchase-order-edit-line-unit-price-input");
    expect(linePriceInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");

    const submitBtn = screen.getByTestId("purchase-order-edit-submit");
    expect(submitBtn).toHaveClass("py-3", "px-4", "bg-blue-600", "hover:bg-blue-700", "font-medium", "text-sm", "text-white", "rounded-xl", "shadow-sm", "transition-colors", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:ring-offset-2", "disabled:opacity-50", "disabled:cursor-not-allowed");
  });

  it("PurchaseOrderEdit shows normalized error", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock({
      [`/api/v1/businesses/${BID}/purchase-orders/`]: {
        status: 400,
        body: { detail: "Update failed" }
      }
    });
    seedContext();
    render(
      <MemoryRouter initialEntries={[`/purchasing/${mockPO.id}/edit`]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/purchasing/:poId/edit" element={<PurchaseOrderEdit />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("purchase-order-edit-form")).toBeTruthy());

    const submitBtn = screen.getByTestId("purchase-order-edit-submit");
    submitBtn.click();

    await waitFor(() => expect(screen.getByTestId("purchase-order-edit-error")).toBeTruthy());
    const err = screen.getByTestId("purchase-order-edit-error");
    expect(err).toHaveClass("text-sm", "text-red-600", "bg-red-50", "border", "border-red-100", "rounded-xl", "p-3", "sm:p-4");
  });

  it("PurchaseOrderDelete has baseline root, container, card, delete button", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={[`/purchasing/${mockPO.id}`]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/purchasing/:poId" element={<PurchaseOrderDelete />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("purchase-order-delete")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="purchase-order-delete"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();

    const deleteBtn = screen.getByTestId("purchase-order-delete-confirm-button");
    expect(deleteBtn).toHaveClass("bg-red-600", "hover:bg-red-700", "font-medium", "text-sm", "text-white", "rounded-xl", "shadow-sm", "transition-colors", "focus:outline-none", "focus:ring-2", "focus:ring-red-600", "focus:ring-offset-2", "disabled:opacity-50", "disabled:cursor-not-allowed");
  });
});
