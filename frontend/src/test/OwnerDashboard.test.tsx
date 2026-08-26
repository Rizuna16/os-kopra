import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { OwnerDashboard } from "../pages/OwnerDashboard";

const BID = "11111111-1111-1111-1111-111111111111";
const OTHER_BID = "22222222-2222-2222-2222-222222222222";

function seedCurrentBusiness(businessId: string) {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([
      { id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" },
      { id: OTHER_BID, name: "Toko B", status: "ACTIVE", created_at: "2024-01-02T00:00:00Z" },
    ]),
  );
  localStorage.setItem("kopera_current_business", businessId);
  localStorage.setItem("kopera_current_location", "l1");
}

function renderDashboard(businessId: string) {
  seedCurrentBusiness(businessId);
  return render(
    <MemoryRouter initialEntries={["/app/dashboard"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/app/dashboard" element={<OwnerDashboard />} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

const OVERVIEW = {
  sales: { total: 10, completed: 8, voided: 1, draft: 1, revenue: "1000.00", loyalty_earned: "50.00" },
  purchasing: { total: 5, confirmed: 4, cancelled: 0, draft: 1, cost: "800.00" },
  finance: {
    expense_total: "200.00",
    journal: { DRAFT: 1, POSTED: 2, REVERSED: 0 },
    journal_entry: { DEBIT: "1000.00", CREDIT: "1000.00" },
  },
  counts: { customers: 12, products: 45, variants: 90, employees: 5, employees_active: 4 },
};

const NOTIFICATIONS = [
  { id: "n1", type: "INFO", title: "Stok Menipis", message: "Beras hampir habis", is_read: false, created_at: "2026-08-26T00:00:00Z" },
];

const ONLINE_STORES = [
  { id: "s1", business: BID, name: "Toko Online", slug: "toko-online", default_location: "l1", is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
];

function baseFetch(status = 200, override?: { overview?: unknown; notifications?: unknown; stores?: unknown }) {
  return vi.fn(async (url: string) => {
    if (String(url).includes("/auth/me/")) {
      return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (String(url).includes("/reports/overview/")) {
      return new Response(JSON.stringify(override?.overview ?? OVERVIEW), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (String(url).includes("/notifications/")) {
      return new Response(JSON.stringify(override?.notifications ?? NOTIFICATIONS), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (String(url).includes("/online-stores/")) {
      return new Response(JSON.stringify(override?.stores ?? ONLINE_STORES), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("[]", { status, headers: { "Content-Type": "application/json" } });
  });
}

describe("OwnerDashboard (Post-V1)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders locked executive KPIs from the current business context", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = baseFetch();
    renderDashboard(BID);
    await waitFor(() => expect(screen.getByTestId("kpi-total-omzet")).toBeTruthy());
    expect(screen.getByTestId("kpi-total-omzet")).toHaveTextContent("1000.00");
    expect(screen.getByTestId("kpi-total-penjualan")).toHaveTextContent("8");
    expect(screen.getByTestId("kpi-total-pengeluaran")).toHaveTextContent("200.00");
    expect(screen.getByTestId("kpi-total-produk")).toHaveTextContent("45");
  });

  it("renders a loading skeleton before data resolves", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = baseFetch();
    renderDashboard(BID);
    expect(screen.getByTestId("dashboard-loading")).toBeTruthy();
  });

  it("renders an empty state for zero-valued metrics without crashing", async () => {
    await bootAuth(true);
    const zero = {
      ...OVERVIEW,
      sales: { ...OVERVIEW.sales, completed: 0, revenue: "0.00" },
      finance: { ...OVERVIEW.finance, expense_total: "0.00" },
      counts: { ...OVERVIEW.counts, products: 0 },
    };
    (globalThis as any).fetch = baseFetch(200, {
      overview: zero,
      notifications: [],
      stores: [],
    });
    renderDashboard(BID);
    await waitFor(() => expect(screen.getByTestId("dashboard-empty")).toBeTruthy());
  });

  it("renders a recoverable error state on API failure (500)", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("Internal Server Error", { status: 500 });
    });
    renderDashboard(BID);
    await waitFor(() => expect(screen.getByTestId("dashboard-error")).toBeTruthy());
  });

  it("does NOT render deferred/unlocked financial metrics", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = baseFetch();
    renderDashboard(BID);
    await waitFor(() => expect(screen.getByTestId("kpi-total-omzet")).toBeTruthy());
    expect(screen.queryByTestId("kpi-total-laba")).not.toBeInTheDocument();
    expect(screen.queryByTestId("kpi-laba-kotor")).not.toBeInTheDocument();
    expect(screen.queryByTestId("kpi-laba-bersih")).not.toBeInTheDocument();
    expect(screen.queryByTestId("kpi-piutang")).not.toBeInTheDocument();
    expect(screen.queryByTestId("kpi-hutang")).not.toBeInTheDocument();
    expect(screen.queryByTestId("kpi-total-stok")).not.toBeInTheDocument();
    expect(screen.queryByTestId("kpi-nilai-inventory")).not.toBeInTheDocument();
    expect(screen.queryByTestId("kpi-pertumbuhan")).not.toBeInTheDocument();
    expect(screen.queryByTestId("kpi-ranking-performance")).not.toBeInTheDocument();
    expect(screen.queryByTestId("kpi-customer-aktif")).not.toBeInTheDocument();
    expect(screen.queryByTestId("kpi-supplier-terbaik")).not.toBeInTheDocument();
  });

  it("operates only within the current business context and never fetches another owner business", async () => {
    await bootAuth(true);
    const fn = baseFetch();
    (globalThis as any).fetch = fn;
    renderDashboard(BID);
    await waitFor(() => expect(screen.getByTestId("kpi-total-omzet")).toBeTruthy());
    const calledBusinessIds = fn.mock.calls
      .map((c) => String(c[0]).match(/\/businesses\/([^/]+)\//)?.[1])
      .filter(Boolean);
    expect(calledBusinessIds.every((id) => id === BID)).toBe(true);
    expect(calledBusinessIds).not.toContain(OTHER_BID);
  });

  it("renders quick action destinations for existing module routes", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = baseFetch();
    renderDashboard(BID);
    await waitFor(() => expect(screen.getByTestId("quick-action-tambah-produk")).toBeTruthy());
    expect(screen.getByTestId("quick-action-tambah-penjualan")).toBeTruthy();
    expect(screen.getByTestId("quick-action-tambah-pembelian")).toBeTruthy();
    expect(screen.getByTestId("quick-action-tambah-customer")).toBeTruthy();
    expect(screen.getByTestId("quick-action-tambah-supplier")).toBeTruthy();
    expect(screen.getByTestId("quick-action-tambah-usaha")).toBeTruthy();
    expect(screen.getByTestId("quick-action-buka-online-store")).toBeTruthy();
  });

  it("renders premium command center UI components (business name, owner name, refresh button, operational summary details, notifications read/unread, store details)", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = baseFetch();
    renderDashboard(BID);
    
    // 1. Context & Header
    await waitFor(() => expect(screen.getByTestId("dashboard-business-name")).toHaveTextContent("Toko A"));
    expect(screen.getByTestId("dashboard-owner-name")).toHaveTextContent("a@b.com");
    expect(screen.getByTestId("dashboard-refresh-btn")).toBeTruthy();

    // 2. Operational Summary - Penjualan
    expect(screen.getByTestId("summary-sales-total")).toHaveTextContent("10");
    expect(screen.getByTestId("summary-sales-completed")).toHaveTextContent("8");
    expect(screen.getByTestId("summary-sales-voided")).toHaveTextContent("1");
    expect(screen.getByTestId("summary-sales-draft")).toHaveTextContent("1");

    // 3. Operational Summary - Pembelian
    expect(screen.getByTestId("summary-purchasing-total")).toHaveTextContent("5");
    expect(screen.getByTestId("summary-purchasing-confirmed")).toHaveTextContent("4");
    expect(screen.getByTestId("summary-purchasing-cancelled")).toHaveTextContent("0");
    expect(screen.getByTestId("summary-purchasing-draft")).toHaveTextContent("1");

    // 4. Operational Summary - Keuangan
    expect(screen.getByTestId("summary-finance-expense")).toHaveTextContent("200.00");
    expect(screen.getByTestId("summary-finance-journal-posted")).toHaveTextContent("2");
    expect(screen.getByTestId("summary-finance-debit")).toHaveTextContent("1000.00");
    expect(screen.getByTestId("summary-finance-credit")).toHaveTextContent("1000.00");

    // 5. Notifications
    expect(screen.getByText("Perlu Perhatian")).toBeTruthy();
    expect(screen.getByTestId("notif-n1-unread-badge")).toBeTruthy();

    // 6. Online Store
    expect(screen.getByTestId("store-s1-status")).toHaveTextContent("Active");
  });
});
