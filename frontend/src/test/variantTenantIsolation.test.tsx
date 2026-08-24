import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider, useBusiness } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { VariantList } from "../pages/VariantList";

const BID_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const BID_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const PID = "22222222-2222-2222-2222-222222222222";
const LOC_A1 = "loc-a1-a1-a1-a1-a1a1a1a1a1a1";
const LOC_B1 = "loc-b1-b1-b1-b1-b1b1b1b1b1b1";

const VARIANT_A = {
  id: "va",
  product: PID,
  name: "Variant A",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};
const VARIANT_B = {
  id: "vb",
  product: PID,
  name: "Variant B",
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
        <button data-testid="switch-b" onClick={() => b.selectBusiness(BID_B)}>
          switch-b
        </button>
        <VariantList />
      </div>
    );
  }

  return render(
    <MemoryRouter initialEntries={[`/products/${PID}/variants`]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/products/:productId/variants" element={<Harness />} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("Variant tenant isolation", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("uses currentBusinessId for Variant list, then reloads with new Business after switching", async () => {
    await bootAuth(true);
    const variantByBiz: Record<string, unknown[]> = {
      [BID_A]: [VARIANT_A],
      [BID_B]: [VARIANT_B],
    };
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      const m = String(url).match(/\/api\/v1\/businesses\/([^/]+)\/products\/[^/]+\/variants\//);
      const biz = m ? m[1] : BID_A;
      return new Response(JSON.stringify(variantByBiz[biz] ?? []), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;

    renderWithSwitch();

    await waitFor(() => expect(screen.getByText("Variant A")).toBeTruthy());
    const calledA = fetchMock.mock.calls.some((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID_A}/products/${PID}/variants/`) ||
      String(c[0]).includes(`/api/v1/businesses/${BID_A}/products/${PID}/variants/`.replace("/api/v1", "")),
    );
    expect(calledA).toBe(true);

    screen.getByTestId("switch-b").click();

    await waitFor(() => expect(screen.queryByText("Variant A")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Variant B")).toBeTruthy());
    const calledB = fetchMock.mock.calls.some((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID_B}/products/${PID}/variants/`),
    );
    expect(calledB).toBe(true);
  });

  it("never keeps stale Business A variant visible after switching", async () => {
    await bootAuth(true);
    const variantByBiz: Record<string, unknown[]> = {
      [BID_A]: [VARIANT_A],
      [BID_B]: [VARIANT_B],
    };
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      const m = String(url).match(/\/api\/v1\/businesses\/([^/]+)\/products\/[^/]+\/variants\//);
      const biz = m ? m[1] : BID_A;
      return new Response(JSON.stringify(variantByBiz[biz] ?? []), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;

    renderWithSwitch();
    await waitFor(() => expect(screen.getByText("Variant A")).toBeTruthy());
    screen.getByTestId("switch-b").click();
    await waitFor(() => expect(screen.queryByText("Variant A")).not.toBeInTheDocument());
  });
});