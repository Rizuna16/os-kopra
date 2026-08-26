import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth } from "./testUtils";
import { Billing } from "../pages/Billing";

const BID = "33333333-3333-3333-3333-333333333333";

function seedBusiness(businessId: string, subscriptionCreated = false) {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([
      { id: businessId, name: "Toko Billing", status: "ONBOARDING", created_at: "2024-01-01T00:00:00Z" },
    ])
  );
  localStorage.setItem("kopera_current_business", businessId);
  localStorage.setItem("kopera_current_location", "loc-1");
  if (subscriptionCreated) {
    // BusinessContext doesn't persist subscriptionCreated in localStorage by default, but we can test via state or hook
  }
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

describe("PART 20 — Dedicated Subscription & Billing UI", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders loading state then successful plan catalog and subscription creation CTA", async () => {
    await bootAuth(true);
    seedBusiness(BID);

    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify({ id: "1", email: "a@b.com" }), { status: 200 });
      }
      if (String(url).includes("/api/v1/billing/plans/")) {
        return new Response(JSON.stringify(MOCK_PLANS), { status: 200, headers: { "Content-Type": "application/json" } });
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

    await waitFor(() => expect(screen.getByTestId("billing-page")).toBeTruthy());
    expect(screen.getByText("Basic Plan")).toBeTruthy();
    expect(screen.getByText(/50000/)).toBeTruthy();
    expect(screen.getByTestId("create-subscription-cta")).toBeTruthy();
  });

  it("treats string amount as monetary value without producing NaN", async () => {
    await bootAuth(true);
    seedBusiness(BID);

    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify({ id: "1", email: "a@b.com" }), { status: 200 });
      }
      if (String(url).includes("/api/v1/billing/plans/")) {
        return new Response(JSON.stringify(MOCK_PLANS), { status: 200, headers: { "Content-Type": "application/json" } });
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

    await waitFor(() => expect(screen.getByTestId("plan-p1-amount")).toBeTruthy());
    const amountEl = screen.getByTestId("plan-p1-amount");
    expect(amountEl.textContent).not.toContain("NaN");
    expect(amountEl.textContent).toContain("50000.00");
  });

  it("invokes createSubscription(currentBusinessId) on CTA click and updates subscription state", async () => {
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
        return new Response(JSON.stringify(createdSub), { status: 201 });
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
    expect(screen.getByTestId("subscription-created-badge").textContent).not.toContain("ACTIVE");
  });
});
