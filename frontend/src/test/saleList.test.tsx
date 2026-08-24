import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider, useBusiness } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { SaleList } from "../pages/SaleList";

const BID = "11111111-1111-1111-1111-111111111111";
const OTHER_BID = "22222222-2222-2222-2222-222222222222";

function seedCurrentBusiness(businessId: string) {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([
      { id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" },
      { id: OTHER_BID, name: "Toko B", status: "ACTIVE", created_at: "2024-01-02T00:00:00Z" },
    ]),
  );
  localStorage.setItem("kopera_current_business", businessId);
  localStorage.setItem("kopera_current_location", "l1");
}

function renderList(businessId: string) {
  seedCurrentBusiness(businessId);
  return render(
    <MemoryRouter initialEntries={["/sales"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/sales" element={<SaleList />} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("SaleList", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("requests sales using the active business_id and renders the returned plain array", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/sales/`)) {
        return new Response(
          JSON.stringify([
            { id: "s1", business: BID, location: "l1", status: "DRAFT", lines: [], created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderList(BID);
    await waitFor(() => expect(screen.getByTestId("sale-list")).toBeTruthy());
    const calledForBiz = fetchMock.mock.calls.some((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID}/sales/`),
    );
    expect(calledForBiz).toBe(true);
  });

  it("shows a loading state while the request is in flight", async () => {
    await bootAuth(true);
    let resolve: (r: Response) => void = () => {};
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Promise<Response>((r) => (resolve = r));
    });
    (globalThis as any).fetch = fetchMock;
    renderList(BID);
    await waitFor(() => expect(screen.getByTestId("sale-list-loading")).toBeTruthy());
    resolve(new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } }));
  });

  it("handles an empty array with an empty state", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderList(BID);
    await waitFor(() => expect(screen.getByTestId("sale-list-empty")).toBeTruthy());
  });

  it("handles 404 gracefully with an error state", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/sales/`)) {
        return new Response("Not found", { status: 404 });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderList(BID);
    await waitFor(() => expect(screen.getByTestId("sale-list-error")).toBeTruthy());
  });

  it("renders a returned sale row", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/sales/`)) {
        return new Response(
          JSON.stringify([
            { id: "s1", business: BID, location: "l1", status: "DRAFT", lines: [], created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderList(BID);
    await waitFor(() => expect(screen.getByText("s1")).toBeTruthy());
  });

  it("reloads data and does not display previous business sales after context switch", async () => {
    await bootAuth(true);
    const saleByBiz: Record<string, unknown[]> = {
      [BID]: [
        { id: "sa", business: BID, location: "l1", status: "DRAFT", lines: [], created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
      ],
      [OTHER_BID]: [
        { id: "sb", business: OTHER_BID, location: "l2", status: "DRAFT", lines: [], created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
      ],
    };
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      const match = String(url).match(/\/api\/v1\/businesses\/([^/]+)\/sales\//);
      const biz = match ? match[1] : BID;
      return new Response(JSON.stringify(saleByBiz[biz] ?? []), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    (globalThis as any).fetch = fetchMock;
    localStorage.setItem(
      "kopera_businesses",
      JSON.stringify([
        { id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" },
        { id: OTHER_BID, name: "Toko B", status: "ACTIVE", created_at: "2024-01-02T00:00:00Z" },
      ]),
    );
    localStorage.setItem("kopera_current_business", BID);
    localStorage.setItem("kopera_current_location", "l1");
    function Harness() {
      const { selectBusiness } = useBusiness();
      return (
        <div>
          <button data-testid="switch-b" onClick={() => selectBusiness(OTHER_BID)}>
            switch-b
          </button>
          <SaleList />
        </div>
      );
    }
    render(
      <MemoryRouter initialEntries={["/sales"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/sales" element={<Harness />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText("sa")).toBeTruthy());
    screen.getByTestId("switch-b").click();
    await waitFor(() => expect(screen.queryByText("sa")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("sb")).toBeTruthy());
    const calledB = fetchMock.mock.calls.some((c) =>
      String(c[0]).includes(`/api/v1/businesses/${OTHER_BID}/sales/`) &&
      (c[1]?.method ?? "GET") === "GET",
    );
    expect(calledB).toBe(true);
  });
});
