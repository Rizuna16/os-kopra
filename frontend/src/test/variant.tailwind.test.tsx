import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { VariantList } from "../pages/VariantList";
import { VariantCreate } from "../pages/VariantCreate";
import { VariantDetail } from "../pages/VariantDetail";
import { VariantEdit } from "../pages/VariantEdit";
import { VariantDelete } from "../pages/VariantDelete";

const BID = "11111111-1111-1111-1111-111111111111";
const PID = "pppppppp-pppp-pppp-pppp-pppppppppppp";
const VID = "vvvvvvvv-vvvv-vvvv-vvvv-vvvvvvvvvvvv";

const mockVariant = {
  id: VID,
  name: "Test Variant",
  product: PID,
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
    if (u.includes(`/api/v1/businesses/${BID}/products/${PID}/variants/`)) {
      if (u.match(/\/variants\/[^/]+\/?$/)) {
        return new Response(JSON.stringify(mockVariant), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify([mockVariant]), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response("[]", { status: 200 });
  });
}

describe("Variant — UI Normalization V1 RED contract", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("VariantList has baseline root, container, card, title, list items", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={[`/products/${PID}/variants`]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/products/:productId/variants" element={<VariantList />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("variant-list")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="variant-list"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
  });

  it("VariantCreate has baseline root, container, card, title, input, button", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={[`/products/${PID}/variants/new`]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/products/:productId/variants/new" element={<VariantCreate />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("variant-create-form")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="variant-create-form"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
    const nameInput = screen.getByTestId("variant-name-input");
    expect(nameInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");
    const submitBtn = screen.getByTestId("variant-create-submit");
    expect(submitBtn).toHaveClass("py-3", "px-4", "bg-blue-600", "hover:bg-blue-700", "font-medium", "text-sm", "text-white", "rounded-xl", "shadow-sm", "transition-colors", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:ring-offset-2", "disabled:opacity-50", "disabled:cursor-not-allowed");
  });

  it("VariantDetail has baseline root, container, card, title, detail fields", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={[`/products/${PID}/variants/${VID}`]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/products/:productId/variants/:variantId" element={<VariantDetail />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("variant-detail")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="variant-detail"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
  });

  it("VariantEdit has baseline root, container, card, title, input, button", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={[`/products/${PID}/variants/${VID}/edit`]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/products/:productId/variants/:variantId/edit" element={<VariantEdit />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("variant-edit-form")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="variant-edit-form"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
    const nameInput = screen.getByTestId("variant-name-input");
    expect(nameInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");
    const submitBtn = screen.getByTestId("variant-edit-submit");
    expect(submitBtn).toHaveClass("py-3", "px-4", "bg-blue-600", "hover:bg-blue-700", "font-medium", "text-sm", "text-white", "rounded-xl", "shadow-sm", "transition-colors", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:ring-offset-2", "disabled:opacity-50", "disabled:cursor-not-allowed");
  });

  it("VariantDelete has baseline root, container, card, delete button", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={[`/products/${PID}/variants/${VID}`]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/products/:productId/variants/:variantId" element={<VariantDelete />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("variant-delete")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="variant-delete"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const deleteBtn = screen.getByTestId("variant-delete-submit");
    expect(deleteBtn).toHaveClass("bg-red-600", "hover:bg-red-700", "font-medium", "text-sm", "text-white", "rounded-xl", "shadow-sm", "transition-colors", "focus:outline-none", "focus:ring-2", "focus:ring-red-600", "focus:ring-offset-2", "disabled:opacity-50", "disabled:cursor-not-allowed");
  });
});