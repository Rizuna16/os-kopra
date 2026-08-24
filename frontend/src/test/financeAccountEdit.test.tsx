import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { FinanceAccountEdit } from "../pages/FinanceAccountEdit";

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

function renderEdit() {
  seedContext();
  return render(
    <MemoryRouter initialEntries={[`/finance/accounts/${AID}/edit`]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/finance/accounts/:accountId/edit" element={<FinanceAccountEdit />} />
            <Route path="/finance/accounts/:accountId" element={<div data-testid="account-detail-nav" />} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("FinanceAccountEdit", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("fetches the account and populates name and code fields", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/api/v1/businesses/${BID}/accounts/${AID}/`)) return new Response(JSON.stringify(account), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("finance-account-edit-form")).toBeTruthy());
    expect((screen.getByTestId("finance-account-name-input") as HTMLInputElement).value).toBe("Kas");
    expect((screen.getByTestId("finance-account-code-input") as HTMLInputElement).value).toBe("1000");
  });

  it("sends PUT to the correct endpoint with updated fields", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/api/v1/businesses/${BID}/accounts/${AID}/`)) {
        if ((init?.method ?? "GET") === "PUT") return new Response(JSON.stringify({ ...account, name: "Bank" }), { status: 200, headers: { "Content-Type": "application/json" } });
        return new Response(JSON.stringify(account), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("finance-account-edit-form")).toBeTruthy());
    const nameInput = screen.getByTestId("finance-account-name-input") as HTMLInputElement;
    nameInput.value = "";
    nameInput.dispatchEvent(new Event("input", { bubbles: true }));
    nameInput.value = "Bank";
    nameInput.dispatchEvent(new Event("input", { bubbles: true }));
    screen.getByTestId("finance-account-edit-submit").click();
    await waitFor(() => {
      const putCall = fetchMock.mock.calls.find((c) => String(c[0]).includes(`/api/v1/businesses/${BID}/accounts/${AID}/`) && (c[1] as RequestInit)?.method === "PUT");
      expect(putCall).toBeTruthy();
    });
  });

  it("shows validation error when name is empty", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/api/v1/businesses/${BID}/accounts/${AID}/`)) return new Response(JSON.stringify(account), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("finance-account-edit-form")).toBeTruthy());
    const nameInput = screen.getByTestId("finance-account-name-input") as HTMLInputElement;
    nameInput.value = "";
    nameInput.dispatchEvent(new Event("input", { bubbles: true }));
    screen.getByTestId("finance-account-edit-submit").click();
    await waitFor(() => expect(screen.getByTestId("finance-account-edit-error")).toBeTruthy());
  });
});
