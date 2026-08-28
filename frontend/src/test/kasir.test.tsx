import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider, useBusiness } from "../business/BusinessContext";
import { ProtectedRoute } from "../routes/ProtectedRoute";
import { bootAuth, userObj } from "./testUtils";
import { KasirDashboard } from "../pages/KasirDashboard";
import { listShifts, openShift, closeShift, listSales, createSale, updateSale } from "../kasir/kasirService";

const BID = "11111111-1111-1111-1111-111111111111";
const LOC = "aaaaaaaa-1111-1111-1111-111111111111";
const SID = "22222222-2222-2222-2222-222222222222";
const CID = "33333333-3333-3333-3333-333333333333";
const VID = "44444444-4444-4444-4444-444444444444";
const SALE_ID = "55555555-5555-5555-5555-555555555555";

function seedContext() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([{ id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" }]),
  );
  localStorage.setItem("kopera_current_business", BID);
  localStorage.setItem("kopera_current_location", LOC);
}

function renderPage(fetchMock?: any) {
  seedContext();
  if (fetchMock) {
    (globalThis as any).fetch = fetchMock;
  } else {
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
  }
  return render(
    <MemoryRouter initialEntries={["/kasir"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route
              path="/kasir"
              element={
                <ProtectedRoute>
                  <KasirDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
            <Route path="/onboarding" element={<div data-testid="onboarding-redirect">Onboarding</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("KasirDashboard (RED)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the KASIR dashboard page under business context", async () => {
    await bootAuth(true);
    renderPage();
    await waitFor(() => expect(screen.getByTestId("kasir-dashboard")).toBeTruthy());
  });

  it("requests the active shift from the business-scoped shifts endpoint", async () => {
    await bootAuth(true);
    const calls: string[] = [];
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200 });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/locations/`)) {
        return new Response(
          JSON.stringify([{ id: LOC, name: "Location A", created_at: "2024-01-01T00:00:00Z" }]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/shifts/`)) {
        calls.push(String(url));
        return new Response("[]", { status: 200 });
      }
      return new Response("[]", { status: 200 });
    });
    renderPage(fetchMock);
    await waitFor(() => expect(calls.some((c) => c.includes(BID))).toBe(true));
  });

  it("opens a shift with modal_awal via POST shifts endpoint", async () => {
    await bootAuth(true);
    let posted = false;
    let body: any = null;
    const fetchMock = vi.fn(async (url: string, init?: any) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/locations/`)) {
        return new Response(
          JSON.stringify([{ id: LOC, name: "Location A", created_at: "2024-01-01T00:00:00Z" }]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (
        String(url).includes(`/api/v1/businesses/${BID}/shifts/`) &&
        (init?.method ?? "GET") === "POST"
      ) {
        posted = true;
        body = init?.body ? JSON.parse(init.body) : null;
        return new Response(
          JSON.stringify({
            id: SID,
            business: BID,
            location: LOC,
            cashier: "1",
            modal_awal: "100000.00",
            uang_tunai_aktual: null,
            selisih_kas: null,
            status: "OPEN",
            opened_at: "2024-01-01T00:00:00Z",
            closed_at: null,
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderPage(fetchMock);
    await waitFor(() => expect(screen.getByTestId("open-shift-form")).toBeTruthy());
    fireEvent.change(screen.getByTestId("modal-awal-input"), {
      target: { value: "100000" },
    });
    fireEvent.click(screen.getByTestId("open-shift-submit"));
    await waitFor(() => expect(posted).toBe(true));
    expect(body).toEqual({ location: LOC, modal_awal: "100000" });
  });

  it("closes a shift with uang_tunai_aktual and exposes reconciliation", async () => {
    await bootAuth(true);
    let closed = false;
    let body: any = null;
const fetchMock = vi.fn(async (url: string, init?: any) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200 });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/locations/`)) {
        return new Response(
          JSON.stringify([{ id: LOC, name: "Location A", created_at: "2024-01-01T00:00:00Z" }]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (
        String(url).includes(`/api/v1/businesses/${BID}/shifts/${SID}/close/`) &&
        (init?.method ?? "GET") === "POST"
      ) {
        closed = true;
        body = init?.body ? JSON.parse(init.body) : null;
        return new Response(
          JSON.stringify({
            id: SID,
            business: BID,
            location: LOC,
            cashier: "1",
            modal_awal: "100000.00",
            uang_tunai_aktual: "150000.00",
            selisih_kas: "50000.00",
            status: "CLOSED",
            opened_at: "2024-01-01T00:00:00Z",
            closed_at: "2024-01-01T01:00:00Z",
            total_penjualan_tunai: "50000.00",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/shifts/`)) {
        return new Response(
          JSON.stringify([
            {
              id: SID,
              business: BID,
              location: LOC,
              cashier: "1",
              modal_awal: "100000.00",
              uang_tunai_aktual: null,
              selisih_kas: null,
              status: "OPEN",
              opened_at: "2024-01-01T00:00:00Z",
              closed_at: null,
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    renderPage(fetchMock);
    await waitFor(() => expect(screen.getByTestId("close-shift-form")).toBeTruthy());
    fireEvent.change(screen.getByTestId("uang-tunai-aktual-input"), {
      target: { value: "150000" },
    });
    fireEvent.click(screen.getByTestId("close-shift-submit"));
    await waitFor(() => expect(closed).toBe(true));
    expect(body).toEqual({ uang_tunai_aktual: "150000" });
    await waitFor(() =>
      expect(screen.getByTestId("shift-selisih-kas").textContent).toContain("50000"),
    );
  });

  it("builds a transaction cart with variant, quantity and total", async () => {
    await bootAuth(true);
    renderPage();
    await waitFor(() => expect(screen.getByTestId("kasir-dashboard")).toBeTruthy());
    fireEvent.change(screen.getByTestId("product-search-input"), {
      target: { value: VID },
    });
    fireEvent.click(screen.getByTestId("add-to-cart-button"));
    await waitFor(() => expect(screen.getByTestId("cart-line-" + VID)).toBeTruthy());
    fireEvent.change(screen.getByTestId("cart-qty-" + VID), {
      target: { value: "3" },
    });
    await waitFor(() =>
      expect(screen.getByTestId("cart-total").textContent).not.toBe(""),
    );
  });

  it("exposes only CASH, QRIS, and TRANSFER payment methods", async () => {
    await bootAuth(true);
    renderPage();
    await waitFor(() => expect(screen.getByTestId("payment-method-select")).toBeTruthy());
    const select = screen.getByTestId("payment-method-select") as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toEqual(["CASH", "QRIS", "TRANSFER"]);
  });

  it("submits a COMPLETED transaction via POST sales endpoint", async () => {
    await bootAuth(true);
    let posted = false;
    let body: any = null;
const fetchMock = vi.fn(async (url: string, init?: any) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200 });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/locations/`)) {
        return new Response(
          JSON.stringify([{ id: LOC, name: "Location A", created_at: "2024-01-01T00:00:00Z" }]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (
        String(url).includes(`/api/v1/businesses/${BID}/sales/`) &&
        (init?.method ?? "GET") === "POST"
      ) {
        posted = true;
        body = init?.body ? JSON.parse(init.body) : null;
        return new Response(
          JSON.stringify({
            id: SALE_ID,
            business: BID,
            location: LOC,
            customer: null,
            loyalty_earned: "0.00",
            status: "COMPLETED",
            payment_method: "CASH",
            shift: SID,
            lines: [],
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/shifts/`)) {
        return new Response(
          JSON.stringify([
            {
              id: SID,
              business: BID,
              location: LOC,
              cashier: "1",
              modal_awal: "100000.00",
              uang_tunai_aktual: null,
              selisih_kas: null,
              status: "OPEN",
              opened_at: "2024-01-01T00:00:00Z",
              closed_at: null,
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    renderPage(fetchMock);
    await waitFor(() => expect(screen.getByTestId("kasir-dashboard")).toBeTruthy());
    fireEvent.click(screen.getByTestId("submit-sale-button"));
    await waitFor(() => expect(posted).toBe(true));
    expect(body.payment_method).toBe("CASH");
    expect(body.status).toBe("COMPLETED");
    expect(body.location).toBe(LOC);
  });

  it("holds a transaction with HELD status then resumes via PATCH", async () => {
    await bootAuth(true);
    let patched = false;
    let patchBody: any = null;
const fetchMock = vi.fn(async (url: string, init?: any) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200 });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/locations/`)) {
        return new Response(
          JSON.stringify([{ id: LOC, name: "Location A", created_at: "2024-01-01T00:00:00Z" }]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (
        String(url).includes(`/api/v1/businesses/${BID}/sales/`) &&
        (init?.method ?? "GET") === "POST"
      ) {
        return new Response(
          JSON.stringify({
            id: SALE_ID,
            business: BID,
            location: LOC,
            customer: null,
            loyalty_earned: "0.00",
            status: "HELD",
            payment_method: null,
            shift: SID,
            lines: [],
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      if (
        String(url).includes(`/api/v1/businesses/${BID}/sales/${SALE_ID}/`) &&
        (init?.method ?? "GET") === "PATCH"
      ) {
        patched = true;
        patchBody = init?.body ? JSON.parse(init.body) : null;
        return new Response(
          JSON.stringify({
            id: SALE_ID,
            business: BID,
            location: LOC,
            customer: null,
            loyalty_earned: "0.00",
            status: "COMPLETED",
            payment_method: "CASH",
            shift: SID,
            lines: [],
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/shifts/`)) {
        return new Response(
          JSON.stringify([
            {
              id: SID,
              business: BID,
              location: LOC,
              cashier: "1",
              modal_awal: "100000.00",
              uang_tunai_aktual: null,
              selisih_kas: null,
              status: "OPEN",
              opened_at: "2024-01-01T00:00:00Z",
              closed_at: null,
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    renderPage(fetchMock);
    await waitFor(() => expect(screen.getByTestId("kasir-dashboard")).toBeTruthy());
    fireEvent.click(screen.getByTestId("hold-sale-button"));
    await waitFor(() => expect(screen.getByTestId("held-transaction-" + SALE_ID)).toBeTruthy());
    fireEvent.click(screen.getByTestId("resume-sale-button-" + SALE_ID));
    await waitFor(() => expect(patched).toBe(true));
    expect(patchBody.status).toBe("COMPLETED");
    expect(patchBody.payment_method).toBe("CASH");
  });

  it("service layer derives business_id from BusinessContext and opens a shift", async () => {
    await bootAuth(true);
    let calledUrl: string | null = null;
    (globalThis as any).fetch = vi.fn(async (url: string, init?: any) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200 });
      }
      if (
        String(url).includes("/shifts/") &&
        (init?.method ?? "GET") === "POST"
      ) {
        calledUrl = String(url);
        return new Response(
          JSON.stringify({
            id: SID,
            business: BID,
            location: LOC,
            cashier: "1",
            modal_awal: "100000.00",
            uang_tunai_aktual: null,
            selisih_kas: null,
            status: "OPEN",
            opened_at: "2024-01-01T00:00:00Z",
            closed_at: null,
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    await openShift(BID, LOC, "100000");
    expect(calledUrl).toContain(`/api/v1/businesses/${BID}/shifts/`);
  });

  it("redirects unauthenticated user to login", async () => {
    await bootAuth(false);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(
          JSON.stringify({ error: true, message: "u", status_code: 401 }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("{}", { status: 200 });
    });
    renderPage(fetchMock);
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });
});
