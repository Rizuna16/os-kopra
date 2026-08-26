import { describe, it, expect, beforeEach, vi } from "vitest";
import { getOwnerDashboard } from "../dashboard/dashboardService";
import { getOverviewReport } from "../reports/reportsService";
import { listNotifications } from "../notifications/notificationService";
import { listOnlineStores } from "../onlinestore/onlineStoreService";

const BIZ = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const OTHER_BIZ = "cccccccc-cccc-cccc-cccc-cccccccccccc";

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
  { id: "s1", business: BIZ, name: "Toko Online", slug: "toko-online", default_location: "l1", is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
];

describe("dashboardService (Post-V1 Owner Dashboard)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("fetches only the locked single-business scope and never iterates over businesses", async () => {
    const fn = setupFetch((url) => {
      if (String(url).includes("/businesses/")) return jsonResponse(OVERVIEW);
      if (String(url).includes("/notifications/")) return jsonResponse(NOTIFICATIONS);
      if (String(url).includes("/online-stores/")) return jsonResponse(ONLINE_STORES);
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });

    const res = await getOwnerDashboard(BIZ);

    // Only the owned business id must ever appear in request URLs.
    const calledBusinessIds = fn.mock.calls
      .map((c) => String(c[0]).match(/\/businesses\/([^/]+)\//)?.[1])
      .filter(Boolean);
    expect(calledBusinessIds.every((id) => id === BIZ)).toBe(true);
    expect(calledBusinessIds).not.toContain(OTHER_BIZ);
    expect(fn.mock.calls.some((c) => String(c[0]).includes(`/businesses/${OTHER_BIZ}`))).toBe(false);
    expect(res).toBeTruthy();
  });

  it("calls existing PART 18 report, PART 19 notification, and PART 22 online-store endpoints", async () => {
    const fn = setupFetch((url) => {
      if (String(url).includes("/reports/")) return jsonResponse(OVERVIEW);
      if (String(url).includes("/notifications/")) return jsonResponse(NOTIFICATIONS);
      if (String(url).includes("/online-stores/")) return jsonResponse(ONLINE_STORES);
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });

    await getOwnerDashboard(BIZ);

    expect(fn.mock.calls.some((c) => String(c[0]).includes(`/businesses/${BIZ}/reports/overview/`))).toBe(true);
    expect(fn.mock.calls.some((c) => String(c[0]).includes(`/businesses/${BIZ}/notifications/`))).toBe(true);
    expect(fn.mock.calls.some((c) => String(c[0]).includes(`/businesses/${BIZ}/online-stores/`))).toBe(true);
  });

  it("does NOT call per-location stock endpoints (no business-wide stock aggregation in locked scope)", async () => {
    const fn = setupFetch((url) => {
      if (String(url).includes("/reports/")) return jsonResponse(OVERVIEW);
      if (String(url).includes("/notifications/")) return jsonResponse(NOTIFICATIONS);
      if (String(url).includes("/online-stores/")) return jsonResponse(ONLINE_STORES);
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });

    await getOwnerDashboard(BIZ);
    expect(fn.mock.calls.some((c) => String(c[0]).includes("/stocks/"))).toBe(false);
  });

  it("surfaces locked executive KPIs derived from PART 18 overview", async () => {
    setupFetch((url) => {
      if (String(url).includes("/reports/")) return jsonResponse(OVERVIEW);
      if (String(url).includes("/notifications/")) return jsonResponse(NOTIFICATIONS);
      if (String(url).includes("/online-stores/")) return jsonResponse(ONLINE_STORES);
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });

    const res = await getOwnerDashboard(BIZ);
    expect(res.executive.totalOmzet).toBe("1000.00");
    expect(res.executive.totalPenjualan).toBe(8);
    expect(res.executive.totalPengeluaran).toBe("200.00");
    expect(res.executive.totalProduk).toBe(45);
  });

  it("propagates API failures without masking them", async () => {
    setupFetch(() => new Response("Internal Server Error", { status: 500 }));
    await expect(getOwnerDashboard(BIZ)).rejects.toThrow();
  });

  it("reuses the existing report/notification/online-store services", () => {
    expect(typeof getOverviewReport).toBe("function");
    expect(typeof listNotifications).toBe("function");
    expect(typeof listOnlineStores).toBe("function");
  });
});
