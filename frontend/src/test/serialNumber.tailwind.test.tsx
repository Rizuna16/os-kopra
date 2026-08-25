import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { SerialNumberList } from "../pages/SerialNumberList";

const BID = "11111111-1111-1111-1111-111111111111";
const LOC = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

function seedContext() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([{ id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" }]),
  );
  localStorage.setItem("kopera_current_business", BID);
  localStorage.setItem("kopera_current_location", LOC);
}

function serialResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: "cccccccc-1111-1111-1111-cccccccccccc",
    batch: "bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb",
    serial_number: "SN-001",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("SerialNumberList Tailwind Normalization Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("has normalized page, container, card, title, labels, inputs, and submit button", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes("/api/v1/inventory/serial-numbers/")) {
        return new Response(JSON.stringify([serialResponse()]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    seedContext();
    render(
      <MemoryRouter initialEntries={["/inventory/serial-numbers"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/inventory/serial-numbers" element={<SerialNumberList />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    const serialListEl = await screen.findByTestId("serial-list");

    // PAGE
    expect(serialListEl.className).toContain("min-h-screen");
    expect(serialListEl.className).toContain("bg-gray-50");

    // CONTAINER
    const containerDiv = serialListEl.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(containerDiv).not.toBeNull();

    // CARD
    const cardDiv = formCard(serialListEl);
    expect(cardDiv).not.toBeNull();

    // TITLE
    const title = screen.getByRole("heading", { level: 1 });
    expect(title.className).toContain("text-2xl");
    expect(title.className).toContain("font-bold");
    expect(title.className).toContain("tracking-tight");
    expect(title.className).toContain("text-gray-900");

    // LABELS
    const form = screen.getByTestId("serial-create-form");
    const labels = form.querySelectorAll("label");
    expect(labels.length).toBeGreaterThan(0);
    labels.forEach((lbl) => {
      expect(lbl.className).toContain("text-sm");
      expect(lbl.className).toContain("font-medium");
      expect(lbl.className).toContain("text-gray-700");
    });

    // INPUT
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
    const button = screen.getByTestId("serial-create-submit");
    expect(button.className).toContain("bg-blue-600");
    expect(button.className).toContain("hover:bg-blue-700");
    expect(button.className).toContain("rounded-xl");
    expect(button.className).toContain("py-3");
    expect(button.className).toContain("px-4");
  });

  it("has normalized loading state styling", async () => {
    await bootAuth(true);

    const fetchMockLoading = vi.fn(async () => new Promise(() => {}));
    (globalThis as any).fetch = fetchMockLoading;
    seedContext();
    render(
      <MemoryRouter initialEntries={["/inventory/serial-numbers"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/inventory/serial-numbers" element={<SerialNumberList />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    const loadingEl = await screen.findByTestId("serial-list-loading");
    expect(loadingEl.className).toContain("text-sm");
    expect(loadingEl.className).toContain("text-gray-500");
  });

  it("has normalized error state styling", async () => {
    await bootAuth(true);

    const fetchMockError = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response("API error", { status: 500 });
    });
    (globalThis as any).fetch = fetchMockError;
    seedContext();
    render(
      <MemoryRouter initialEntries={["/inventory/serial-numbers"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/inventory/serial-numbers" element={<SerialNumberList />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    const errorEl = await screen.findByTestId("serial-list-error");
    expect(errorEl.className).toContain("text-sm");
    expect(errorEl.className).toContain("text-red-600");
    expect(errorEl.className).toContain("bg-red-50");
    expect(errorEl.className).toContain("border-red-100");
    expect(errorEl.className).toContain("rounded-xl");
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
      <MemoryRouter initialEntries={["/inventory/serial-numbers"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/inventory/serial-numbers" element={<SerialNumberList />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    const emptyEl = await screen.findByTestId("serial-list-empty");
    expect(emptyEl.className).toContain("text-center");
    expect(emptyEl.className).toContain("py-12");
    expect(emptyEl.className).toContain("text-gray-500");
  });
});

function formCard(el: HTMLElement): HTMLElement | null {
  return (
    el.querySelector('[data-testid="serial-create-form"]')?.closest(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6") ||
    null
  );
}
