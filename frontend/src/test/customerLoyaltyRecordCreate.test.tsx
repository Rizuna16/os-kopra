import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { CustomerLoyaltyRecordCreate } from "../pages/CustomerLoyaltyRecordCreate";

const BID = "11111111-1111-1111-1111-111111111111";
const PROGID = "33333333-3333-3333-3333-333333333333";
const CUSTID = "cccccccc-cccc-cccc-cccc-cccccccccccc";

const customers = [
  { id: CUSTID, business: BID, name: "Customer A", phone: "", email: "", address: "", created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
];

const validRecord = {
  id: "r1",
  business: BID,
  program: PROGID,
  customer: CUSTID,
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

function renderCreate() {
  seedContext();
  return render(
    <MemoryRouter initialEntries={[`/loyalty-programs/${PROGID}/customers/new`]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/loyalty-programs/:programId/customers/new" element={<CustomerLoyaltyRecordCreate />} />
            <Route path="/loyalty-programs/:programId/customers" element={<div data-testid="customer-loyalty-record-list-nav">Navigated</div>} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("CustomerLoyaltyRecordCreate", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the create form with customer select and points_balance field", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/customers/`)) {
        return new Response(JSON.stringify(customers), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("customer-loyalty-record-create-form")).toBeTruthy());
    expect(screen.getByTestId("customer-loyalty-record-customer-input")).toBeTruthy();
    expect(screen.getByTestId("customer-loyalty-record-points-input")).toBeTruthy();
    expect(screen.getByTestId("customer-loyalty-record-create-submit")).toBeTruthy();
  });

  it("rejects when no customer selected without calling the API", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/customers/`)) {
        return new Response(JSON.stringify(customers), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("customer-loyalty-record-create-submit")).toBeTruthy());
    screen.getByTestId("customer-loyalty-record-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("customer-loyalty-record-create-error")).toBeTruthy());
    const calls = fetchMock.mock.calls.filter((c) => String(c[0]).includes(`/api/v1/businesses/${BID}/loyalty-programs/${PROGID}/customers/`));
    expect(calls.length).toBe(0);
  });

  it("submits a valid record and sends only customer and points_balance", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/customers/`)) {
        return new Response(JSON.stringify(customers), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/loyalty-programs/${PROGID}/customers/`)) {
        expect(init?.method).toBe("POST");
        const body = JSON.parse(String(init?.body));
        expect(Object.keys(body).sort()).toEqual(["customer", "points_balance"]);
        expect(body).not.toHaveProperty("business");
        expect(body).not.toHaveProperty("program");
        expect(body).not.toHaveProperty("id");
        expect(body.customer).toBe(CUSTID);
        return new Response(JSON.stringify(validRecord), { status: 201, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("customer-loyalty-record-create-submit")).toBeTruthy());
    const select = screen.getByTestId("customer-loyalty-record-customer-input") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: CUSTID } });
    (screen.getByTestId("customer-loyalty-record-points-input") as HTMLInputElement).value = "100.00";
    screen.getByTestId("customer-loyalty-record-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("customer-loyalty-record-list-nav")).toBeTruthy());
  });

  it("handles backend 400 error", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/customers/`)) {
        return new Response(JSON.stringify(customers), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/loyalty-programs/${PROGID}/customers/`)) {
        return new Response(
          JSON.stringify({ points_balance: ["Points balance must not be negative."] }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("customer-loyalty-record-create-submit")).toBeTruthy());
    const select = screen.getByTestId("customer-loyalty-record-customer-input") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: CUSTID } });
    (screen.getByTestId("customer-loyalty-record-points-input") as HTMLInputElement).value = "100.00";
    screen.getByTestId("customer-loyalty-record-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("customer-loyalty-record-create-error")).toBeTruthy());
  });

  it("handles 401 gracefully by navigating to login", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/loyalty-programs/${PROGID}/customers/`)) {
        return new Response("Unauthorized", { status: 401 });
      }
      return new Response("Unauthorized", { status: 401 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });
});
