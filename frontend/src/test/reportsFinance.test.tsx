import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { ReportsFinance } from "../pages/ReportsFinance";

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

function renderFinance() {
  seedCurrentBusiness(BID);
  return render(
    <MemoryRouter initialEntries={["/reports/finance"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/reports/finance" element={<ReportsFinance />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

const mockFinance = {
  expense_total: "200.00",
  journal: { DRAFT: 1, POSTED: 2, REVERSED: 0 },
  journal_entry: { DEBIT: "1000.00", CREDIT: "1000.00" },
};

describe("ReportsFinance Page", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders finance report metrics with all required testids", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/reports/finance/`)) {
        return new Response(JSON.stringify(mockFinance), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    renderFinance();

    await waitFor(() => expect(screen.getByTestId("reports-finance-page")).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId("finance-expense-total")).toBeTruthy());

    expect(screen.getByTestId("finance-expense-total").textContent).toBe("200.00");
    expect(screen.getByTestId("finance-journal-draft").textContent).toBe("1");
    expect(screen.getByTestId("finance-journal-posted").textContent).toBe("2");
    expect(screen.getByTestId("finance-journal-reversed").textContent).toBe("0");
    expect(screen.getByTestId("finance-debit-total").textContent).toBe("1000.00");
    expect(screen.getByTestId("finance-credit-total").textContent).toBe("1000.00");
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

    renderFinance();

    await waitFor(() => expect(screen.getByTestId("reports-finance-error")).toBeTruthy());
  });
});
