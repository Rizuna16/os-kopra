import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider, useBusiness } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { FinanceJournalList } from "../pages/FinanceJournalList";

const BID = "11111111-1111-1111-1111-111111111111";
const JID = "jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj";

const journal = {
  id: JID,
  reference: "JRN-1",
  memo: "Memo",
  status: "DRAFT",
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

function renderList() {
  seedContext();
  return render(
    <MemoryRouter initialEntries={["/finance/journals"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/finance/journals" element={<FinanceJournalList />} />
            <Route
              path="/finance/journals/:journalId"
              element={<div data-testid="journal-detail-nav">{JID}</div>}
            />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("FinanceJournalList", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("requests journals for the active business and renders the array", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/api/v1/businesses/${BID}/journals/`)) return new Response(JSON.stringify([journal]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderList();
    await waitFor(() => expect(screen.getByTestId("finance-journal-list")).toBeTruthy());
    expect(screen.getByText("JRN-1")).toBeTruthy();
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes(`/api/v1/businesses/${BID}/journals/`))).toBe(true);
  });

  it("shows a loading state", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response(JSON.stringify([journal]), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderList();
    expect(screen.getByTestId("finance-journal-list-loading")).toBeTruthy();
  });

  it("handles an empty array with an empty state", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderList();
    await waitFor(() => expect(screen.getByTestId("finance-journal-list-empty")).toBeTruthy());
  });

  it("handles an API error with a generic error state", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("Server error", { status: 500 });
    });
    renderList();
    await waitFor(() => expect(screen.getByTestId("finance-journal-list-error")).toBeTruthy());
  });

  it("handles 401 gracefully by navigating to login", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("Unauthorized", { status: 401 });
    });
    renderList();
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });

  it("reloads data and does not display previous business journals after context switch", async () => {
    await bootAuth(true);
    const BID_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const BID_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    const journalA = { ...journal, id: "ja", business: BID_A, reference: "JRN-A" };
    const journalB = { ...journal, id: "jb", business: BID_B, reference: "JRN-B" };
    const byBiz: Record<string, unknown[]> = { [BID_A]: [journalA], [BID_B]: [journalB] };
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      const m = String(url).match(/\/api\/v1\/businesses\/([^/]+)\/journals\//);
      const biz = m ? m[1] : BID_A;
      return new Response(JSON.stringify(byBiz[biz] ?? []), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    localStorage.setItem("kopera_businesses", JSON.stringify([
      { id: BID_A, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" },
      { id: BID_B, name: "Toko B", status: "ACTIVE", created_at: "2024-01-02T00:00:00Z" },
    ]));
    localStorage.setItem("kopera_current_business", BID_A);
    localStorage.setItem("kopera_current_location", "l1");

    function Harness() {
      const b = useBusiness();
      return (
        <div>
          <button data-testid="switch-b" onClick={() => b.selectBusiness(BID_B)}>switch-b</button>
          <FinanceJournalList />
        </div>
      );
    }

    render(
      <MemoryRouter initialEntries={["/finance/journals"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/finance/journals" element={<Harness />} />
              <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("JRN-A")).toBeTruthy());
    screen.getByTestId("switch-b").click();
    await waitFor(() => expect(screen.queryByText("JRN-A")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("JRN-B")).toBeTruthy());
    expect(screen.queryByText("JRN-A")).toBeNull();
  });
});