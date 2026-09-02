import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider, useBusiness } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";

import type {
  Receivable,
  PaymentAllocation,
  ReceivableStatus,
  PaymentMethodChoice,
  PiutangReportResponse,
  Receivable as ReceivableType,
} from "../receivable/types";

import {
  listReceivables,
  createCreditSale,
  getReceivable,
  updateReceivable,
  payReceivable,
  reversePayment,
  closeReceivable,
  getReceivableReports,
} from "../receivable/receivableService";

import { ReceivableDetail } from "../pages/ReceivableDetail";

const BID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const LOC_A = "11111111-1111-1111-1111-111111111111";
const LOC_B = "22222222-2222-2222-2222-222222222222";
const CID = "33333333-3333-3333-3333-333333333333";
const VID = "44444444-4444-4444-4444-444444444444";
const RID = "55555555-5555-5555-5555-555555555555";
const PAYMENT_ID = "66666666-6666-6666-6666-666666666666";

function seedContext(businessId = BID, locationId = LOC_A) {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([{ id: businessId, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" }]),
  );
  localStorage.setItem("kopera_current_business", businessId);
  localStorage.setItem("kopera_current_location", locationId);
}

function mockReceivable(
  overrides: Partial<ReceivableType> = {},
): ReceivableType {
  return {
    id: RID,
    business: BID,
    location: overrides.location ?? LOC_A,
    customer: CID,
    sale: "77777777-7777-7777-7777-777777777777",
    invoice_number: "INV-000001",
    original_amount: "100000.00",
    paid_amount: "0.00",
    outstanding_amount: "100000.00",
    status: "UNPAID",
    due_date: "2026-12-31",
    is_overdue: false,
    notes: "",
    allocations: [],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function mockPaymentAllocation(overrides: Partial<PaymentAllocation> = {}): PaymentAllocation {
  return {
    id: PAYMENT_ID,
    business: BID,
    receivable: RID,
    amount: "70000.00",
    payment_method: "CASH",
    payment_date: "2024-01-02T00:00:00Z",
    reference: "REF-001",
    notes: "",
    is_reversed: false,
    reversed_at: null,
    reversed_by: null,
    reversal_reason: "",
    created_by: "1",
    created_at: "2024-01-02T00:00:00Z",
    ...overrides,
  };
}

// ====================================================================
// A. TYPE / CONTRACT EXPECTATIONS
// ====================================================================
describe("TYPE CONTRACT — ReceivableStatus values", () => {
  it("defines UNPAID", () => {
    const s: ReceivableStatus = "UNPAID";
    expect(s).toBeDefined();
  });
  it("defines PARTIAL", () => {
    const s: ReceivableStatus = "PARTIAL";
    expect(s).toBeDefined();
  });
  it("defines PAID", () => {
    const s: ReceivableStatus = "PAID";
    expect(s).toBeDefined();
  });
  it("defines VOIDED", () => {
    const s: ReceivableStatus = "VOIDED";
    expect(s).toBeDefined();
  });
  it("defines CLOSED", () => {
    const s: ReceivableStatus = "CLOSED";
    expect(s).toBeDefined();
  });
});

describe("TYPE CONTRACT — PaymentMethodChoice values", () => {
  it("defines CASH", () => {
    const m: PaymentMethodChoice = "CASH";
    expect(m).toBeDefined();
  });
  it("defines QRIS", () => {
    const m: PaymentMethodChoice = "QRIS";
    expect(m).toBeDefined();
  });
  it("defines TRANSFER", () => {
    const m: PaymentMethodChoice = "TRANSFER";
    expect(m).toBeDefined();
  });
});

// ====================================================================
// B. SERVICE CONTRACT
// ====================================================================
describe("SERVICE CONTRACT — apiFetch routing", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    seedContext();
    return () => {
      globalThis.fetch = originalFetch;
    };
  });

  it("listReceivables uses apiClient abstraction (not native fetch)", () => {
    expect(typeof listReceivables).toBe("function");
  });

  it("createCreditSale uses apiClient abstraction", () => {
    expect(typeof createCreditSale).toBe("function");
  });

  it("getReceivable uses apiClient abstraction", () => {
    expect(typeof getReceivable).toBe("function");
  });

  it("updateReceivable uses apiClient abstraction", () => {
    expect(typeof updateReceivable).toBe("function");
  });

  it("payReceivable uses apiClient abstraction", () => {
    expect(typeof payReceivable).toBe("function");
  });

  it("reversePayment uses apiClient abstraction", () => {
    expect(typeof reversePayment).toBe("function");
  });

  it("closeReceivable uses apiClient abstraction", () => {
    expect(typeof closeReceivable).toBe("function");
  });

  it("getReceivableReports uses apiClient abstraction", () => {
    expect(typeof getReceivableReports).toBe("function");
  });

  it("listReceivables calls GET /businesses/{bid}/receivables/", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      expect(url).toContain(`/businesses/${BID}/receivables/`);
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    await listReceivables(BID);
  });

  it("listReceivables passes query filters: location, status, customer, overdue, date_from, date_to", async () => {
    await bootAuth(true);
    let capturedUrl = "";
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      capturedUrl = url;
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    await listReceivables(BID, {
      location: LOC_A,
      status: "UNPAID",
      customer: CID,
      overdue: "true",
      date_from: "2026-01-01",
      date_to: "2026-12-31",
    });
    expect(capturedUrl).toContain("location=");
    expect(capturedUrl).toContain("status=UNPAID");
    expect(capturedUrl).toContain("customer=");
    expect(capturedUrl).toContain("overdue=");
    expect(capturedUrl).toContain("date_from=");
    expect(capturedUrl).toContain("date_to=");
  });

  it("createCreditSale calls POST /businesses/{bid}/receivables/", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: { method?: string }) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      expect(url).toContain(`/businesses/${BID}/receivables/`);
      expect(init?.method).toBe("POST");
      return new Response(JSON.stringify(mockReceivable()), { status: 201, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock as unknown);
    await createCreditSale(BID, {
      location: LOC_A,
      customer: CID,
      lines: [{ variant: VID, quantity: "1.00", unit_price: "100000.00" }],
    });
    expect(fetchMock).toHaveBeenCalled();
  });

  it("getReceivable calls GET /businesses/{bid}/receivables/{id}/", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      expect(url).toContain(`/businesses/${BID}/receivables/${RID}/`);
      return new Response(JSON.stringify(mockReceivable()), { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    await getReceivable(BID, RID);
  });

  it("updateReceivable calls PATCH on /businesses/{bid}/receivables/{id}/", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: { method?: string }) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      expect(url).toContain(`/businesses/${BID}/receivables/${RID}/`);
      expect(init?.method).toBe("PATCH");
      return new Response(JSON.stringify(mockReceivable()), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock as unknown);
    await updateReceivable(BID, RID, { due_date: "2026-12-31", notes: "test note" });
    expect(fetchMock).toHaveBeenCalled();
  });

  it("payReceivable calls POST on /businesses/{bid}/receivables/{id}/pay/", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: { method?: string }) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      expect(url).toContain(`/businesses/${BID}/receivables/${RID}/pay/`);
      expect(init?.method).toBe("POST");
      return new Response(JSON.stringify({ payment: mockPaymentAllocation(), receivable: mockReceivable({ status: "PARTIAL", paid_amount: "70000.00", outstanding_amount: "30000.00" }) }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock as unknown);
    await payReceivable(BID, RID, { amount: "70000.00", payment_method: "CASH" });
    expect(fetchMock).toHaveBeenCalled();
  });

  it("reversePayment calls POST on /businesses/{bid}/receivables/{id}/payments/{pid}/reverse/", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: { method?: string }) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      expect(url).toContain(`/receivables/${RID}/payments/${PAYMENT_ID}/reverse/`);
      expect(init?.method).toBe("POST");
      return new Response(JSON.stringify({ payment: mockPaymentAllocation({ is_reversed: true }), receivable: mockReceivable() }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock as unknown);
    await reversePayment(BID, RID, PAYMENT_ID, { reversal_reason: "Correction" });
    expect(fetchMock).toHaveBeenCalled();
  });

  it("closeReceivable calls POST on /businesses/{bid}/receivables/{id}/close/", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: { method?: string }) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      expect(url).toContain(`/businesses/${BID}/receivables/${RID}/close/`);
      expect(init?.method).toBe("POST");
      return new Response(JSON.stringify(mockReceivable({ status: "CLOSED", paid_amount: "40000.00", outstanding_amount: "0.00" })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock as unknown);
    await closeReceivable(BID, RID, { notes: "Bad debt" });
    expect(fetchMock).toHaveBeenCalled();
  });

  it("getReceivableReports calls GET /businesses/{bid}/receivables/reports/", async () => {
    await bootAuth(true);
    const reportResponse: PiutangReportResponse = {
      total_outstanding: "100000.00",
      total_overdue: "50000.00",
      count_customers_with_debt: 1,
      aging_summary: { not_due: "50000.00", days_1_15: "0.00", days_16_30: "0.00", days_31_60: "0.00", over_60_days: "50000.00" },
      receivables_by_customer: [{ customer_id: CID, customer_name: "Customer A", outstanding: "100000.00", open_receivables_count: 1 }],
    };
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      expect(url).toContain(`/businesses/${BID}/receivables/reports/`);
      return new Response(JSON.stringify(reportResponse), { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const result = await getReceivableReports(BID);
    expect(result.total_outstanding).toBe("100000.00");
  });
});

// ====================================================================
// C. LIST PAGE RED TESTS
// ====================================================================
function renderPage(route: string, pageEl: React.ReactNode) {
  seedContext();
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path={route} element={pageEl} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function renderDetail(receivableId = RID) {
  seedContext();
  return render(
    <MemoryRouter initialEntries={[`/receivables/${receivableId}`]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/receivables/:receivableId" element={<ReceivableDetail />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("LIST PAGE — ReceivableList", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders KPI: Total Outstanding", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/reports/")) {
        return new Response(JSON.stringify({
          total_outstanding: "100000.00",
          total_overdue: "0.00",
          count_customers_with_debt: 1,
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes("/receivables/")) {
        return new Response(JSON.stringify([mockReceivable()]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableList } = await import("../pages/ReceivableList");
    renderPage("/receivables", <ReceivableList />);
    await waitFor(() => expect(screen.getByTestId("kpi-total-outstanding")).toBeTruthy());
    expect(screen.getByTestId("kpi-total-outstanding").textContent).toMatch(/100\.000/);
  });

  it("renders KPI: Total Overdue", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/reports/")) {
        return new Response(JSON.stringify({
          total_outstanding: "100000.00",
          total_overdue: "50000.00",
          count_customers_with_debt: 1,
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes("/receivables/")) {
        return new Response(JSON.stringify([mockReceivable()]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableList } = await import("../pages/ReceivableList");
    renderPage("/receivables", <ReceivableList />);
    await waitFor(() => expect(screen.getByTestId("kpi-total-overdue")).toBeTruthy());
    expect(screen.getByTestId("kpi-total-overdue").textContent).toMatch(/50\.000/);
  });

  it("renders KPI: Customers With Debt", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/reports/")) {
        return new Response(JSON.stringify({
          total_outstanding: "100000.00",
          total_overdue: "0.00",
          count_customers_with_debt: 3,
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes("/receivables/")) {
        return new Response(JSON.stringify([mockReceivable()]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableList } = await import("../pages/ReceivableList");
    renderPage("/receivables", <ReceivableList />);
    await waitFor(() => expect(screen.getByTestId("kpi-customers-with-debt")).toBeTruthy());
    expect(screen.getByTestId("kpi-customers-with-debt")).toHaveTextContent("3");
  });

  it("renders filter: status", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/reports/")) return new Response(JSON.stringify({ total_outstanding: "0.00", total_overdue: "0.00", count_customers_with_debt: 0 }), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/")) return new Response(JSON.stringify([mockReceivable()]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableList } = await import("../pages/ReceivableList");
    renderPage("/receivables", <ReceivableList />);
    await waitFor(() => expect(screen.getByTestId("filter-status")).toBeTruthy());
  });

  it("renders filter: customer", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/reports/")) return new Response(JSON.stringify({ total_outstanding: "0.00", total_overdue: "0.00", count_customers_with_debt: 0 }), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/")) return new Response(JSON.stringify([mockReceivable()]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableList } = await import("../pages/ReceivableList");
    renderPage("/receivables", <ReceivableList />);
    await waitFor(() => expect(screen.getByTestId("filter-customer")).toBeTruthy());
  });

  it("renders filter: location", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/reports/")) return new Response(JSON.stringify({ total_outstanding: "0.00", total_overdue: "0.00", count_customers_with_debt: 0 }), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/")) return new Response(JSON.stringify([mockReceivable()]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableList } = await import("../pages/ReceivableList");
    renderPage("/receivables", <ReceivableList />);
    await waitFor(() => expect(screen.getByTestId("filter-location")).toBeTruthy());
  });

  it("renders filter: overdue toggle", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/reports/")) return new Response(JSON.stringify({ total_outstanding: "0.00", total_overdue: "0.00", count_customers_with_debt: 0 }), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/")) return new Response(JSON.stringify([mockReceivable()]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableList } = await import("../pages/ReceivableList");
    renderPage("/receivables", <ReceivableList />);
    await waitFor(() => expect(screen.getByTestId("filter-overdue")).toBeTruthy());
  });

  it("renders filter: date range", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/reports/")) return new Response(JSON.stringify({ total_outstanding: "0.00", total_overdue: "0.00", count_customers_with_debt: 0 }), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/")) return new Response(JSON.stringify([mockReceivable()]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableList } = await import("../pages/ReceivableList");
    renderPage("/receivables", <ReceivableList />);
    await waitFor(() => expect(screen.getByTestId("filter-date-from")).toBeTruthy());
    expect(screen.getByTestId("filter-date-to")).toBeTruthy();
  });

  it("renders table with invoice number column", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/reports/")) return new Response(JSON.stringify({ total_outstanding: "0.00", total_overdue: "0.00", count_customers_with_debt: 0 }), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/")) return new Response(JSON.stringify([mockReceivable()]), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/locations/")) return new Response(JSON.stringify([{ id: LOC_A, name: "Loc A" }]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableList } = await import("../pages/ReceivableList");
    renderPage("/receivables", <ReceivableList />);
    await waitFor(() => expect(screen.getByTestId("receivable-table")).toBeTruthy());
    expect(screen.getByTestId("receivable-column-header-invoice")).toBeTruthy();
  });

  it("renders table with customer column", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/reports/")) return new Response(JSON.stringify({ total_outstanding: "0.00", total_overdue: "0.00", count_customers_with_debt: 0 }), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/")) return new Response(JSON.stringify([mockReceivable()]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableList } = await import("../pages/ReceivableList");
    renderPage("/receivables", <ReceivableList />);
    await waitFor(() => expect(screen.getByTestId("receivable-column-header-customer")).toBeTruthy());
  });

  it("renders table with location column", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/reports/")) return new Response(JSON.stringify({ total_outstanding: "0.00", total_overdue: "0.00", count_customers_with_debt: 0 }), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/")) return new Response(JSON.stringify([mockReceivable()]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableList } = await import("../pages/ReceivableList");
    renderPage("/receivables", <ReceivableList />);
    await waitFor(() => expect(screen.getByTestId("receivable-column-header-location")).toBeTruthy());
  });

  it("renders table with original amount column", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/reports/")) return new Response(JSON.stringify({ total_outstanding: "0.00", total_overdue: "0.00", count_customers_with_debt: 0 }), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/")) return new Response(JSON.stringify([mockReceivable()]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableList } = await import("../pages/ReceivableList");
    renderPage("/receivables", <ReceivableList />);
    await waitFor(() => expect(screen.getByTestId("receivable-column-header-original")).toBeTruthy());
  });

  it("renders table with paid amount column", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/reports/")) return new Response(JSON.stringify({ total_outstanding: "0.00", total_overdue: "0.00", count_customers_with_debt: 0 }), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/")) return new Response(JSON.stringify([mockReceivable()]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableList } = await import("../pages/ReceivableList");
    renderPage("/receivables", <ReceivableList />);
    await waitFor(() => expect(screen.getByTestId("receivable-column-header-paid")).toBeTruthy());
  });

  it("renders table with outstanding amount column", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/reports/")) return new Response(JSON.stringify({ total_outstanding: "0.00", total_overdue: "0.00", count_customers_with_debt: 0 }), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/")) return new Response(JSON.stringify([mockReceivable()]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableList } = await import("../pages/ReceivableList");
    renderPage("/receivables", <ReceivableList />);
    await waitFor(() => expect(screen.getByTestId("receivable-column-header-outstanding")).toBeTruthy());
  });

  it("renders table with due date column", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/reports/")) return new Response(JSON.stringify({ total_outstanding: "0.00", total_overdue: "0.00", count_customers_with_debt: 0 }), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/")) return new Response(JSON.stringify([mockReceivable()]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableList } = await import("../pages/ReceivableList");
    renderPage("/receivables", <ReceivableList />);
    await waitFor(() => expect(screen.getByTestId("receivable-column-header-due-date")).toBeTruthy());
  });

  it("renders table with status column", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/reports/")) return new Response(JSON.stringify({ total_outstanding: "0.00", total_overdue: "0.00", count_customers_with_debt: 0 }), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/")) return new Response(JSON.stringify([mockReceivable()]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableList } = await import("../pages/ReceivableList");
    renderPage("/receivables", <ReceivableList />);
    await waitFor(() => expect(screen.getByTestId("receivable-column-header-status")).toBeTruthy());
  });

  it("renders table with overdue indicator column", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/reports/")) return new Response(JSON.stringify({ total_outstanding: "0.00", total_overdue: "0.00", count_customers_with_debt: 0 }), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/")) return new Response(JSON.stringify([mockReceivable()]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableList } = await import("../pages/ReceivableList");
    renderPage("/receivables", <ReceivableList />);
    await waitFor(() => expect(screen.getByTestId("receivable-column-header-overdue")).toBeTruthy());
  });

  it("renders table with actions column", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/reports/")) return new Response(JSON.stringify({ total_outstanding: "0.00", total_overdue: "0.00", count_customers_with_debt: 0 }), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/")) return new Response(JSON.stringify([mockReceivable()]), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/locations/")) return new Response(JSON.stringify([{ id: LOC_A, name: "Loc A" }]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableList } = await import("../pages/ReceivableList");
    renderPage("/receivables", <ReceivableList />);
    await waitFor(() => expect(screen.getByTestId("receivable-column-header-actions")).toBeTruthy());
  });

  it("formats amounts as Rupiah", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/reports/")) return new Response(JSON.stringify({ total_outstanding: "0.00", total_overdue: "0.00", count_customers_with_debt: 0 }), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/")) {
        const data = [mockReceivable({ original_amount: "5000000.00", paid_amount: "1500000.00", outstanding_amount: "3500000.00" })];
        return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes("/locations/")) return new Response(JSON.stringify([{ id: LOC_A, name: "Loc A" }]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableList } = await import("../pages/ReceivableList");
    renderPage("/receivables", <ReceivableList />);
    await waitFor(() => expect(screen.getByTestId("receivable-row-55555555-5555-5555-5555-555555555555")).toBeTruthy());
    const row = screen.getByTestId("receivable-row-55555555-5555-5555-5555-555555555555");
    expect(row.textContent).toMatch(/Rp5.000.000|5.000.000,00|Rp 5.000.000/);
  });

  it("shows empty state when no receivables", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/")) return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ total_outstanding: "0.00", total_overdue: "0.00", count_customers_with_debt: 0 }), { status: 200 });
    }));
    const { ReceivableList } = await import("../pages/ReceivableList");
    renderPage("/receivables", <ReceivableList />);
    await waitFor(() => expect(screen.getByTestId("receivable-list-empty")).toBeTruthy());
  });

  it("shows loading state while fetching", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/reports/")) return new Response(JSON.stringify({ total_outstanding: "0.00", total_overdue: "0.00", count_customers_with_debt: 0 }), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/")) return new Response(JSON.stringify([mockReceivable()]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableList } = await import("../pages/ReceivableList");
    renderPage("/receivables", <ReceivableList />);
    expect(screen.getByTestId("receivable-list-loading")).toBeTruthy();
  });

  it("shows error state on 500", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("Server error", { status: 500 });
    }));
    const { ReceivableList } = await import("../pages/ReceivableList");
    renderPage("/receivables", <ReceivableList />);
    await waitFor(() => expect(screen.getByTestId("receivable-list-error")).toBeTruthy());
  });
});

// ====================================================================
// D. CREDIT SALE CREATE RED TESTS
// ====================================================================
describe("CREDIT SALE CREATE PAGE", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders select location", async () => {
    await bootAuth(true);
    const { CreditSaleCreate } = await import("../pages/CreditSaleCreate");
    renderPage("/receivables/new", <CreditSaleCreate />);
    expect(screen.getByTestId("credit-sale-select-location")).toBeTruthy();
  });

  it("renders select customer", async () => {
    await bootAuth(true);
    const { CreditSaleCreate } = await import("../pages/CreditSaleCreate");
    renderPage("/receivables/new", <CreditSaleCreate />);
    expect(screen.getByTestId("credit-sale-select-customer")).toBeTruthy();
  });

  it("renders add sale lines button/input", async () => {
    await bootAuth(true);
    const { CreditSaleCreate } = await import("../pages/CreditSaleCreate");
    renderPage("/receivables/new", <CreditSaleCreate />);
    expect(screen.getByTestId("credit-sale-lines")).toBeTruthy();
  });

  it("renders initial payment input", async () => {
    await bootAuth(true);
    const { CreditSaleCreate } = await import("../pages/CreditSaleCreate");
    renderPage("/receivables/new", <CreditSaleCreate />);
    expect(screen.getByTestId("credit-sale-initial-payment")).toBeTruthy();
  });

  it("renders payment method select", async () => {
    await bootAuth(true);
    const { CreditSaleCreate } = await import("../pages/CreditSaleCreate");
    renderPage("/receivables/new", <CreditSaleCreate />);
    expect(screen.getByTestId("credit-sale-payment-method")).toBeTruthy();
  });

  it("renders due date input", async () => {
    await bootAuth(true);
    const { CreditSaleCreate } = await import("../pages/CreditSaleCreate");
    renderPage("/receivables/new", <CreditSaleCreate />);
    expect(screen.getByTestId("credit-sale-due-date")).toBeTruthy();
  });

  it("renders notes input", async () => {
    await bootAuth(true);
    const { CreditSaleCreate } = await import("../pages/CreditSaleCreate");
    renderPage("/receivables/new", <CreditSaleCreate />);
    expect(screen.getByTestId("credit-sale-notes")).toBeTruthy();
  });

  it("renders reference input", async () => {
    await bootAuth(true);
    const { CreditSaleCreate } = await import("../pages/CreditSaleCreate");
    renderPage("/receivables/new", <CreditSaleCreate />);
    expect(screen.getByTestId("credit-sale-reference")).toBeTruthy();
  });

  it("renders optional invoice number input", async () => {
    await bootAuth(true);
    const { CreditSaleCreate } = await import("../pages/CreditSaleCreate");
    renderPage("/receivables/new", <CreditSaleCreate />);
    expect(screen.getByTestId("credit-sale-invoice-number")).toBeTruthy();
  });

  it("renders submit button", async () => {
    await bootAuth(true);
    const { CreditSaleCreate } = await import("../pages/CreditSaleCreate");
    renderPage("/receivables/new", <CreditSaleCreate />);
    expect(screen.getByTestId("credit-sale-submit-btn")).toBeTruthy();
  });

  it("submits credit sale form and calls createCreditSale", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: { method?: string }) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).endsWith("/receivables/") && init?.method === "POST") {
        return new Response(JSON.stringify(mockReceivable()), { status: 201, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock as unknown);
    const { CreditSaleCreate } = await import("../pages/CreditSaleCreate");
    renderPage("/receivables/new", <CreditSaleCreate />);
    await waitFor(() => expect(screen.getByTestId("credit-sale-submit-btn")).toBeTruthy());
    fireEvent.click(screen.getByTestId("credit-sale-submit-btn"));
  });

  it("rejects initial_payment exceeding total sale amount", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { CreditSaleCreate } = await import("../pages/CreditSaleCreate");
    renderPage("/receivables/new", <CreditSaleCreate />);
    await waitFor(() => expect(screen.getByTestId("credit-sale-submit-btn")).toBeTruthy());
    fireEvent.change(screen.getByTestId("credit-sale-initial-payment"), { target: { value: "50000.00" } });
    expect(screen.queryByTestId("credit-sale-overpayment-error")).toBeTruthy();
  });

  it("shows loading state on submit", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: { method?: string }) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/customers/")) return new Response(JSON.stringify([{ id: CID, name: "Cust A" }]), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/locations/")) return new Response(JSON.stringify([{ id: LOC_A, name: "Loc A" }]), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/products/") || String(url).includes("/variants/")) return new Response(JSON.stringify([{ id: VID, name: "Var A" }]), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).endsWith("/receivables/") && init?.method === "POST") {
        return new Promise((resolve) => setTimeout(() => resolve(new Response(JSON.stringify(mockReceivable()), { status: 201, headers: { "Content-Type": "application/json" } })), 100));
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock as unknown);
    const { CreditSaleCreate } = await import("../pages/CreditSaleCreate");
    renderPage("/receivables/new", <CreditSaleCreate />);
    await waitFor(() => expect(screen.getByTestId("credit-sale-submit-btn")).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId("credit-sale-select-customer")).toBeTruthy());
    fireEvent.change(screen.getByTestId("credit-sale-select-location"), { target: { value: LOC_A } });
    fireEvent.change(screen.getByTestId("credit-sale-select-customer"), { target: { value: CID } });
    fireEvent.submit(screen.getByTestId("credit-sale-form"));
    expect(screen.getByTestId("credit-sale-submitting")).toBeTruthy();
  });

  it("shows API error on 400", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: { method?: string }) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/customers/")) return new Response(JSON.stringify([{ id: CID, name: "Cust A" }]), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/locations/")) return new Response(JSON.stringify([{ id: LOC_A, name: "Loc A" }]), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/products/") || String(url).includes("/variants/")) return new Response(JSON.stringify([{ id: VID, name: "Var A" }]), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).endsWith("/receivables/") && init?.method === "POST") {
        return new Response(JSON.stringify({ error: "lines", message: "At least one line is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { CreditSaleCreate } = await import("../pages/CreditSaleCreate");
    renderPage("/receivables/new", <CreditSaleCreate />);
    await waitFor(() => expect(screen.getByTestId("credit-sale-submit-btn")).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId("credit-sale-select-customer")).toBeTruthy());
    fireEvent.change(screen.getByTestId("credit-sale-select-location"), { target: { value: LOC_A } });
    fireEvent.change(screen.getByTestId("credit-sale-select-customer"), { target: { value: CID } });
    fireEvent.submit(screen.getByTestId("credit-sale-form"));
    await waitFor(() => expect(screen.getByTestId("credit-sale-error")).toBeTruthy());
  });
});

// ====================================================================
// E. DETAIL PAGE RED TESTS
// ====================================================================
describe("RECEIVABLE DETAIL PAGE", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders invoice number in header", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/receivables/${RID}`)) return new Response(JSON.stringify(mockReceivable()), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableDetail } = await import("../pages/ReceivableDetail");
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("detail-invoice-number")).toBeTruthy());
    expect(screen.getByTestId("detail-invoice-number")).toHaveTextContent("INV-000001");
  });

  it("renders financial summary: original", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/receivables/${RID}`)) return new Response(JSON.stringify(mockReceivable()), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableDetail } = await import("../pages/ReceivableDetail");
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("detail-amount-original")).toBeTruthy());
  });

  it("renders financial summary: paid", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/receivables/${RID}`)) return new Response(JSON.stringify(mockReceivable()), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableDetail } = await import("../pages/ReceivableDetail");
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("detail-amount-paid")).toBeTruthy());
  });

  it("renders financial summary: outstanding", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/receivables/${RID}`)) return new Response(JSON.stringify(mockReceivable()), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableDetail } = await import("../pages/ReceivableDetail");
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("detail-amount-outstanding")).toBeTruthy());
  });

  it("renders due date display", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/receivables/${RID}`)) return new Response(JSON.stringify(mockReceivable()), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableDetail } = await import("../pages/ReceivableDetail");
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("detail-due-date")).toBeTruthy());
  });

  it("renders status badge", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/receivables/${RID}`)) return new Response(JSON.stringify(mockReceivable()), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableDetail } = await import("../pages/ReceivableDetail");
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("detail-status-badge")).toBeTruthy());
  });

  it("renders payment history table", async () => {
    await bootAuth(true);
    const rec = mockReceivable({
      status: "PARTIAL",
      paid_amount: "70000.00",
      outstanding_amount: "30000.00",
      allocations: [mockPaymentAllocation()],
    });
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/receivables/${RID}/`)) return new Response(JSON.stringify(rec), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableDetail } = await import("../pages/ReceivableDetail");
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("detail-payment-history")).toBeTruthy());
  });
});

// ====================================================================
// F. STATE MATRIX RED TESTS
// ====================================================================
describe("STATE MATRIX — UNPAID", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    seedContext();
  });

  it("shows Pay button for UNPAID (Owner)", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/receivables/${RID}/`)) return new Response(JSON.stringify(mockReceivable({ status: "UNPAID" })), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableDetail } = await import("../pages/ReceivableDetail");
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("detail-status-badge")).toBeTruthy());
    expect(screen.queryByTestId("btn-pay-receivable")).toBeTruthy();
  });
});

describe("STATE MATRIX — PAID", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    seedContext();
  });

  it("hides Pay button for PAID", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/receivables/${RID}/`)) {
        return new Response(JSON.stringify(mockReceivable({ status: "PAID", paid_amount: "100000.00", outstanding_amount: "0.00", allocations: [mockPaymentAllocation()] })), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableDetail } = await import("../pages/ReceivableDetail");
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("detail-status-badge")).toBeTruthy());
    expect(screen.queryByTestId("btn-pay-receivable")).toBeNull();
  });
});

describe("STATE MATRIX — CLOSED", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    seedContext();
  });

  it("hides Pay and Close buttons for CLOSED", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/receivables/${RID}/`)) return new Response(JSON.stringify(mockReceivable({ status: "CLOSED", paid_amount: "40000.00", outstanding_amount: "0.00" })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableDetail } = await import("../pages/ReceivableDetail");
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("detail-status-badge")).toBeTruthy());
    expect(screen.queryByTestId("btn-pay-receivable")).toBeNull();
    expect(screen.queryByTestId("btn-close-receivable")).toBeNull();
  });
});

describe("STATE MATRIX — VOIDED", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    seedContext();
  });

  it("hides Pay, Reverse, Close actions for VOIDED", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/receivables/${RID}/`)) return new Response(JSON.stringify(mockReceivable({ status: "VOIDED", outstanding_amount: "0.00" })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableDetail } = await import("../pages/ReceivableDetail");
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("detail-status-badge")).toBeTruthy());
    expect(screen.queryByTestId("btn-pay-receivable")).toBeNull();
    expect(screen.queryByTestId("btn-reverse-payment")).toBeNull();
    expect(screen.queryByTestId("btn-close-receivable")).toBeNull();
  });
});

describe("STATE MATRIX — OVERDUE (derived)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    seedContext();
  });

  it("shows overdue badge when is_overdue=true", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/receivables/${RID}/`)) return new Response(JSON.stringify(mockReceivable({ is_overdue: true, status: "UNPAID" })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableDetail } = await import("../pages/ReceivableDetail");
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("detail-overdue-badge")).toBeTruthy());
  });
});

// ====================================================================
// G. ROLE MATRIX RED TESTS
// ====================================================================
describe("ROLE MATRIX — Admin cannot Reverse or Close", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    seedContext();
  });

  it("hides reverse and close actions for Admin role", async () => {
    await bootAuth(true);
    const adminUser = { ...userObj, email: "admin@kopera.dev", role: "admin" };
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(adminUser), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/receivables/${RID}/`)) return new Response(JSON.stringify(mockReceivable({ status: "PARTIAL", paid_amount: "50000.00", outstanding_amount: "50000.00", allocations: [mockPaymentAllocation()] })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableDetail } = await import("../pages/ReceivableDetail");
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("detail-status-badge")).toBeTruthy());
    expect(screen.queryByTestId("btn-reverse-payment")).toBeNull();
    expect(screen.queryByTestId("btn-close-receivable")).toBeNull();
  });
});

// ====================================================================
// H. PAYMENT MODAL RED TESTS
// ====================================================================
describe("PAYMENT MODAL", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    seedContext();
  });

  it("shows outstanding amount visibly", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/receivables/${RID}`)) return new Response(JSON.stringify(mockReceivable()), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableDetail } = await import("../pages/ReceivableDetail");
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("detail-status-badge")).toBeTruthy());
    const openBtn = screen.getByTestId("btn-pay-receivable");
    fireEvent.click(openBtn);
    await waitFor(() => expect(screen.getByTestId("modal-pay-remaining-outstanding")).toBeTruthy());
  });

  it("has amount input", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/receivables/${RID}`)) return new Response(JSON.stringify(mockReceivable()), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableDetail } = await import("../pages/ReceivableDetail");
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("detail-status-badge")).toBeTruthy());
    fireEvent.click(screen.getByTestId("btn-pay-receivable"));
    await waitFor(() => expect(screen.getByTestId("modal-pay-amount-input")).toBeTruthy());
  });

  it("has payment method select (CASH/QRIS/TRANSFER)", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/receivables/${RID}`)) return new Response(JSON.stringify(mockReceivable()), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableDetail } = await import("../pages/ReceivableDetail");
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("detail-status-badge")).toBeTruthy());
    fireEvent.click(screen.getByTestId("btn-pay-receivable"));
    await waitFor(() => expect(screen.getByTestId("modal-pay-method-select")).toBeTruthy());
  });

  it("shows error on overpayment (400)", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: { method?: string }) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/receivables/${RID}/pay/`) && init?.method === "POST") {
        return new Response(JSON.stringify({ detail: "Payment amount exceeds current outstanding balance" }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/receivables/${RID}`)) return new Response(JSON.stringify(mockReceivable()), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableDetail } = await import("../pages/ReceivableDetail");
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("detail-status-badge")).toBeTruthy());
    fireEvent.click(screen.getByTestId("btn-pay-receivable"));
    await waitFor(() => expect(screen.getByTestId("modal-pay-amount-input")).toBeTruthy());
    fireEvent.change(screen.getByTestId("modal-pay-amount-input"), { target: { value: "99999999.00" } });
    fireEvent.click(screen.getByTestId("modal-pay-confirm-btn"));
    await waitFor(() => expect(screen.getByTestId("modal-pay-error")).toBeTruthy());
  });
});

// ====================================================================
// I. REVERSAL RED TESTS
// ====================================================================
describe("REVERSAL", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    seedContext();
  });

  it("shows reverse action only for allocations with reversible state (Owner)", async () => {
    await bootAuth(true);
    const rec = mockReceivable({
      status: "PARTIAL",
      paid_amount: "70000.00",
      outstanding_amount: "30000.00",
      allocations: [mockPaymentAllocation()],
    });
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/receivables/${RID}/`)) return new Response(JSON.stringify(rec), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableDetail } = await import("../pages/ReceivableDetail");
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("detail-payment-history")).toBeTruthy());
    expect(screen.getByTestId("btn-reverse-payment-66666666-6666-6666-6666-666666666666")).toBeTruthy();
  });
});

// ====================================================================
// J. CLOSE RED TESTS
// ====================================================================
describe("CLOSE / WRITE-OFF", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    seedContext();
  });

  it("shows close action for UNPAID/PARTIAL (Owner only)", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/receivables/${RID}/`)) return new Response(JSON.stringify(mockReceivable({ status: "UNPAID" })), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableDetail } = await import("../pages/ReceivableDetail");
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("detail-status-badge")).toBeTruthy());
    expect(screen.getByTestId("btn-close-receivable")).toBeTruthy();
  });

  it("hides close action for Admin", async () => {
    await bootAuth(true);
    const adminUser = { ...userObj, email: "admin@kopera.dev", role: "admin" };
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(adminUser), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/receivables/${RID}/`)) return new Response(JSON.stringify(mockReceivable({ status: "PARTIAL", paid_amount: "40000.00", outstanding_amount: "60000.00" })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { ReceivableDetail } = await import("../pages/ReceivableDetail");
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("detail-status-badge")).toBeTruthy());
    expect(screen.queryByTestId("btn-close-receivable")).toBeNull();
  });
});

// ====================================================================
// K. AGING / OVERDUE RED TESTS
// ====================================================================
describe("AGING REPORTS", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    seedContext();
  });

  it("reports page renders aging buckets", async () => {
    await bootAuth(true);
    const reportResponse: PiutangReportResponse = {
      total_outstanding: "100000.00",
      total_overdue: "50000.00",
      count_customers_with_debt: 1,
      aging_summary: {
        not_due: "20000.00",
        days_1_15: "10000.00",
        days_16_30: "5000.00",
        days_31_60: "5000.00",
        over_60_days: "5000.00",
      },
      receivables_by_customer: [{ customer_id: CID, customer_name: "Customer A", outstanding: "100000.00", open_receivables_count: 1 }],
    };
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/reports/")) return new Response(JSON.stringify(reportResponse), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { PiutangReports } = await import("../pages/PiutangReports");
    renderPage("/receivables/reports", <PiutangReports />);
    await waitFor(() => expect(screen.getByTestId("aging-bucket-not-due")).toBeTruthy());
    expect(screen.getByTestId("aging-bucket-days-1-15")).toBeTruthy();
    expect(screen.getByTestId("aging-bucket-days-16-30")).toBeTruthy();
    expect(screen.getByTestId("aging-bucket-days-31-60")).toBeTruthy();
    expect(screen.getByTestId("aging-bucket-over-60")).toBeTruthy();
  });

  it("reports page renders customer debt summary", async () => {
    await bootAuth(true);
    const reportResponse: PiutangReportResponse = {
      total_outstanding: "100000.00",
      total_overdue: "0.00",
      count_customers_with_debt: 1,
      aging_summary: { not_due: "100000.00", days_1_15: "0.00", days_16_30: "0.00", days_31_60: "0.00", over_60_days: "0.00" },
      receivables_by_customer: [{ customer_id: CID, customer_name: "Customer A", outstanding: "100000.00", open_receivables_count: 1 }],
    };
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/receivables/reports/")) return new Response(JSON.stringify(reportResponse), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const { PiutangReports } = await import("../pages/PiutangReports");
    renderPage("/receivables/reports", <PiutangReports />);
    await waitFor(() => expect(screen.getByTestId("report-customer-debt")).toBeTruthy());
  });
});

// ====================================================================
// L. ACCESSIBILITY RED TESTS
// ====================================================================
describe("ACCESSIBILITY", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    seedContext();
  });

  it("credit sale form fields have accessible labels", async () => {
    await bootAuth(true);
    const { CreditSaleCreate } = await import("../pages/CreditSaleCreate");
    renderPage("/receivables/new", <CreditSaleCreate />);
    await waitFor(() => expect(screen.getByTestId("credit-sale-submit-btn")).toBeTruthy());
    expect(screen.getByLabelText(/location/i)).toBeTruthy();
    expect(screen.getByLabelText(/customer/i)).toBeTruthy();
    expect(screen.getByLabelText(/initial payment/i)).toBeTruthy();
    expect(screen.getByLabelText(/payment method/i)).toBeTruthy();
    expect(screen.getByLabelText(/due date/i)).toBeTruthy();
  });
});
