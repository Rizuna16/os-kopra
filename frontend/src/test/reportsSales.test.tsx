import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { ReportsSales } from "../pages/ReportsSales";

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

function renderSales() {
  seedCurrentBusiness(BID);
  return render(
    <MemoryRouter initialEntries={["/reports/sales"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/reports/sales" element={<ReportsSales />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

const mockSales = { total: 10, completed: 8, voided: 1, draft: 1, revenue: "1000.00", loyalty_earned: "50.00" };

describe("ReportsSales Page", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders sales report metrics with all required testids", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/reports/sales/`)) {
        return new Response(JSON.stringify(mockSales), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    renderSales();

    await waitFor(() => expect(screen.getByTestId("reports-sales-page")).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId("sales-total")).toBeTruthy());

    expect(screen.getByTestId("sales-total").textContent).toBe("10");
    expect(screen.getByTestId("sales-completed").textContent).toBe("8");
    expect(screen.getByTestId("sales-voided").textContent).toBe("1");
    expect(screen.getByTestId("sales-draft").textContent).toBe("1");
    expect(screen.getByTestId("sales-revenue").textContent).toBe("1000.00");
    expect(screen.getByTestId("sales-loyalty").textContent).toBe("50.00");
  });

  it("handles error state", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("Error", { status: 500 });
    });
    (globalThis as any).fetch = fetchMock;

    renderSales();

    await waitFor(() => expect(screen.getByTestId("reports-sales-error")).toBeTruthy());
  });
});
