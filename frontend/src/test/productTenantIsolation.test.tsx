import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider, useBusiness } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { ProductList } from "../pages/ProductList";

const BID_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const BID_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const PRODUCT_A = {
  id: "pa",
  name: "Produk A",
  price: 1,
  business: BID_A,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};
const PRODUCT_B = {
  id: "pb",
  name: "Produk B",
  price: 2,
  business: BID_B,
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
  localStorage.setItem("kopera_current_location", "l1");

  function Harness() {
    const b = useBusiness();
    return (
      <div>
        <div data-testid="ctx">{b.currentBusinessId}</div>
        <button data-testid="switch-b" onClick={() => b.selectBusiness(BID_B)}>
          switch-b
        </button>
        <ProductList />
      </div>
    );
  }

  return render(
    <MemoryRouter initialEntries={["/products"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/products" element={<Harness />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("Product tenant isolation", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("Business A shows Product A, then after switching to Business B removes Product A and loads Product B using B id", async () => {
    await bootAuth(true);
    const productsByBiz: Record<string, unknown[]> = {
      [BID_A]: [PRODUCT_A],
      [BID_B]: [PRODUCT_B],
    };
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      const m = String(url).match(/\/api\/v1\/businesses\/([^/]+)\/products\//);
      const biz = m ? m[1] : BID_A;
      return new Response(JSON.stringify(productsByBiz[biz] ?? []), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    (globalThis as any).fetch = fetchMock;

    renderWithSwitch();

    await waitFor(() => expect(screen.getByText("Produk A")).toBeTruthy());
    const calledA = fetchMock.mock.calls.some((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID_A}/products/`),
    );
    expect(calledA).toBe(true);

    screen.getByTestId("switch-b").click();

    await waitFor(() => expect(screen.queryByText("Produk A")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Produk B")).toBeTruthy());

    const calledB = fetchMock.mock.calls.some((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID_B}/products/`),
    );
    expect(calledB).toBe(true);
    expect(screen.queryByText("Produk A")).toBeNull();
  });

  it("never keeps a stale Product A visible after switching business context", async () => {
    await bootAuth(true);
    const productsByBiz: Record<string, unknown[]> = {
      [BID_A]: [PRODUCT_A],
      [BID_B]: [PRODUCT_B],
    };
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      const m = String(url).match(/\/api\/v1\/businesses\/([^/]+)\/products\//);
      const biz = m ? m[1] : BID_A;
      return new Response(JSON.stringify(productsByBiz[biz] ?? []), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    (globalThis as any).fetch = fetchMock;

    renderWithSwitch();
    await waitFor(() => expect(screen.getByText("Produk A")).toBeTruthy());
    screen.getByTestId("switch-b").click();
    await waitFor(() => expect(screen.queryByText("Produk A")).not.toBeInTheDocument());
  });
});
