import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { FinanceAccountList } from "../pages/FinanceAccountList";
import { FinanceAccountCreate } from "../pages/FinanceAccountCreate";
import { FinanceAccountDetail } from "../pages/FinanceAccountDetail";
import { FinanceAccountEdit } from "../pages/FinanceAccountEdit";
import { FinanceExpenseList } from "../pages/FinanceExpenseList";
import { FinanceJournalList } from "../pages/FinanceJournalList";

const BID = "11111111-1111-1111-1111-111111111111";

const mockAccount = {
  id: "a1",
  name: "Cash",
  code: "1000",
  business: BID,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockJournal = {
  id: "j1",
  reference: "JE-001",
  memo: "Opening entry",
  status: "POSTED" as const,
  business: BID,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockExpense = {
  id: "e1",
  account: "a1",
  description: "Office supplies",
  amount: "50000",
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

function setupFetchMock() {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const u = String(url);
    const method = init?.method ?? "GET";
    if (u.includes("/auth/me/")) {
      return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (u.includes(`/api/v1/businesses/${BID}/accounts/`)) {
      if (method === "POST") {
        return new Response(JSON.stringify({ ...mockAccount, id: "new-id" }), { status: 201, headers: { "Content-Type": "application/json" } });
      }
      if (u.match(/\/accounts\/[^/]+\/?$/)) {
        return new Response(JSON.stringify(mockAccount), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify([mockAccount]), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (u.includes(`/api/v1/businesses/${BID}/journals/`)) {
      if (u.match(/\/journals\/[^/]+\/?$/)) {
        return new Response(JSON.stringify(mockJournal), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify([mockJournal]), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (u.includes(`/api/v1/businesses/${BID}/expenses/`)) {
      return new Response(JSON.stringify([mockExpense]), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response("[]", { status: 200 });
  });
}

describe("Finance — UI Normalization V1 RED contract", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("FinanceAccountList has baseline root, container, card, title, new button", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={["/finance/accounts"]}>
        <AuthProvider>
          <BusinessProvider>
            <FinanceAccountList />
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("finance-account-list")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="finance-account-list"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
    const newBtn = screen.getByText("New account");
    expect(newBtn).toHaveClass("py-3", "px-4", "bg-blue-600", "hover:bg-blue-700", "font-medium", "text-sm", "text-white", "rounded-xl", "shadow-sm", "transition-colors", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:ring-offset-2", "disabled:opacity-50", "disabled:cursor-not-allowed");
  });

  it("FinanceAccountCreate has baseline root, container, card, title, inputs, submit button", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={["/finance/accounts/new"]}>
        <AuthProvider>
          <BusinessProvider>
            <FinanceAccountCreate />
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("finance-account-create-form")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="finance-account-create-form"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();

    const nameInput = screen.getByTestId("finance-account-name-input");
    expect(nameInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");

    const codeInput = screen.getByTestId("finance-account-code-input");
    expect(codeInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");

    const submitBtn = screen.getByTestId("finance-account-create-submit");
    expect(submitBtn).toHaveClass("py-3", "px-4", "bg-blue-600", "hover:bg-blue-700", "font-medium", "text-sm", "text-white", "rounded-xl", "shadow-sm", "transition-colors", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:ring-offset-2", "disabled:opacity-50", "disabled:cursor-not-allowed");
  });

  it("FinanceAccountCreate shows normalized error", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url);
      const method = init?.method ?? "GET";
      if (u.includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (u.includes(`/api/v1/businesses/${BID}/accounts/`) && method === "POST") {
        return new Response(JSON.stringify({ errors: { name: ["Name is required"] } }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    seedContext();
    render(
      <MemoryRouter initialEntries={["/finance/accounts/new"]}>
        <AuthProvider>
          <BusinessProvider>
            <FinanceAccountCreate />
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("finance-account-create-form")).toBeTruthy());

    const submitBtn = screen.getByTestId("finance-account-create-submit");
    submitBtn.click();

    await waitFor(() => expect(screen.getByTestId("finance-account-create-error")).toBeTruthy());
    const err = screen.getByTestId("finance-account-create-error");
    expect(err).toHaveClass("text-sm", "text-red-600", "bg-red-50", "border", "border-red-100", "rounded-xl", "p-3", "sm:p-4");
  });

  it("FinanceAccountDetail has baseline root, container, card, title", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={[`/finance/accounts/${mockAccount.id}`]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/finance/accounts/:accountId" element={<FinanceAccountDetail />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("finance-account-detail")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="finance-account-detail"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
  });

  it("FinanceAccountEdit has baseline root, container, card, title, inputs, submit button", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={[`/finance/accounts/${mockAccount.id}/edit`]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/finance/accounts/:accountId/edit" element={<FinanceAccountEdit />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("finance-account-edit-form")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="finance-account-edit-form"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();

    const nameInput = screen.getByTestId("finance-account-name-input");
    expect(nameInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");

    const codeInput = screen.getByTestId("finance-account-code-input");
    expect(codeInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");

    const submitBtn = screen.getByTestId("finance-account-edit-submit");
    expect(submitBtn).toHaveClass("py-3", "px-4", "bg-blue-600", "hover:bg-blue-700", "font-medium", "text-sm", "text-white", "rounded-xl", "shadow-sm", "transition-colors", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:ring-offset-2", "disabled:opacity-50", "disabled:cursor-not-allowed");
  });

  it("FinanceAccountEdit shows normalized error", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url);
      const method = init?.method ?? "GET";
      if (u.includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (u.includes(`/api/v1/businesses/${BID}/accounts/`) && (method === "PATCH" || method === "PUT")) {
        return new Response(JSON.stringify({ errors: { name: ["Name is required"] } }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      if (u.includes(`/api/v1/businesses/${BID}/accounts/`)) {
        return new Response(JSON.stringify(mockAccount), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    seedContext();
    render(
      <MemoryRouter initialEntries={[`/finance/accounts/${mockAccount.id}/edit`]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/finance/accounts/:accountId/edit" element={<FinanceAccountEdit />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("finance-account-edit-form")).toBeTruthy());

    const submitBtn = screen.getByTestId("finance-account-edit-submit");
    submitBtn.click();

    await waitFor(() => expect(screen.getByTestId("finance-account-edit-error")).toBeTruthy());
    const err = screen.getByTestId("finance-account-edit-error");
    expect(err).toHaveClass("text-sm", "text-red-600", "bg-red-50", "border", "border-red-100", "rounded-xl", "p-3", "sm:p-4");
  });

  it("FinanceExpenseList has baseline root, container, card, title", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={["/finance/expenses"]}>
        <AuthProvider>
          <BusinessProvider>
            <FinanceExpenseList />
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("finance-expense-list")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="finance-expense-list"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
  });

  it("FinanceJournalList has baseline root, container, card, title", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={["/finance/journals"]}>
        <AuthProvider>
          <BusinessProvider>
            <FinanceJournalList />
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("finance-journal-list")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="finance-journal-list"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
  });
});