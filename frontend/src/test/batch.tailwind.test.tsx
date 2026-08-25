import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { BatchList } from "../pages/BatchList";

const BID = "11111111-1111-1111-1111-111111111111";
const LOC = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const VID = "vvvvvvvv-vvvv-vvvv-vvvv-vvvvvvvvvvvv";
const BATCH_ID = "bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb";

function seedContext() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([{ id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" }]),
  );
  localStorage.setItem("kopera_current_business", BID);
  localStorage.setItem("kopera_current_location", LOC);
}

function batchResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: BATCH_ID,
    code: "BATCH-001",
    location: LOC,
    variant: VID,
    quantity: "10.00",
    expired_date: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("Batch Tailwind Normalization Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("has normalized page, container, card, title, labels, inputs, selects, and submit button", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes("/api/v1/inventory/batches/")) {
        return new Response(JSON.stringify([batchResponse()]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    seedContext();
    render(
      <MemoryRouter initialEntries={["/inventory/batches"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/inventory/batches" element={<BatchList />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    const batchListEl = await screen.findByTestId("batch-list");

    // PAGE
    expect(batchListEl.className).toContain("min-h-screen");
    expect(batchListEl.className).toContain("bg-gray-50");

    // CONTAINER
    const containerDiv = batchListEl.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(containerDiv).not.toBeNull();

    // CARD
    const cardDiv = formCard(batchListEl);
    expect(cardDiv).not.toBeNull();

    // TITLE
    const title = screen.getByRole("heading", { level: 1 });
    expect(title.className).toContain("text-2xl");
    expect(title.className).toContain("font-bold");
    expect(title.className).toContain("tracking-tight");
    expect(title.className).toContain("text-gray-900");

    // LABELS
    const form = screen.getByTestId("batch-create-form");
    const labels = form.querySelectorAll("label");
    expect(labels.length).toBeGreaterThan(0);
    labels.forEach((lbl) => {
      expect(lbl.className).toContain("text-sm");
      expect(lbl.className).toContain("font-medium");
      expect(lbl.className).toContain("text-gray-700");
    });

    // INPUT/SELECT
    const selects = form.querySelectorAll("select");
    expect(selects.length).toBeGreaterThan(0);
    selects.forEach((sel) => {
      expect(sel.className).toContain("w-full");
      expect(sel.className).toContain("px-4");
      expect(sel.className).toContain("py-2.5");
      expect(sel.className).toContain("rounded-xl");
      expect(sel.className).toContain("border-gray-300");
    });

    const inputs = form.querySelectorAll("input");
    expect(inputs.length).toBeGreaterThan(0);
    inputs.forEach((inp) => {
      expect(inp.className).toContain("w-full");
      expect(inp.className).toContain("px-4");
      expect(inp.className).toContain("py-2.5");
      expect(inp.className).toContain("rounded-xl");
      expect(inp.className).toContain("border-gray-300");
    });

    // BUTTON
    const button = screen.getByTestId("batch-create-submit");
    expect(button.className).toContain("bg-blue-600");
    expect(button.className).toContain("hover:bg-blue-700");
    expect(button.className).toContain("rounded-xl");
    expect(button.className).toContain("py-3");
    expect(button.className).toContain("px-4");
  });

  it("has normalized loading and error state styling", async () => {
    await bootAuth(true);

    // Test Loading State
    const fetchMockLoading = vi.fn(async () => new Promise(() => {}));
    (globalThis as any).fetch = fetchMockLoading;
    seedContext();
    const { unmount } = render(
      <MemoryRouter initialEntries={["/inventory/batches"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/inventory/batches" element={<BatchList />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    const loadingEl = await screen.findByTestId("batch-list-loading");
    expect(loadingEl.className).toContain("text-sm");
    expect(loadingEl.className).toContain("text-gray-500");
    unmount();

    // Test Error State
    const fetchMockError = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response("API error", { status: 500 });
    });
    (globalThis as any).fetch = fetchMockError;
    seedContext();
    const renderError = render(
      <MemoryRouter initialEntries={["/inventory/batches"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/inventory/batches" element={<BatchList />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    const errorEl = await screen.findByTestId("batch-list-error");
    expect(errorEl.className).toContain("text-sm");
    expect(errorEl.className).toContain("text-red-600");
    expect(errorEl.className).toContain("bg-red-50");
    expect(errorEl.className).toContain("border-red-100");
    expect(errorEl.className).toContain("rounded-xl");
    renderError.unmount();
  });

  it("has normalized empty state styling", async () => {
    await bootAuth(true);
    const fetchMockEmpty = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200 });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMockEmpty;
    seedContext();

    render(
      <MemoryRouter initialEntries={["/inventory/batches"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/inventory/batches" element={<BatchList />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    const emptyEl = await screen.findByTestId("batch-list-empty");
    expect(emptyEl.className).toContain("text-center");
    expect(emptyEl.className).toContain("py-12");
    expect(emptyEl.className).toContain("text-gray-500");
  });
});

function formCard(el: HTMLElement): HTMLElement | null {
  return el.querySelector('[data-testid="batch-create-form"]')?.closest(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6") || null;
}
