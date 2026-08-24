import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { CustomerLoyaltyRecordEdit } from "../pages/CustomerLoyaltyRecordEdit";

const BID = "11111111-1111-1111-1111-111111111111";
const PROGID = "33333333-3333-3333-3333-333333333333";
const RECID = "44444444-4444-4444-4444-444444444444";

const record = {
  id: RECID,
  business: BID,
  program: PROGID,
  customer: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  points_balance: "100.00",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

function seedContext() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([{ id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" }]),
  );
  localStorage.setItem("kopera_current_business", BID);
  localStorage.setItem("kopera_current_location", "l1");
}

function renderEdit() {
  seedContext();
  return render(
    <MemoryRouter initialEntries={[`/loyalty-programs/${PROGID}/customers/${RECID}/edit`]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/loyalty-programs/:programId/customers/:recordId/edit" element={<CustomerLoyaltyRecordEdit />} />
            <Route path="/loyalty-programs/:programId/customers/:recordId" element={<div data-testid="customer-loyalty-record-detail-nav">Navigated</div>} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("CustomerLoyaltyRecordEdit", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows a loading state while fetching", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response(JSON.stringify(record), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderEdit();
    expect(screen.getByTestId("customer-loyalty-record-edit-loading")).toBeTruthy();
  });

  it("loads the record and pre-fills the points field", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/loyalty-programs/${PROGID}/customers/${RECID}/`)) {
        return new Response(JSON.stringify(record), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("customer-loyalty-record-edit-form")).toBeTruthy());
    expect((screen.getByTestId("customer-loyalty-record-points-input") as HTMLInputElement).value).toBe("100.00");
  });

  it("submits a valid update via PATCH with only points_balance", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/loyalty-programs/${PROGID}/customers/${RECID}/`)) {
        if (init?.method === "PATCH") {
          expect(init.method).toBe("PATCH");
          const body = JSON.parse(String(init.body));
          expect(Object.keys(body).sort()).toEqual(["points_balance"]);
          expect(body).not.toHaveProperty("business");
          expect(body).not.toHaveProperty("program");
          expect(body).not.toHaveProperty("customer");
          expect(body).not.toHaveProperty("id");
          return new Response(JSON.stringify({ ...record, points_balance: "200.00" }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify(record), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("customer-loyalty-record-edit-submit")).toBeTruthy());
    (screen.getByTestId("customer-loyalty-record-points-input") as HTMLInputElement).value = "200.00";
    screen.getByTestId("customer-loyalty-record-edit-submit").click();
    await waitFor(() => expect(screen.getByTestId("customer-loyalty-record-detail-nav")).toBeTruthy());
  });

  it("handles backend 400 error on negative points", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/loyalty-programs/${PROGID}/customers/${RECID}/`) && init?.method === "PATCH") {
        return new Response(
          JSON.stringify({ points_balance: ["Points balance must not be negative."] }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/loyalty-programs/${PROGID}/customers/${RECID}/`)) {
        return new Response(JSON.stringify(record), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("customer-loyalty-record-edit-submit")).toBeTruthy());
    (screen.getByTestId("customer-loyalty-record-points-input") as HTMLInputElement).value = "200.00";
    screen.getByTestId("customer-loyalty-record-edit-submit").click();
    await waitFor(() => expect(screen.getByTestId("customer-loyalty-record-edit-error")).toBeTruthy());
  });

  it("handles 401 gracefully by navigating to login", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/loyalty-programs/${PROGID}/customers/${RECID}/`)) {
        return new Response("Unauthorized", { status: 401 });
      }
      return new Response("Unauthorized", { status: 401 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });
});
