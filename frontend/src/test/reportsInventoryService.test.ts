import { describe, it, expect, beforeEach, vi } from "vitest";
import { getInventoryReport } from "../reports/reportsService";

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

describe("reportsService - getInventoryReport", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("fetches inventory report with correct business-scoped URL", async () => {
    const mockData = {
      total_items: 120,
      total_value: "150000.00",
      low_stock_count: 3,
    };

    const fn = setupFetch((url) => {
      expect(String(url)).toContain(`/businesses/${BIZ}/reports/inventory/`);
      return jsonResponse(mockData);
    });

    const res = await getInventoryReport(BIZ);
    expect(res).toEqual(mockData);
    expect(fn).toHaveBeenCalled();
  });

  it("propagates errors on inventory report API failure", async () => {
    setupFetch(() => {
      return new Response("Internal Server Error", { status: 500 });
    });
    await expect(getInventoryReport(BIZ)).rejects.toThrow();
  });
});
