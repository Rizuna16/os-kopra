import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getOverviewReport,
  getSalesReport,
  getPurchasingReport,
  getFinanceReport,
} from "../reports/reportsService";

const BIZ = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function setupFetch(handler: (url: string, init?: RequestInit) => Response) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => handler(url, init));
  (globalThis as any).fetch = fn;
  return fn;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("reportsService", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("fetches overview report with correct business-scoped URL and maps query params", async () => {
    const mockData = {
      sales: { total: 10, completed: 8, voided: 1, draft: 1, revenue: "1000.00", loyalty_earned: "50.00" },
      purchasing: { total: 5, confirmed: 4, cancelled: 0, draft: 1, cost: "800.00" },
      finance: {
        expense_total: "200.00",
        journal: { DRAFT: 1, POSTED: 2, REVERSED: 0 },
        journal_entry: { DEBIT: "1000.00", CREDIT: "1000.00" },
      },
      counts: { customers: 12, products: 45, variants: 90, employees: 5, employees_active: 4 },
    };

    const fn = setupFetch((url) => {
      expect(String(url)).toContain(`/businesses/${BIZ}/reports/overview/`);
      expect(String(url)).toContain("date_from=2026-08-01");
      expect(String(url)).toContain("date_to=2026-08-26");
      return jsonResponse(mockData);
    });

    const res = await getOverviewReport(BIZ, { date_from: "2026-08-01", date_to: "2026-08-26" });
    expect(res).toEqual(mockData);
    expect(fn).toHaveBeenCalled();
  });

  it("omits query parameters when empty in overview report", async () => {
    const fn = setupFetch((url) => {
      expect(String(url)).toContain(`/businesses/${BIZ}/reports/overview/`);
      expect(String(url)).not.toContain("?");
      return jsonResponse({});
    });
    await getOverviewReport(BIZ);
    expect(fn).toHaveBeenCalled();
  });

  it("validates date range date_from <= date_to and throws", async () => {
    await expect(
      getOverviewReport(BIZ, { date_from: "2026-08-27", date_to: "2026-08-26" })
    ).rejects.toThrow("Invalid date range");
  });

  it("fetches sales report", async () => {
    const mockData = { total: 10, completed: 8, voided: 1, draft: 1, revenue: "1000.00", loyalty_earned: "50.00" };
    const fn = setupFetch((url) => {
      expect(String(url)).toContain(`/businesses/${BIZ}/reports/sales/`);
      return jsonResponse(mockData);
    });
    const res = await getSalesReport(BIZ);
    expect(res).toEqual(mockData);
    expect(fn).toHaveBeenCalled();
  });

  it("fetches purchasing report", async () => {
    const mockData = { total: 5, confirmed: 4, cancelled: 0, draft: 1, cost: "800.00" };
    const fn = setupFetch((url) => {
      expect(String(url)).toContain(`/businesses/${BIZ}/reports/purchasing/`);
      return jsonResponse(mockData);
    });
    const res = await getPurchasingReport(BIZ);
    expect(res).toEqual(mockData);
    expect(fn).toHaveBeenCalled();
  });

  it("fetches finance report", async () => {
    const mockData = {
      expense_total: "200.00",
      journal: { DRAFT: 1, POSTED: 2, REVERSED: 0 },
      journal_entry: { DEBIT: "1000.00", CREDIT: "1000.00" },
    };
    const fn = setupFetch((url) => {
      expect(String(url)).toContain(`/businesses/${BIZ}/reports/finance/`);
      return jsonResponse(mockData);
    });
    const res = await getFinanceReport(BIZ);
    expect(res).toEqual(mockData);
    expect(fn).toHaveBeenCalled();
  });

  it("propagates errors on API failure", async () => {
    setupFetch(() => {
      return new Response("Internal Server Error", { status: 500 });
    });
    await expect(getOverviewReport(BIZ)).rejects.toThrow();
  });
});
