import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { FinanceAccountCreate } from "../pages/FinanceAccountCreate";

const BID = "11111111-1111-1111-1111-111111111111";
const AID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

const created = {
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

function renderCreate() {
  seedContext();
  return render(
    <MemoryRouter initialEntries={["/finance/accounts/new"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/finance/accounts/new" element={<FinanceAccountCreate />} />
            <Route path="/finance/accounts" element={<div data-testid="account-list-nav" />} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("FinanceAccountCreate", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders create form with name and code fields", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response("{}", { status: 200 });
    });
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("finance-account-create-form")).toBeTruthy());
    expect(screen.getByTestId("finance-account-name-input")).toBeTruthy();
    expect(screen.getByTestId("finance-account-code-input")).toBeTruthy();
  });

  it("POSTs to the business-scoped accounts endpoint with name and code only", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/accounts/`) && (init?.method ?? "GET") === "POST") {
        return new Response(JSON.stringify(created), { status: 201, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("finance-account-name-input")).toBeTruthy());
    (screen.getByTestId("finance-account-name-input") as HTMLInputElement).value = "Kas";
    (screen.getByTestId("finance-account-code-input") as HTMLInputElement).value = "1000";
    screen.getByTestId("finance-account-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("account-list-nav")).toBeTruthy());
    const postCall = fetchMock.mock.calls.find((c) => String(c[0]).includes(`/api/v1/businesses/${BID}/accounts/`) && (c[1] as RequestInit)?.method === "POST");
    expect(postCall).toBeTruthy();
    const sent = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(sent).toEqual({ name: "Kas", code: "1000" });
    expect(sent.business).toBeUndefined();
  });

  it("shows a validation error when name is empty", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response("{}", { status: 200 });
    });
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("finance-account-create-form")).toBeTruthy());
    screen.getByTestId("finance-account-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("finance-account-create-error")).toBeTruthy());
    expect(screen.queryByTestId("account-list-nav")).toBeNull();
  });
});
