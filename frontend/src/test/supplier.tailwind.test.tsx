import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { SupplierList } from "../pages/SupplierList";
import { SupplierCreate } from "../pages/SupplierCreate";
import { SupplierDetail } from "../pages/SupplierDetail";
import { SupplierEdit } from "../pages/SupplierEdit";
import { SupplierDelete } from "../pages/SupplierDelete";

const BID = "11111111-1111-1111-1111-111111111111";
const SID = "44444444-4444-4444-4444-444444444444";

const mockSupplier = {
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

function setupFetchMock() {
  return vi.fn(async (url: string) => {
    const u = String(url);
    if (u.includes("/auth/me/")) {
      return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (u.includes(`/api/v1/businesses/${BID}/suppliers/`)) {
      if (u.match(/\/suppliers\/[^/]+\/?$/)) {
        return new Response(JSON.stringify(mockSupplier), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify([mockSupplier]), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response("[]", { status: 200 });
  });
}

describe("Supplier — UI Normalization V1 RED contract", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("SupplierList has baseline root, container, card, title, list items", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={["/suppliers"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/suppliers" element={<SupplierList />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("supplier-list")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="supplier-list"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
  });

  it("SupplierCreate has baseline root, container, card, title, inputs, button", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={["/suppliers/new"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/suppliers/new" element={<SupplierCreate />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("supplier-create-form")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="supplier-create-form"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
    const nameInput = screen.getByTestId("supplier-name-input");
    expect(nameInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");
    const phoneInput = screen.getByTestId("supplier-phone-input");
    expect(phoneInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");
    const emailInput = screen.getByTestId("supplier-email-input");
    expect(emailInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");
    const addressInput = screen.getByTestId("supplier-address-input");
    expect(addressInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");
    const submitBtn = screen.getByTestId("supplier-create-submit");
    expect(submitBtn).toHaveClass("py-3", "px-4", "bg-blue-600", "hover:bg-blue-700", "font-medium", "text-sm", "text-white", "rounded-xl", "shadow-sm", "transition-colors", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:ring-offset-2", "disabled:opacity-50", "disabled:cursor-not-allowed");
  });

  it("SupplierDetail has baseline root, container, card, title, detail fields", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={[`/suppliers/${SID}`]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/suppliers/:supplierId" element={<SupplierDetail />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("supplier-detail")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="supplier-detail"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
  });

  it("SupplierEdit has baseline root, container, card, title, inputs, button", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={[`/suppliers/${SID}/edit`]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/suppliers/:supplierId/edit" element={<SupplierEdit />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("supplier-edit-form")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="supplier-edit-form"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
    const nameInput = screen.getByTestId("supplier-name-input");
    expect(nameInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");
    const phoneInput = screen.getByTestId("supplier-phone-input");
    expect(phoneInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");
    const emailInput = screen.getByTestId("supplier-email-input");
    expect(emailInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");
    const addressInput = screen.getByTestId("supplier-address-input");
    expect(addressInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");
    const submitBtn = screen.getByTestId("supplier-edit-submit");
    expect(submitBtn).toHaveClass("py-3", "px-4", "bg-blue-600", "hover:bg-blue-700", "font-medium", "text-sm", "text-white", "rounded-xl", "shadow-sm", "transition-colors", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:ring-offset-2", "disabled:opacity-50", "disabled:cursor-not-allowed");
  });

  it("SupplierDelete has baseline root, container, card, delete button", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={[`/suppliers/${SID}`]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/suppliers/:supplierId" element={<SupplierDelete />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("supplier-delete")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="supplier-delete"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const deleteBtn = screen.getByTestId("supplier-delete-submit");
    expect(deleteBtn).toHaveClass("bg-red-600", "hover:bg-red-700", "font-medium", "text-sm", "text-white", "rounded-xl", "shadow-sm", "transition-colors", "focus:outline-none", "focus:ring-2", "focus:ring-red-600", "focus:ring-offset-2", "disabled:opacity-50", "disabled:cursor-not-allowed");
  });
});