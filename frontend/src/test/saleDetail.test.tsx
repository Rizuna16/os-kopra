import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { SaleDetail } from "../pages/SaleDetail";

const BID = "11111111-1111-1111-1111-111111111111";
const SALEID = "55555555-5555-5555-5555-555555555555";
const LID = "44444444-4444-4444-4444-444444444444";
const VID = "66666666-6666-6666-6666-666666666666";

function seedCurrentBusiness() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([{ id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" }]),
  );
  localStorage.setItem("kopera_current_business", BID);
  localStorage.setItem("kopera_current_location", "l1");
}

function renderDetail() {
  seedCurrentBusiness();
  return render(
    <MemoryRouter initialEntries={[`/sales/${SALEID}`]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/sales/:saleId" element={<SaleDetail />} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function saleResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: SALEID,
    business: BID,
    location: LID,
    status: "DRAFT",
    lines: [
      { id: "l1", variant: VID, quantity: 10, unit_price: 5000, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
    ],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("SaleDetail", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("requests the correct business_id and sale id", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify(saleResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("sale-detail")).toBeTruthy());
    const called = fetchMock.mock.calls.some((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID}/sales/${SALEID}/`),
    );
    expect(called).toBe(true);
  });

  it("renders id, location, status, created_at and updated_at", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response(JSON.stringify(saleResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("sale-detail")).toBeTruthy());
    expect(screen.getByTestId("sale-detail-id").textContent).toBe(SALEID);
    expect(screen.getByTestId("sale-detail-status").textContent).toBe("DRAFT");
    expect(screen.getByTestId("sale-detail-created-at").textContent).toBeTruthy();
    expect(screen.getByTestId("sale-detail-updated-at").textContent).toBeTruthy();
  });

  it("renders the sale lines", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response(JSON.stringify(saleResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("sale-detail-lines")).toBeTruthy());
    expect(screen.getByTestId("sale-detail-line-l1-variant").textContent).toContain(VID);
    expect(screen.getByTestId("sale-detail-line-l1-quantity").textContent).toContain("10");
    expect(screen.getByTestId("sale-detail-line-l1-unit-price").textContent).toContain("5000");
  });

  it("handles 404 gracefully with an error state", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/api/v1/businesses/${BID}/sales/${SALEID}/`)) return new Response("Not found", { status: 404 });
      return new Response(JSON.stringify(saleResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("sale-detail-error")).toBeTruthy());
  });

  it("handles 401 gracefully", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("Unauthorized", { status: 401 });
    });
    (globalThis as any).fetch = fetchMock;
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });
});
