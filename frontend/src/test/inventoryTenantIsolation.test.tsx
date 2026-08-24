import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider, useBusiness } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { StockList } from "../pages/StockList";

const BID_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const BID_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const LOC_A1 = "loc-a1-a1-a1-a1-a1a1a1a1a1a1";
const LOC_B1 = "loc-b1-b1-b1-b1-b1b1b1b1b1b1";

const STOCK_A = {
  id: "sa",
  location: LOC_A1,
  variant: "va",
  quantity: "100.00",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};
const STOCK_B = {
  id: "sb",
  location: LOC_B1,
  variant: "vb",
  quantity: "50.00",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

function renderWithSwitch() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([
      { id: BID_A, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" },
      { id: BID_B, name: "Toko B", status: "ACTIVE", created_at: "2024-01-02T00:00:00Z" },
    ]),
  );
  localStorage.setItem("kopera_current_business", BID_A);
  localStorage.setItem("kopera_current_location", LOC_A1);

  function Harness() {
    const b = useBusiness();
    return (
      <div>
        <div data-testid="ctx-biz">{b.currentBusinessId}</div>
        <div data-testid="ctx-loc">{b.currentLocationId}</div>
        <button data-testid="switch-b" onClick={() => b.selectBusiness(BID_B)}>
          switch-b
        </button>
        <StockList />
      </div>
    );
  }

  return render(
    <MemoryRouter initialEntries={["/inventory/stocks"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/inventory/stocks" element={<Harness />} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("Inventory tenant isolation", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("uses currentBusinessId and currentLocationId for Stock list, then reloads with new Business after switching", async () => {
    await bootAuth(true);
    const stockByBiz: Record<string, unknown[]> = {
      [BID_A]: [STOCK_A],
      [BID_B]: [STOCK_B],
    };
    const locationsByBiz: Record<string, unknown[]> = {
      [BID_A]: [{ id: LOC_A1, name: "Gudang A1" }],
      [BID_B]: [{ id: LOC_B1, name: "Gudang B1" }],
    };
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (
        String(url).includes("/businesses/") &&
        String(url).includes("/locations/") &&
        !String(url).includes("/stocks/")
      ) {
        const m = String(url).match(/\/businesses\/([^/]+)\/locations\//);
        const biz = m ? m[1] : BID_A;
        return new Response(JSON.stringify(locationsByBiz[biz] ?? []), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      const m = String(url).match(/\/api\/v1\/businesses\/([^/]+)\/locations\/([^/]+)\/stocks\//);
      const biz = m ? m[1] : BID_A;
      return new Response(JSON.stringify(stockByBiz[biz] ?? []), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;

    renderWithSwitch();

    await waitFor(() => expect(screen.getByText("100.00")).toBeTruthy());
    const calledA = fetchMock.mock.calls.some((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID_A}/locations/`),
    );
    expect(calledA).toBe(true);

    screen.getByTestId("switch-b").click();

    await waitFor(() => expect(screen.queryByText("100.00")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("50.00")).toBeTruthy());
    const calledB = fetchMock.mock.calls.some((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID_B}/locations/`),
    );
    expect(calledB).toBe(true);
  });

  it("never keeps stale Business A stock visible after switching", async () => {
    await bootAuth(true);
    const stockByBiz: Record<string, unknown[]> = {
      [BID_A]: [STOCK_A],
      [BID_B]: [STOCK_B],
    };
    const locationsByBiz: Record<string, unknown[]> = {
      [BID_A]: [{ id: LOC_A1, name: "Gudang A1" }],
      [BID_B]: [{ id: LOC_B1, name: "Gudang B1" }],
    };
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (
        String(url).includes("/businesses/") &&
        String(url).includes("/locations/") &&
        !String(url).includes("/stocks/")
      ) {
        const m = String(url).match(/\/businesses\/([^/]+)\/locations\//);
        const biz = m ? m[1] : BID_A;
        return new Response(JSON.stringify(locationsByBiz[biz] ?? []), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      const m = String(url).match(/\/api\/v1\/businesses\/([^/]+)\/locations\/([^/]+)\/stocks\//);
      const biz = m ? m[1] : BID_A;
      return new Response(JSON.stringify(stockByBiz[biz] ?? []), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;

    renderWithSwitch();
    await waitFor(() => expect(screen.getByText("100.00")).toBeTruthy());
    screen.getByTestId("switch-b").click();
    await waitFor(() => expect(screen.queryByText("100.00")).not.toBeInTheDocument());
  });
});
