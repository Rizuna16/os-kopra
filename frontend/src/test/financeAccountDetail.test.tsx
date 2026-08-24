import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { FinanceAccountDetail } from "../pages/FinanceAccountDetail";

const BID = "11111111-1111-1111-1111-111111111111";
const AID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

const account = {
  id: AID,
  name: "Kas",
  code: "1000",
  business: BID,
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

function renderDetail() {
  seedContext();
  return render(
    <MemoryRouter initialEntries={[`/finance/accounts/${AID}`]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/finance/accounts/:accountId" element={<FinanceAccountDetail />} />
            <Route path="/finance/accounts" element={<div data-testid="account-list-nav" />} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("FinanceAccountDetail", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("fetches the account by id and renders its fields", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/api/v1/businesses/${BID}/accounts/${AID}/`)) return new Response(JSON.stringify(account), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("finance-account-detail")).toBeTruthy());
    expect(screen.getByText("Kas")).toBeTruthy();
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes(`/api/v1/businesses/${BID}/accounts/${AID}/`))).toBe(true);
  });

  it("shows a loading state", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response(JSON.stringify(account), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderDetail();
    expect(screen.getByTestId("finance-account-detail-loading")).toBeTruthy();
  });

  it("handles a 404 gracefully with an error state", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/api/v1/businesses/${BID}/accounts/${AID}/`)) return new Response("Not found", { status: 404 });
      return new Response("{}", { status: 200 });
    });
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("finance-account-detail-error")).toBeTruthy());
  });
});
