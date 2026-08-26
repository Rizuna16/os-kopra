import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider, useBusiness } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { ReportsOverview } from "../pages/ReportsOverview";

const BID_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const BID_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const OVERVIEW_A = {
  sales: { total: 10, completed: 8, voided: 1, draft: 1, revenue: "1000.00", loyalty_earned: "50.00" },
  purchasing: { total: 5, confirmed: 4, cancelled: 0, draft: 1, cost: "800.00" },
  finance: {
    expense_total: "200.00",
    journal: { DRAFT: 1, POSTED: 2, REVERSED: 0 },
    journal_entry: { DEBIT: "1000.00", CREDIT: "1000.00" },
  },
  counts: { customers: 12, products: 45, variants: 90, employees: 5, employees_active: 4 },
};

const OVERVIEW_B = {
  sales: { total: 99, completed: 90, voided: 5, draft: 4, revenue: "9999.00", loyalty_earned: "500.00" },
  purchasing: { total: 50, confirmed: 40, cancelled: 5, draft: 5, cost: "8000.00" },
  finance: {
    expense_total: "2000.00",
    journal: { DRAFT: 10, POSTED: 20, REVERSED: 0 },
    journal_entry: { DEBIT: "10000.00", CREDIT: "10000.00" },
  },
  counts: { customers: 120, products: 450, variants: 900, employees: 50, employees_active: 40 },
};

function seedBusinesses() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([
      { id: BID_A, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" },
      { id: BID_B, name: "Toko B", status: "ACTIVE", created_at: "2024-01-02T00:00:00Z" },
    ])
  );
  localStorage.setItem("kopera_current_business", BID_A);
  localStorage.setItem("kopera_current_location", "l1");
}

function renderWithSwitch() {
  seedBusinesses();
  function Harness() {
    const b = useBusiness();
    return (
      <div>
        <div data-testid="ctx-biz">{b.currentBusinessId}</div>
        <button data-testid="switch-b" onClick={() => b.selectBusiness(BID_B)}>
          switch-b
        </button>
        <ReportsOverview />
      </div>
    );
  }

  return render(
    <MemoryRouter initialEntries={["/reports/overview"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/reports/overview" element={<Harness />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("ReportsTenantIsolation", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("uses currentBusinessId from BusinessContext for reports overview and reloads when business context switches", async () => {
    await bootAuth(true);
    const overviewByBiz: Record<string, typeof OVERVIEW_A> = {
      [BID_A]: OVERVIEW_A,
      [BID_B]: OVERVIEW_B,
    };

    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      const m = String(url).match(/\/api\/v1\/businesses\/([^/]+)\/reports\/overview\//);
      const biz = m ? m[1] : BID_A;
      return new Response(JSON.stringify(overviewByBiz[biz] ?? OVERVIEW_A), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    (globalThis as any).fetch = fetchMock;

    renderWithSwitch();

    await waitFor(() => expect(screen.getByTestId("sales-total").textContent).toBe("10"));
    const calledA = fetchMock.mock.calls.some((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID_A}/reports/overview/`)
    );
    expect(calledA).toBe(true);

    screen.getByTestId("switch-b").click();

    await waitFor(() => expect(screen.getByTestId("sales-total").textContent).toBe("99"));
    const calledB = fetchMock.mock.calls.some((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID_B}/reports/overview/`)
    );
    expect(calledB).toBe(true);
  });

  it("never sends business_id in request body or query parameter for tenant switching", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify(OVERVIEW_A), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    (globalThis as any).fetch = fetchMock;

    renderWithSwitch();
    await waitFor(() => expect(screen.getByTestId("sales-total")).toBeTruthy());

    fetchMock.mock.calls.forEach((c) => {
      const url = String(c[0]);
      if (url.includes("/reports/")) {
        expect(url).not.toContain("business_id=");
        expect(url).not.toContain("business=");
        if (c[1]?.body) {
          expect(String(c[1].body)).not.toContain("business");
        }
      }
    });
  });
});
