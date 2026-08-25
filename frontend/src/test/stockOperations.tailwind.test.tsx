import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { StockTransfer } from "../pages/StockTransfer";
import { StockOpname } from "../pages/StockOpname";
import { StockAdjustment } from "../pages/StockAdjustment";

const BID = "11111111-1111-1111-1111-111111111111";
const LOC_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const LOC_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const VID = "vvvvvvvv-vvvv-vvvv-vvvv-vvvvvvvvvvvv";

function seedContext() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([{ id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" }]),
  );
  localStorage.setItem("kopera_current_business", BID);
  localStorage.setItem("kopera_current_location", LOC_A);
  localStorage.setItem(
    "kopera_locations",
    JSON.stringify([
      { id: LOC_A, name: "Gudang A" },
      { id: LOC_B, name: "Gudang B" },
    ]),
  );
}

function renderTransfer() {
  seedContext();
  return render(
    <MemoryRouter initialEntries={["/inventory/stocks/transfer"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/inventory/stocks/transfer" element={<StockTransfer />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function renderOpname() {
  seedContext();
  return render(
    <MemoryRouter initialEntries={["/inventory/stocks/opname"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/inventory/stocks/opname" element={<StockOpname />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function renderAdjustment() {
  seedContext();
  return render(
    <MemoryRouter initialEntries={["/inventory/stocks/adjustment"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/inventory/stocks/adjustment" element={<StockAdjustment />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("Stock Operations Tailwind Normalization Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  describe("StockTransfer Tailwind Normalization", () => {
    it("has normalized page/container/card/title/layout + form controls", async () => {
      await bootAuth(true);
      const fetchMock = vi.fn(async (url: string) => {
        if (String(url).includes("/auth/me/")) {
          return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return new Response("[]", { status: 200 });
      });
      (globalThis as any).fetch = fetchMock;

      renderTransfer();
      const form = await screen.findByTestId("stock-transfer-form");

      // PAGE
      expect(form.closest(".min-h-screen.bg-gray-50")).not.toBeNull();
      // CONTAINER
      expect(form.closest(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6")).not.toBeNull();
      // CARD
      expect(form.closest(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6")).not.toBeNull();
      // TITLE
      const title = screen.getByRole("heading", { level: 1 });
      expect(title.className).toContain("text-2xl");
      expect(title.className).toContain("font-bold");
      expect(title.className).toContain("tracking-tight");
      expect(title.className).toContain("text-gray-900");

      // LABELs present
      const labels = form.querySelectorAll("label");
      expect(labels.length).toBeGreaterThan(0);
      labels.forEach((lbl) => {
        expect(lbl.className).toContain("text-sm");
        expect(lbl.className).toContain("font-medium");
        expect(lbl.className).toContain("text-gray-700");
      });

      // INPUT/SELECT controls
      const selects = form.querySelectorAll("select");
      selects.forEach((sel) => {
        expect(sel.className).toContain("w-full");
        expect(sel.className).toContain("px-4");
        expect(sel.className).toContain("py-2.5");
        expect(sel.className).toContain("rounded-xl");
        expect(sel.className).toContain("border-gray-300");
      });
      const input = form.querySelector("input[type=\"text\"]");
      expect(input?.className).toContain("w-full");
      expect(input?.className).toContain("px-4");
      expect(input?.className).toContain("py-2.5");
      expect(input?.className).toContain("rounded-xl");
      expect(input?.className).toContain("border-gray-300");

      // BUTTON
      const button = screen.getByTestId("stock-transfer-submit");
      expect(button.className).toContain("bg-blue-600");
      expect(button.className).toContain("hover:bg-blue-700");
      expect(button.className).toContain("rounded-xl");
      expect(button.className).toContain("py-3");
      expect(button.className).toContain("px-4");
    });

    it("has normalized error and result presentation", async () => {
      await bootAuth(true);
      const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        if (String(url).includes("/auth/me/")) {
          return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        if (String(url).includes("/api/v1/stocks/transfer/")) {
          return new Response(
            JSON.stringify({
              source: { id: "s1", location: LOC_A, variant: VID, quantity: "60.00", created_at: "", updated_at: "" },
              destination: { id: "s2", location: LOC_B, variant: VID, quantity: "40.00", created_at: "", updated_at: "" },
              transferred_quantity: "40.00",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response("[]", { status: 200 });
      });
      (globalThis as any).fetch = fetchMock;

      renderTransfer();
      const form = await screen.findByTestId("stock-transfer-form");
      const button = screen.getByTestId("stock-transfer-submit");
      button.click();
      const result = await screen.findByTestId("stock-transfer-result");

      // result card styling
      expect(result.className).toContain("bg-white");
      expect(result.className).toContain("rounded-2xl");
      expect(result.className).toContain("border");
    });
  });

  describe("StockOpname Tailwind Normalization", () => {
    it("has normalized page/container/card/title/layout + form controls", async () => {
      await bootAuth(true);
      const fetchMock = vi.fn(async (url: string) => {
        if (String(url).includes("/auth/me/")) {
          return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return new Response("[]", { status: 200 });
      });
      (globalThis as any).fetch = fetchMock;

      renderOpname();
      const form = await screen.findByTestId("stock-opname-form");

      expect(form.closest(".min-h-screen.bg-gray-50")).not.toBeNull();
      expect(form.closest(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6")).not.toBeNull();
      expect(form.closest(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6")).not.toBeNull();

      const title = screen.getByRole("heading", { level: 1 });
      expect(title.className).toContain("text-2xl");
      expect(title.className).toContain("font-bold");
      expect(title.className).toContain("tracking-tight");
      expect(title.className).toContain("text-gray-900");

      const labels = form.querySelectorAll("label");
      expect(labels.length).toBeGreaterThan(0);
      labels.forEach((lbl) => {
        expect(lbl.className).toContain("text-sm");
        expect(lbl.className).toContain("font-medium");
        expect(lbl.className).toContain("text-gray-700");
      });

      const selects = form.querySelectorAll("select");
      selects.forEach((sel) => {
        expect(sel.className).toContain("w-full");
        expect(sel.className).toContain("px-4");
        expect(sel.className).toContain("py-2.5");
        expect(sel.className).toContain("rounded-xl");
        expect(sel.className).toContain("border-gray-300");
      });
      const input = form.querySelector("input[type=\"text\"]");
      expect(input?.className).toContain("w-full");
      expect(input?.className).toContain("px-4");
      expect(input?.className).toContain("py-2.5");
      expect(input?.className).toContain("rounded-xl");
      expect(input?.className).toContain("border-gray-300");

      const button = screen.getByTestId("stock-opname-submit");
      expect(button.className).toContain("bg-blue-600");
      expect(button.className).toContain("hover:bg-blue-700");
      expect(button.className).toContain("rounded-xl");
      expect(button.className).toContain("py-3");
      expect(button.className).toContain("px-4");
    });

    it("has normalized error and result/detail presentation", async () => {
      await bootAuth(true);
      const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        if (String(url).includes("/auth/me/")) {
          return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        if (String(url).includes("/api/v1/stocks/opname/")) {
          return new Response(
            JSON.stringify({ id: "s1", location: LOC_A, variant: VID, quantity: "7.00", created_at: "", updated_at: "" }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response("[]", { status: 200 });
      });
      (globalThis as any).fetch = fetchMock;

      renderOpname();
      const button = await screen.findByTestId("stock-opname-submit");
      button.click();
      const result = await screen.findByTestId("stock-opname-result");

      expect(result.className).toContain("bg-white");
      expect(result.className).toContain("rounded-2xl");
      expect(result.className).toContain("border");
    });
  });

  describe("StockAdjustment Tailwind Normalization", () => {
    it("has normalized page/container/card/title/layout + form controls", async () => {
      await bootAuth(true);
      const fetchMock = vi.fn(async (url: string) => {
        if (String(url).includes("/auth/me/")) {
          return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return new Response("[]", { status: 200 });
      });
      (globalThis as any).fetch = fetchMock;

      renderAdjustment();
      const form = await screen.findByTestId("stock-adjustment-form");

      expect(form.closest(".min-h-screen.bg-gray-50")).not.toBeNull();
      expect(form.closest(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6")).not.toBeNull();
      expect(form.closest(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6")).not.toBeNull();

      const title = screen.getByRole("heading", { level: 1 });
      expect(title.className).toContain("text-2xl");
      expect(title.className).toContain("font-bold");
      expect(title.className).toContain("tracking-tight");
      expect(title.className).toContain("text-gray-900");

      const labels = form.querySelectorAll("label");
      expect(labels.length).toBeGreaterThan(0);
      labels.forEach((lbl) => {
        expect(lbl.className).toContain("text-sm");
        expect(lbl.className).toContain("font-medium");
        expect(lbl.className).toContain("text-gray-700");
      });

      const selects = form.querySelectorAll("select");
      selects.forEach((sel) => {
        expect(sel.className).toContain("w-full");
        expect(sel.className).toContain("px-4");
        expect(sel.className).toContain("py-2.5");
        expect(sel.className).toContain("rounded-xl");
        expect(sel.className).toContain("border-gray-300");
      });
      const input = form.querySelector("input[type=\"text\"]");
      expect(input?.className).toContain("w-full");
      expect(input?.className).toContain("px-4");
      expect(input?.className).toContain("py-2.5");
      expect(input?.className).toContain("rounded-xl");
      expect(input?.className).toContain("border-gray-300");

      const button = screen.getByTestId("stock-adjustment-submit");
      expect(button.className).toContain("bg-blue-600");
      expect(button.className).toContain("hover:bg-blue-700");
      expect(button.className).toContain("rounded-xl");
      expect(button.className).toContain("py-3");
      expect(button.className).toContain("px-4");
    });

    it("has normalized error and result presentation", async () => {
      await bootAuth(true);
      const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        if (String(url).includes("/auth/me/")) {
          return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        if (String(url).includes("/api/v1/stocks/adjustment/")) {
          return new Response(
            JSON.stringify({ id: "s1", location: LOC_A, variant: VID, quantity: "15.00", created_at: "", updated_at: "" }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response("[]", { status: 200 });
      });
      (globalThis as any).fetch = fetchMock;

      renderAdjustment();
      const button = await screen.findByTestId("stock-adjustment-submit");
      button.click();
      const result = await screen.findByTestId("stock-adjustment-result");

      expect(result.className).toContain("bg-white");
      expect(result.className).toContain("rounded-2xl");
      expect(result.className).toContain("border");
    });
  });
});