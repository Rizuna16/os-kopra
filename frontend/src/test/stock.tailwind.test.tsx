import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { StockList } from "../pages/StockList";
import { StockCreate } from "../pages/StockCreate";
import { StockDetail } from "../pages/StockDetail";
import { StockEdit } from "../pages/StockEdit";
import { StockDelete } from "../pages/StockDelete";

const BID = "11111111-1111-1111-1111-111111111111";
const LOC = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const VID = "vvvvvvvv-vvvv-vvvv-vvvv-vvvvvvvvvvvv";

function seedContext() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([{ id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" }]),
  );
  localStorage.setItem("kopera_current_business", BID);
  localStorage.setItem("kopera_current_location", LOC);
}

describe("Stock CRUD Tailwind Integration Tests (RED Phase)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  describe("StockList Tailwind Normalization", () => {
    it("has normalised root, container, card, title, list elements", async () => {
      await bootAuth(true);
      const fetchMock = vi.fn(async (url: string) => {
        if (String(url).includes("/auth/me/")) {
          return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        if (String(url).includes(`/api/v1/businesses/${BID}/locations/${LOC}/stocks/`)) {
          return new Response(
            JSON.stringify([
              { id: "s1", location: LOC, variant: "v1", quantity: "100.00", created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
            ]),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response("[]", { status: 200 });
      });
      (globalThis as any).fetch = fetchMock;

      seedContext();
      render(
        <MemoryRouter initialEntries={["/inventory/stocks"]}>
          <AuthProvider>
            <BusinessProvider>
              <Routes>
                <Route path="/inventory/stocks" element={<StockList />} />
              </Routes>
            </BusinessProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      const stockList = await screen.findByTestId("stock-list");
      
      // Page root assertion
      const rootDiv = stockList.closest(".min-h-screen.bg-gray-50");
      expect(rootDiv).not.toBeNull();

      // Container assertion
      const containerDiv = stockList.closest(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
      expect(containerDiv).not.toBeNull();

      // Card assertion
      const cardDiv = stockList.closest(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
      expect(cardDiv).not.toBeNull();

      // Title assertion
      const title = screen.getByRole("heading", { level: 1 });
      expect(title.className).toContain("text-2xl");
      expect(title.className).toContain("font-bold");
      expect(title.className).toContain("tracking-tight");
      expect(title.className).toContain("text-gray-900");
    });

    it("has normalized loading, error, empty states", async () => {
      await bootAuth(true);
      
      // 1. Loading
      const fetchMockLoading = vi.fn(async () => new Promise(() => {}));
      (globalThis as any).fetch = fetchMockLoading;
      seedContext();
      const { unmount } = render(
        <MemoryRouter initialEntries={["/inventory/stocks"]}>
          <AuthProvider>
            <BusinessProvider>
              <Routes>
                <Route path="/inventory/stocks" element={<StockList />} />
              </Routes>
            </BusinessProvider>
          </AuthProvider>
        </MemoryRouter>
      );
      const loading = await screen.findByTestId("stock-list-loading");
      expect(loading.className).toContain("text-sm");
      expect(loading.className).toContain("text-gray-500");
      unmount();

      // 2. Error
      const fetchMockError = vi.fn(async (url: string) => {
        if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
        return new Response("API error", { status: 500 });
      });
      (globalThis as any).fetch = fetchMockError;
      seedContext();
      const renderResult2 = render(
        <MemoryRouter initialEntries={["/inventory/stocks"]}>
          <AuthProvider>
            <BusinessProvider>
              <Routes>
                <Route path="/inventory/stocks" element={<StockList />} />
              </Routes>
            </BusinessProvider>
          </AuthProvider>
        </MemoryRouter>
      );
      const errorDiv = await screen.findByTestId("stock-list-error");
      expect(errorDiv.className).toContain("text-sm");
      expect(errorDiv.className).toContain("text-red-600");
      expect(errorDiv.className).toContain("bg-red-50");
      expect(errorDiv.className).toContain("border-red-100");
      expect(errorDiv.className).toContain("rounded-xl");
      renderResult2.unmount();

      // 3. Empty State
      const fetchMockEmpty = vi.fn(async (url: string) => {
        if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
        return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
      });
      (globalThis as any).fetch = fetchMockEmpty;
      seedContext();
      render(
        <MemoryRouter initialEntries={["/inventory/stocks"]}>
          <AuthProvider>
            <BusinessProvider>
              <Routes>
                <Route path="/inventory/stocks" element={<StockList />} />
              </Routes>
            </BusinessProvider>
          </AuthProvider>
        </MemoryRouter>
      );
      const emptyDiv = await screen.findByTestId("stock-list-empty");
      expect(emptyDiv.className).toContain("text-center");
      expect(emptyDiv.className).toContain("py-12");
      expect(emptyDiv.className).toContain("text-gray-500");
    });
  });

  describe("StockCreate Tailwind Normalization", () => {
    it("has normalized form inputs, labels, layout, buttons, and error messages", async () => {
      await bootAuth(true);
      const fetchMock = vi.fn(async (url: string) => {
        if (String(url).includes("/auth/me/")) {
          return new Response(JSON.stringify(userObj), { status: 200 });
        }
        if (String(url).includes(`/api/v1/businesses/${BID}/variants/`)) {
          return new Response(JSON.stringify([{ id: VID, name: "Variant A" }]), { status: 200 });
        }
        return new Response("[]", { status: 200 });
      });
      (globalThis as any).fetch = fetchMock;

      seedContext();
      render(
        <MemoryRouter initialEntries={["/inventory/stocks/new"]}>
          <AuthProvider>
            <BusinessProvider>
              <Routes>
                <Route path="/inventory/stocks/new" element={<StockCreate />} />
              </Routes>
            </BusinessProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      const form = await screen.findByTestId("stock-create-form");
      
      // Page root & layout validation
      const rootDiv = form.closest(".min-h-screen.bg-gray-50");
      expect(rootDiv).not.toBeNull();
      const containerDiv = form.closest(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
      expect(containerDiv).not.toBeNull();
      const cardDiv = form.closest(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
      expect(cardDiv).not.toBeNull();

      // Title validation
      const title = screen.getByRole("heading", { level: 1 });
      expect(title.className).toContain("text-2xl");
      expect(title.className).toContain("font-bold");

      // Select normalization
      const select = screen.getByTestId("stock-variant-input");
      expect(select.className).toContain("w-full");
      expect(select.className).toContain("px-4");
      expect(select.className).toContain("py-2.5");
      expect(select.className).toContain("rounded-xl");
      expect(select.className).toContain("border-gray-300");

      // Label validation
      const labels = form.querySelectorAll("label");
      expect(labels.length).toBeGreaterThan(0);
      labels.forEach((lbl) => {
        expect(lbl.className).toContain("text-sm");
        expect(lbl.className).toContain("font-medium");
        expect(lbl.className).toContain("text-gray-700");
      });

      // Input normalization
      const input = screen.getByTestId("stock-quantity-input");
      expect(input.className).toContain("w-full");
      expect(input.className).toContain("px-4");
      expect(input.className).toContain("py-2.5");
      expect(input.className).toContain("rounded-xl");
      expect(input.className).toContain("border-gray-300");

      // Button normalization
      const button = screen.getByTestId("stock-create-submit");
      expect(button.className).toContain("bg-blue-600");
      expect(button.className).toContain("hover:bg-blue-700");
      expect(button.className).toContain("rounded-xl");
      expect(button.className).toContain("py-3");
      expect(button.className).toContain("px-4");

      // Error validation
      button.click();
      const errorDiv = await screen.findByTestId("stock-create-error");
      expect(errorDiv.className).toContain("text-sm");
      expect(errorDiv.className).toContain("text-red-600");
      expect(errorDiv.className).toContain("bg-red-50");
      expect(errorDiv.className).toContain("border-red-100");
      expect(errorDiv.className).toContain("rounded-xl");
    });
  });

  describe("StockDetail Tailwind Normalization", () => {
    it("has normalized card structure and loading/error/empty templates", async () => {
      await bootAuth(true);
      const fetchMock = vi.fn(async (url: string) => {
        if (String(url).includes("/auth/me/")) {
          return new Response(JSON.stringify(userObj), { status: 200 });
        }
        if (String(url).includes(`/api/stocks/s1/`)) {
          return new Response(
            JSON.stringify({ id: "s1", location: LOC, variant: "v1", quantity: "100.00", created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response("Not Found", { status: 404 });
      });
      (globalThis as any).fetch = fetchMock;

      seedContext();
      render(
        <MemoryRouter initialEntries={["/inventory/stocks/s1"]}>
          <AuthProvider>
            <BusinessProvider>
              <Routes>
                <Route path="/inventory/stocks/:stockId" element={<StockDetail />} />
              </Routes>
            </BusinessProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      const detail = await screen.findByTestId("stock-detail");

      // Card structure checks
      const rootDiv = detail.closest(".min-h-screen.bg-gray-50");
      expect(rootDiv).not.toBeNull();
      const containerDiv = detail.closest(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
      expect(containerDiv).not.toBeNull();
      const cardDiv = detail.closest(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
      expect(cardDiv).not.toBeNull();

      // Title
      const title = screen.getByRole("heading", { level: 1 });
      expect(title.className).toContain("text-2xl");
      expect(title.className).toContain("font-bold");
    });
  });

  describe("StockEdit Tailwind Normalization", () => {
    it("has normalized input, buttons and layout", async () => {
      await bootAuth(true);
      const fetchMock = vi.fn(async (url: string) => {
        if (String(url).includes("/auth/me/")) {
          return new Response(JSON.stringify(userObj), { status: 200 });
        }
        if (String(url).includes(`/api/stocks/s1/`)) {
          return new Response(
            JSON.stringify({ id: "s1", location: LOC, variant: "v1", quantity: "100.00", created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response("Not Found", { status: 404 });
      });
      (globalThis as any).fetch = fetchMock;

      seedContext();
      render(
        <MemoryRouter initialEntries={["/inventory/stocks/s1/edit"]}>
          <AuthProvider>
            <BusinessProvider>
              <Routes>
                <Route path="/inventory/stocks/:stockId/edit" element={<StockEdit />} />
              </Routes>
            </BusinessProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      const form = await screen.findByTestId("stock-edit-form");
      
      const rootDiv = form.closest(".min-h-screen.bg-gray-50");
      expect(rootDiv).not.toBeNull();
      const containerDiv = form.closest(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
      expect(containerDiv).not.toBeNull();
      const cardDiv = form.closest(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
      expect(cardDiv).not.toBeNull();

      const input = screen.getByTestId("stock-quantity-input");
      expect(input.className).toContain("w-full");
      expect(input.className).toContain("px-4");
      expect(input.className).toContain("py-2.5");
      expect(input.className).toContain("rounded-xl");
      expect(input.className).toContain("border-gray-300");

      const button = screen.getByTestId("stock-edit-submit");
      expect(button.className).toContain("bg-blue-600");
      expect(button.className).toContain("hover:bg-blue-700");
      expect(button.className).toContain("rounded-xl");
      expect(button.className).toContain("py-3");
    });
  });

  describe("StockDelete Tailwind Normalization", () => {
    it("has normalized card structure and delete button styling", async () => {
      await bootAuth(true);
      seedContext();
      render(
        <MemoryRouter initialEntries={["/inventory/stocks/s1/delete"]}>
          <AuthProvider>
            <BusinessProvider>
              <Routes>
                <Route path="/inventory/stocks/:stockId/delete" element={<StockDelete />} />
              </Routes>
            </BusinessProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      const deleteDiv = await screen.findByTestId("stock-delete");
      
      const rootDiv = deleteDiv.closest(".min-h-screen.bg-gray-50");
      expect(rootDiv).not.toBeNull();
      const containerDiv = deleteDiv.closest(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
      expect(containerDiv).not.toBeNull();
      const cardDiv = deleteDiv.closest(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
      expect(cardDiv).not.toBeNull();

      const button = screen.getByTestId("stock-delete-confirm-button");
      expect(button.className).toContain("bg-red-600");
      expect(button.className).toContain("hover:bg-red-700");
      expect(button.className).toContain("rounded-xl");
      expect(button.className).toContain("py-3");
      expect(button.className).toContain("px-4");
    });
  });
});
