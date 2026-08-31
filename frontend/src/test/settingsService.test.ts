import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getBusinessSettings,
  updateBusinessSettings,
  getTaxSettings,
  updateTaxSettings,
  getCurrencySettings,
  updateCurrencySettings,
  getInvoiceSettings,
  updateInvoiceSettings,
  getReceiptSettings,
  updateReceiptSettings,
  getNotificationPreferences,
  updateNotificationPreferences,
  getIntegrationSettings,
  updateIntegrationSettings,
} from "../settings/settingsService";

const BIZ_ID = "22222222-2222-2222-2222-222222222222";

function mockFetch(handler: (url: string, init?: RequestInit) => Response) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => handler(url, init));
  (globalThis as any).fetch = fetchMock;
  return fetchMock;
}

describe("18. SETTINGS — Settings Service GREEN", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("getBusinessSettings requests GET business endpoint", async () => {
    const fetchMock = mockFetch(() => new Response(JSON.stringify({ id: BIZ_ID, name: "Toko" }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const res = await getBusinessSettings(BIZ_ID);
    expect(res.name).toBe("Toko");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain(`/api/v1/businesses/${BIZ_ID}/settings/business/`);
  });

  it("updateBusinessSettings requests PATCH business endpoint", async () => {
    const fetchMock = mockFetch(() => new Response(JSON.stringify({ id: BIZ_ID, name: "Updated" }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const res = await updateBusinessSettings(BIZ_ID, { name: "Updated" });
    expect(res.name).toBe("Updated");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain(`/api/v1/businesses/${BIZ_ID}/settings/business/`);
    expect(init?.method).toBe("PATCH");
  });

  it("getTaxSettings requests GET tax endpoint", async () => {
    const fetchMock = mockFetch(() => new Response(JSON.stringify({ id: "t1", tax_rate: "0.00" }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const res = await getTaxSettings(BIZ_ID);
    expect(res.tax_rate).toBe("0.00");
    expect(fetchMock.mock.calls[0][0]).toContain(`/api/v1/businesses/${BIZ_ID}/settings/tax/`);
  });

  it("updateTaxSettings requests PATCH tax endpoint", async () => {
    const fetchMock = mockFetch(() => new Response(JSON.stringify({ id: "t1", tax_rate: "11.00" }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const res = await updateTaxSettings(BIZ_ID, { tax_rate: 11 });
    expect(res.tax_rate).toBe("11.00");
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe("PATCH");
  });

  it("getCurrencySettings requests GET currency endpoint", async () => {
    const fetchMock = mockFetch(() => new Response(JSON.stringify({ id: "c1", currency_code: "IDR" }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const res = await getCurrencySettings(BIZ_ID);
    expect(res.currency_code).toBe("IDR");
    expect(fetchMock.mock.calls[0][0]).toContain(`/api/v1/businesses/${BIZ_ID}/settings/currency/`);
  });

  it("updateCurrencySettings requests PATCH currency endpoint", async () => {
    const fetchMock = mockFetch(() => new Response(JSON.stringify({ id: "c1", currency_code: "USD" }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const res = await updateCurrencySettings(BIZ_ID, { currency_code: "USD" });
    expect(res.currency_code).toBe("USD");
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe("PATCH");
  });

  it("getInvoiceSettings requests GET invoice endpoint", async () => {
    const fetchMock = mockFetch(() => new Response(JSON.stringify({ id: "i1", invoice_prefix: "INV-" }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const res = await getInvoiceSettings(BIZ_ID);
    expect(res.invoice_prefix).toBe("INV-");
    expect(fetchMock.mock.calls[0][0]).toContain(`/api/v1/businesses/${BIZ_ID}/settings/invoice/`);
  });

  it("updateInvoiceSettings requests PATCH invoice endpoint", async () => {
    const fetchMock = mockFetch(() => new Response(JSON.stringify({ id: "i1", invoice_prefix: "FTR-" }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const res = await updateInvoiceSettings(BIZ_ID, { invoice_prefix: "FTR-" });
    expect(res.invoice_prefix).toBe("FTR-");
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe("PATCH");
  });

  it("getReceiptSettings requests GET receipt endpoint", async () => {
    const fetchMock = mockFetch(() => new Response(JSON.stringify({ id: "r1", receipt_prefix: "RCT-" }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const res = await getReceiptSettings(BIZ_ID);
    expect(res.receipt_prefix).toBe("RCT-");
    expect(fetchMock.mock.calls[0][0]).toContain(`/api/v1/businesses/${BIZ_ID}/settings/receipt/`);
  });

  it("updateReceiptSettings requests PATCH receipt endpoint", async () => {
    const fetchMock = mockFetch(() => new Response(JSON.stringify({ id: "r1", receipt_prefix: "RCP-" }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const res = await updateReceiptSettings(BIZ_ID, { receipt_prefix: "RCP-" });
    expect(res.receipt_prefix).toBe("RCP-");
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe("PATCH");
  });

  it("getNotificationPreferences requests GET notifications endpoint", async () => {
    const fetchMock = mockFetch(() => new Response(JSON.stringify({ id: "n1", receive_stock_alerts: true }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const res = await getNotificationPreferences(BIZ_ID);
    expect(res.receive_stock_alerts).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toContain(`/api/v1/businesses/${BIZ_ID}/settings/notifications/`);
  });

  it("updateNotificationPreferences requests PATCH notifications endpoint", async () => {
    const fetchMock = mockFetch(() => new Response(JSON.stringify({ id: "n1", receive_stock_alerts: false }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const res = await updateNotificationPreferences(BIZ_ID, { receive_stock_alerts: false });
    expect(res.receive_stock_alerts).toBe(false);
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe("PATCH");
  });

  it("getIntegrationSettings requests GET integration endpoint", async () => {
    const fetchMock = mockFetch(() => new Response(JSON.stringify({ id: "int1", storefront_url: "/store/x/" }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const res = await getIntegrationSettings(BIZ_ID);
    expect(res.storefront_url).toBe("/store/x/");
    expect(fetchMock.mock.calls[0][0]).toContain(`/api/v1/businesses/${BIZ_ID}/settings/integration/`);
  });

  it("updateIntegrationSettings requests PATCH integration endpoint", async () => {
    const fetchMock = mockFetch(() => new Response(JSON.stringify({ id: "int1", webhook_url: "https://x.com" }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const res = await updateIntegrationSettings(BIZ_ID, { webhook_url: "https://x.com" });
    expect(res.webhook_url).toBe("https://x.com");
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe("PATCH");
  });
});
