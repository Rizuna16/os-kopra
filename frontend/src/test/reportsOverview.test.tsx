import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { ReportsOverview } from "../pages/ReportsOverview";

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

function renderOverview() {
  seedCurrentBusiness(BID);
  return render(
    <MemoryRouter initialEntries={["/reports/overview"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/reports/overview" element={<ReportsOverview />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

const mockOverview = {
  sales: { total: 10, completed: 8, voided: 1, draft: 1, revenue: "1000.00", loyalty_earned: "50.00" },
  purchasing: { total: 5, confirmed: 4, cancelled: 0, draft: 1, cost: "800.00" },
  finance: {
    expense_total: "200.00",
    journal: { DRAFT: 1, POSTED: 2, REVERSED: 0 },
    journal_entry: { DEBIT: "1000.00", CREDIT: "1000.00" },
  },
  counts: { customers: 12, products: 45, variants: 90, employees: 5, employees_active: 4 },
};

describe("ReportsOverview Page", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders loading state initially and then overview content with all contract testids", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/reports/overview/`)) {
        return new Response(JSON.stringify(mockOverview), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    renderOverview();

    await waitFor(() => expect(screen.getByTestId("reports-overview-page")).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId("sales-metrics-card")).toBeTruthy());
    expect(screen.getByTestId("purchasing-metrics-card")).toBeTruthy();
    expect(screen.getByTestId("finance-metrics-card")).toBeTruthy();
    expect(screen.getByTestId("counts-metrics-card")).toBeTruthy();

    expect(screen.getByTestId("sales-total").textContent).toBe("10");
    expect(screen.getByTestId("sales-completed").textContent).toBe("8");
    expect(screen.getByTestId("sales-voided").textContent).toBe("1");
    expect(screen.getByTestId("sales-draft").textContent).toBe("1");
    expect(screen.getByTestId("sales-revenue").textContent).toBe("1000.00");
    expect(screen.getByTestId("sales-loyalty").textContent).toBe("50.00");

    expect(screen.getByTestId("purchasing-total").textContent).toBe("5");
    expect(screen.getByTestId("purchasing-confirmed").textContent).toBe("4");
    expect(screen.getByTestId("purchasing-cancelled").textContent).toBe("0");
    expect(screen.getByTestId("purchasing-draft").textContent).toBe("1");
    expect(screen.getByTestId("purchasing-cost").textContent).toBe("800.00");

    expect(screen.getByTestId("finance-expense-total").textContent).toBe("200.00");
    expect(screen.getByTestId("finance-journal-draft").textContent).toBe("1");
    expect(screen.getByTestId("finance-journal-posted").textContent).toBe("2");
    expect(screen.getByTestId("finance-journal-reversed").textContent).toBe("0");
    expect(screen.getByTestId("finance-debit-total").textContent).toBe("1000.00");
    expect(screen.getByTestId("finance-credit-total").textContent).toBe("1000.00");

    expect(screen.getByTestId("counts-customers").textContent).toBe("12");
    expect(screen.getByTestId("counts-products").textContent).toBe("45");
    expect(screen.getByTestId("counts-variants").textContent).toBe("90");
    expect(screen.getByTestId("counts-employees").textContent).toBe("5");
    expect(screen.getByTestId("counts-employees-active").textContent).toBe("4");
  });

  it("handles error state when API fails", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/reports/overview/`)) {
        return new Response("Server error", { status: 500 });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    renderOverview();

    await waitFor(() => expect(screen.getByTestId("reports-overview-error")).toBeTruthy());
  });

  it("verifies Tailwind CSS baseline classes on Overview page", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify(mockOverview), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;

    renderOverview();

    await waitFor(() => expect(screen.getByTestId("reports-overview-page")).toBeTruthy());
    const page = screen.getByTestId("reports-overview-page");
    expect(page.className).toContain("min-h-screen");
    expect(page.className).toContain("bg-gray-50");
  });
});
