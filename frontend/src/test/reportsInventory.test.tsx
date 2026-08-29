import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { ReportsInventory } from "../pages/ReportsInventory";

const BID = "11111111-1111-1111-1111-111111111111";

function seedCurrentBusiness(businessId: string) {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([
      { id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" },
    ])
  );
  localStorage.setItem("kopera_current_business", businessId);
  localStorage.setItem("kopera_current_location", "l1");
}

function renderInventory() {
  seedCurrentBusiness(BID);
  return render(
    <MemoryRouter initialEntries={["/reports/inventory"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/reports/inventory" element={<ReportsInventory />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

const mockInventory = {
  total_products: 120,
  total_variants: 150,
  total_stock_quantity: 2500,
  low_stock_count: 3,
  inventory_value: "150000.00",
};

describe("ReportsInventory Page", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders inventory report metrics with all required testids", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/reports/inventory/`)) {
        return new Response(JSON.stringify(mockInventory), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    renderInventory();

    await waitFor(() => expect(screen.getByTestId("reports-inventory-page")).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId("inventory-total-items")).toBeTruthy());

    expect(screen.getByTestId("inventory-total-items").textContent).toBe("120");
    expect(screen.getByTestId("inventory-total-variants").textContent).toBe("150");
    expect(screen.getByTestId("inventory-total-stock").textContent).toBe("2500");
    expect(screen.getByTestId("inventory-total-value").textContent).toBe("150000.00");
    expect(screen.getByTestId("inventory-low-stock-count").textContent).toBe("3");
  });

  it("shows loading state while fetching inventory report", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Promise<Response>(() => {});
    });

    renderInventory();
    await waitFor(() => expect(screen.getByTestId("reports-inventory-loading")).toBeTruthy());
  });

  it("shows empty state when inventory report has no data", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/reports/inventory/`)) {
        return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    renderInventory();
    await waitFor(() => expect(screen.getByTestId("reports-inventory-empty")).toBeTruthy());
  });

  it("handles error state when inventory report API fails", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/reports/inventory/`)) {
        return new Response("Server error", { status: 500 });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    renderInventory();
    await waitFor(() => expect(screen.getByTestId("reports-inventory-error")).toBeTruthy());
  });

  it("verifies Tailwind CSS baseline classes on Inventory page", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify(mockInventory), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;

    renderInventory();
    await waitFor(() => expect(screen.getByTestId("reports-inventory-page")).toBeTruthy());
    const page = screen.getByTestId("reports-inventory-page");
    expect(page.className).toContain("min-h-screen");
    expect(page.className).toContain("bg-gray-50");
  });
});
