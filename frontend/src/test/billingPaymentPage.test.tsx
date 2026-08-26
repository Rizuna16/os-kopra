import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth } from "./testUtils";
import { Billing } from "../pages/Billing";

const BID = "33333333-3333-3333-3333-333333333333";

function seedBusiness(businessId: string) {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([
      { id: businessId, name: "Toko Billing", status: "ONBOARDING", created_at: "2024-01-01T00:00:00Z" },
    ])
  );
  localStorage.setItem("kopera_current_business", businessId);
  localStorage.setItem("kopera_current_location", "loc-1");
}

const MOCK_PLANS = [
  {
    id: "p1",
    name: "Basic Plan",
    code: "BASIC",
    amount: "50000.00",
    currency: "IDR",
    billing_interval: "MONTHLY",
  },
];

const MOCK_PAYMENT = {
  id: "pay-1",
  status: "PENDING",
  provider_reference: "snap-token-xyz",
  redirect_url: "https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-xyz",
  token: "snap-token-xyz",
};

describe("PART 21 — Billing Payment UI Contract (RED)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("exposes a payment CTA for a plan after subscription is created", async () => {
    await bootAuth(true);
    seedBusiness(BID);

    const createdSub = {
      id: "sub-new",
      business: BID,
      status: "ONBOARDING",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify({ id: "1", email: "a@b.com" }), { status: 200 });
      }
      if (String(url).includes("/api/v1/billing/plans/")) {
        return new Response(JSON.stringify(MOCK_PLANS), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/subscription/`) && init?.method === "POST") {
        return new Response(JSON.stringify(createdSub), { status: 201, headers: { "Content-Type": "application/json" } });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    render(
      <MemoryRouter initialEntries={["/billing"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/billing" element={<Billing />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId("create-subscription-cta")).toBeTruthy());
    fireEvent.click(screen.getByTestId("create-subscription-cta"));
    await waitFor(() => expect(screen.getByTestId("subscription-created-badge")).toBeTruthy());

    // Payment CTA must be present after subscription created
    expect(screen.getByTestId("pay-cta")).toBeTruthy();
  });

  it("invokes createPayment with subscription_id and plan_id and shows loading state", async () => {
    await bootAuth(true);
    seedBusiness(BID);

    const createdSub = {
      id: "sub-new",
      business: BID,
      status: "ONBOARDING",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify({ id: "1", email: "a@b.com" }), { status: 200 });
      }
      if (String(url).includes("/api/v1/billing/plans/")) {
        return new Response(JSON.stringify(MOCK_PLANS), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/subscription/`) && init?.method === "POST") {
        return new Response(JSON.stringify(createdSub), { status: 201, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes("/api/v1/billing/payments/") && init?.method === "POST") {
        return new Response(JSON.stringify(MOCK_PAYMENT), { status: 201, headers: { "Content-Type": "application/json" } });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    render(
      <MemoryRouter initialEntries={["/billing"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/billing" element={<Billing />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId("create-subscription-cta")).toBeTruthy());
    fireEvent.click(screen.getByTestId("create-subscription-cta"));
    await waitFor(() => expect(screen.getByTestId("subscription-created-badge")).toBeTruthy());

    const payCta = screen.getByTestId("pay-cta");
    fireEvent.click(payCta);

    // Loading state appears during payment initiation
    await waitFor(() => expect(screen.getByTestId("payment-loading")).toBeTruthy());

    await waitFor(() => {
      const paymentCall = fetchMock.mock.calls.find(
        (c) => String(c[0]).includes("/api/v1/billing/payments/") && (c[1] as RequestInit)?.method === "POST"
      );
      expect(paymentCall).toBeTruthy();
      const body = JSON.parse((paymentCall![1] as RequestInit).body as string);
      expect(body.subscription_id).toBe("sub-new");
      expect(body.plan_id).toBe("p1");
      expect(body.amount).toBeUndefined();
      expect(body.currency).toBeUndefined();
    });
  });

  it("surfaces API error during payment creation", async () => {
    await bootAuth(true);
    seedBusiness(BID);

    const createdSub = {
      id: "sub-new",
      business: BID,
      status: "ONBOARDING",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify({ id: "1", email: "a@b.com" }), { status: 200 });
      }
      if (String(url).includes("/api/v1/billing/plans/")) {
        return new Response(JSON.stringify(MOCK_PLANS), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/subscription/`) && init?.method === "POST") {
        return new Response(JSON.stringify(createdSub), { status: 201, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes("/api/v1/billing/payments/") && init?.method === "POST") {
        return new Response(JSON.stringify({ error: "An active or paid payment already exists for this subscription." }), { status: 400 });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    render(
      <MemoryRouter initialEntries={["/billing"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/billing" element={<Billing />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId("create-subscription-cta")).toBeTruthy());
    fireEvent.click(screen.getByTestId("create-subscription-cta"));
    await waitFor(() => expect(screen.getByTestId("subscription-created-badge")).toBeTruthy());

    fireEvent.click(screen.getByTestId("pay-cta"));

    await waitFor(() => expect(screen.getByTestId("payment-error")).toBeTruthy());
    expect(screen.getByTestId("payment-error").textContent).not.toContain("ACTIVE");
  });

  it("does NOT claim subscription is ACTIVE merely because payment creation succeeded", async () => {
    await bootAuth(true);
    seedBusiness(BID);

    const createdSub = {
      id: "sub-new",
      business: BID,
      status: "ONBOARDING",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify({ id: "1", email: "a@b.com" }), { status: 200 });
      }
      if (String(url).includes("/api/v1/billing/plans/")) {
        return new Response(JSON.stringify(MOCK_PLANS), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/subscription/`) && init?.method === "POST") {
        return new Response(JSON.stringify(createdSub), { status: 201, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes("/api/v1/billing/payments/") && init?.method === "POST") {
        return new Response(JSON.stringify(MOCK_PAYMENT), { status: 201, headers: { "Content-Type": "application/json" } });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    render(
      <MemoryRouter initialEntries={["/billing"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/billing" element={<Billing />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId("create-subscription-cta")).toBeTruthy());
    fireEvent.click(screen.getByTestId("create-subscription-cta"));
    await waitFor(() => expect(screen.getByTestId("subscription-created-badge")).toBeTruthy());

    fireEvent.click(screen.getByTestId("pay-cta"));

    // After successful payment creation, subscription must NOT be reported ACTIVE by UI
    await waitFor(() => expect(screen.queryByTestId("payment-redirect") || screen.queryByTestId("payment-loading")).toBeTruthy());
    expect(screen.queryByTestId("subscription-active-badge")).toBeNull();
  });
});
