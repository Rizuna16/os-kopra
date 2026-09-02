import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";

import type {
  Payable,
  SupplierPaymentAllocation,
  PayableStatus,
  PaymentMethodChoice,
  PayableReportResponse,
} from "../payable/types";

import {
  listPayables,
  createPayable,
  getPayable,
  updatePayable,
  payPayable,
  reverseSupplierPayment,
  closePayable,
  getPayableReports,
} from "../payable/payableService";

import { PayableList } from "../pages/PayableList";
import { PayableCreate } from "../pages/PayableCreate";
import { PayableDetail } from "../pages/PayableDetail";
import { UtangReports } from "../pages/UtangReports";

const BID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const LOC_A = "11111111-1111-1111-1111-111111111111";
const SID = "33333333-3333-3333-3333-333333333333";
const PO_ID = "44444444-4444-4444-4444-444444444444";
const PAYABLE_ID = "55555555-5555-5555-5555-555555555555";
const PAYMENT_ID = "66666666-6666-6666-6666-666666666666";

function seedContext(businessId = BID, locationId = LOC_A) {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([{ id: businessId, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" }]),
  );
  localStorage.setItem("kopera_current_business", businessId);
  localStorage.setItem("kopera_current_location", locationId);
}

function mockPayable(overrides: Partial<Payable> = {}): Payable {
  return {
    id: PAYABLE_ID,
    business: BID,
    location: overrides.location ?? LOC_A,
    supplier: SID,
    purchase_order: PO_ID,
    invoice_number: "INV-PO-000001",
    original_amount: "500000.00",
    paid_amount: "0.00",
    outstanding_amount: "500000.00",
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

function mockSupplierPaymentAllocation(overrides: Partial<SupplierPaymentAllocation> = {}): SupplierPaymentAllocation {
  return {
    id: PAYMENT_ID,
    business: BID,
    payable: PAYABLE_ID,
    amount: "200000.00",
    payment_method: "CASH",
    payment_date: "2024-01-02T00:00:00Z",
    reference: "REF-SUP-001",
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

function renderDetail(payableId = PAYABLE_ID) {
  seedContext();
  return render(
    <MemoryRouter initialEntries={[`/payables/${payableId}`]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/payables/:payableId" element={<PayableDetail />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

// ====================================================================
// A. TYPE / CONTRACT EXPECTATIONS
// ====================================================================
describe("TYPE CONTRACT — PayableStatus & PaymentMethodChoice", () => {
  it("defines UNPAID", () => {
    const s: PayableStatus = "UNPAID";
    expect(s).toBeDefined();
  });
  it("defines PARTIAL", () => {
    const s: PayableStatus = "PARTIAL";
    expect(s).toBeDefined();
  });
  it("defines PAID", () => {
    const s: PayableStatus = "PAID";
    expect(s).toBeDefined();
  });
  it("defines VOIDED", () => {
    const s: PayableStatus = "VOIDED";
    expect(s).toBeDefined();
  });
  it("defines CLOSED", () => {
    const s: PayableStatus = "CLOSED";
    expect(s).toBeDefined();
  });
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
  beforeEach(() => {
    vi.restoreAllMocks();
    seedContext();
  });

  it("listPayables calls GET /businesses/{bid}/payables/", async () => {
    await bootAuth(true);
    let capturedUrl = "";
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      capturedUrl = url;
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    await listPayables(BID);
    expect(capturedUrl).toContain(`/businesses/${BID}/payables/`);
  });

  it("createPayable calls POST /businesses/{bid}/payables/", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: { method?: string }) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      expect(url).toContain(`/businesses/${BID}/payables/`);
      expect(init?.method).toBe("POST");
      return new Response(JSON.stringify(mockPayable()), { status: 201, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock as unknown);
    await createPayable(BID, {
      purchase_order: PO_ID,
      location: LOC_A,
    });
    expect(fetchMock).toHaveBeenCalled();
  });

  it("getPayable calls GET /businesses/{bid}/payables/{id}/", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      expect(url).toContain(`/businesses/${BID}/payables/${PAYABLE_ID}/`);
      return new Response(JSON.stringify(mockPayable()), { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    await getPayable(BID, PAYABLE_ID);
  });

  it("updatePayable calls PATCH on /businesses/{bid}/payables/{id}/", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: { method?: string }) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      expect(url).toContain(`/businesses/${BID}/payables/${PAYABLE_ID}/`);
      expect(init?.method).toBe("PATCH");
      return new Response(JSON.stringify(mockPayable()), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock as unknown);
    await updatePayable(BID, PAYABLE_ID, { due_date: "2026-12-31", notes: "test note" });
    expect(fetchMock).toHaveBeenCalled();
  });

  it("payPayable calls POST on /businesses/{bid}/payables/{id}/pay/", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: { method?: string }) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      expect(url).toContain(`/businesses/${BID}/payables/${PAYABLE_ID}/pay/`);
      expect(init?.method).toBe("POST");
      return new Response(JSON.stringify({ payment: mockSupplierPaymentAllocation(), payable: mockPayable({ status: "PARTIAL", paid_amount: "200000.00", outstanding_amount: "300000.00" }) }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock as unknown);
    await payPayable(BID, PAYABLE_ID, { amount: "200000.00", payment_method: "CASH" });
    expect(fetchMock).toHaveBeenCalled();
  });

  it("reverseSupplierPayment calls POST on /businesses/{bid}/payables/{id}/payments/{pid}/reverse/", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: { method?: string }) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      expect(url).toContain(`/payables/${PAYABLE_ID}/payments/${PAYMENT_ID}/reverse/`);
      expect(init?.method).toBe("POST");
      return new Response(JSON.stringify({ payment: mockSupplierPaymentAllocation({ is_reversed: true }), payable: mockPayable() }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock as unknown);
    await reverseSupplierPayment(BID, PAYABLE_ID, PAYMENT_ID, { reversal_reason: "Correction" });
    expect(fetchMock).toHaveBeenCalled();
  });

  it("closePayable calls POST on /businesses/{bid}/payables/{id}/close/", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: { method?: string }) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      expect(url).toContain(`/businesses/${BID}/payables/${PAYABLE_ID}/close/`);
      expect(init?.method).toBe("POST");
      return new Response(JSON.stringify(mockPayable({ status: "CLOSED", paid_amount: "200000.00", outstanding_amount: "0.00" })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock as unknown);
    await closePayable(BID, PAYABLE_ID, { notes: "Supplier write-off" });
    expect(fetchMock).toHaveBeenCalled();
  });

  it("getPayableReports calls GET /businesses/{bid}/payables/reports/", async () => {
    await bootAuth(true);
    const reportResponse: PayableReportResponse = {
      total_outstanding: "500000.00",
      total_overdue: "200000.00",
      count_suppliers_with_debt: 1,
      aging_summary: { not_due: "300000.00", days_1_15: "0.00", days_16_30: "0.00", days_31_60: "0.00", over_60_days: "200000.00" },
      payables_by_supplier: [{ supplier_id: SID, supplier_name: "Supplier A", outstanding: "500000.00", open_payables_count: 1 }],
    };
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      expect(url).toContain(`/businesses/${BID}/payables/reports/`);
      return new Response(JSON.stringify(reportResponse), { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const result = await getPayableReports(BID);
    expect(result.total_outstanding).toBe("500000.00");
  });
});

// ====================================================================
// C. LIST PAGE TESTS
// ====================================================================
describe("LIST PAGE — PayableList", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders KPI: Total Outstanding", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/payables/reports/")) {
        return new Response(JSON.stringify({
          total_outstanding: "500000.00",
          total_overdue: "0.00",
          count_suppliers_with_debt: 1,
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes("/payables/")) {
        return new Response(JSON.stringify([mockPayable()]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    renderPage("/payables", <PayableList />);
    await waitFor(() => expect(screen.getByTestId("kpi-total-outstanding")).toBeTruthy());
    expect(screen.getByTestId("kpi-total-outstanding").textContent).toMatch(/500\.000/);
  });

  it("renders KPI: Total Overdue", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/payables/reports/")) {
        return new Response(JSON.stringify({
          total_outstanding: "500000.00",
          total_overdue: "200000.00",
          count_suppliers_with_debt: 1,
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes("/payables/")) {
        return new Response(JSON.stringify([mockPayable()]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    renderPage("/payables", <PayableList />);
    await waitFor(() => expect(screen.getByTestId("kpi-total-overdue")).toBeTruthy());
    expect(screen.getByTestId("kpi-total-overdue").textContent).toMatch(/200\.000/);
  });

  it("renders table with invoice column", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/payables/reports/")) return new Response(JSON.stringify({ total_outstanding: "0.00", total_overdue: "0.00", count_suppliers_with_debt: 0 }), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/payables/")) return new Response(JSON.stringify([mockPayable()]), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/locations/")) return new Response(JSON.stringify([{ id: LOC_A, name: "Loc A" }]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    renderPage("/payables", <PayableList />);
    await waitFor(() => expect(screen.getByTestId("payable-table")).toBeTruthy());
    expect(screen.getByTestId("payable-column-header-invoice")).toBeTruthy();
  });
});

// ====================================================================
// D. DETAIL PAGE TESTS
// ====================================================================
describe("DETAIL PAGE — PayableDetail", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders invoice number and status badge", async () => {
    await bootAuth(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/payables/${PAYABLE_ID}`)) return new Response(JSON.stringify(mockPayable()), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/locations/")) return new Response(JSON.stringify([{ id: LOC_A, name: "Loc A" }]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("detail-invoice-number")).toBeTruthy());
    expect(screen.getByTestId("detail-invoice-number")).toHaveTextContent("INV-PO-000001");
    expect(screen.getByTestId("detail-status-badge")).toHaveTextContent("UNPAID");
  });
});

// ====================================================================
// E. REPORTS PAGE TESTS
// ====================================================================
describe("REPORTS PAGE — UtangReports", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders aging buckets", async () => {
    await bootAuth(true);
    const reportResponse: PayableReportResponse = {
      total_outstanding: "500000.00",
      total_overdue: "200000.00",
      count_suppliers_with_debt: 1,
      aging_summary: {
        not_due: "200000.00",
        days_1_15: "100000.00",
        days_16_30: "50000.00",
        days_31_60: "50000.00",
        over_60_days: "100000.00",
      },
      payables_by_supplier: [{ supplier_id: SID, supplier_name: "Supplier Alpha", outstanding: "500000.00", open_payables_count: 1 }],
    };
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/payables/reports/")) return new Response(JSON.stringify(reportResponse), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    renderPage("/payables/reports", <UtangReports />);
    await waitFor(() => expect(screen.getByTestId("aging-bucket-not-due")).toBeTruthy());
    expect(screen.getByTestId("aging-bucket-days-1-15")).toBeTruthy();
    expect(screen.getByTestId("aging-bucket-days-16-30")).toBeTruthy();
    expect(screen.getByTestId("aging-bucket-days-31-60")).toBeTruthy();
    expect(screen.getByTestId("aging-bucket-over-60")).toBeTruthy();
  });
});
