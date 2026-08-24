import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { StockDetail } from "../pages/StockDetail";

const SID = "ssssssss-ssss-ssss-ssss-ssssssssssss";
const LOC = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const VID = "vvvvvvvv-vvvv-vvvv-vvvv-vvvvvvvvvvvv";

function seedContext() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([{ id: "11111111-1111-1111-1111-111111111111", name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" }]),
  );
  localStorage.setItem("kopera_current_business", "11111111-1111-1111-1111-111111111111");
  localStorage.setItem("kopera_current_location", LOC);
}

function renderDetail() {
  seedContext();
  return render(
    <MemoryRouter initialEntries={[`/inventory/stocks/${SID}`]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/inventory/stocks/:stockId" element={<StockDetail />} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function stockResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: SID,
    location: LOC,
    variant: VID,
    quantity: "100.00",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("StockDetail", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("loads the exact stock ID using the special /api/stocks/ path (no /v1/)", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/stocks/${SID}/`)) {
        return new Response(JSON.stringify(stockResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("stock-detail")).toBeTruthy());
    const called = fetchMock.mock.calls.some(
      (c) => String(c[0]).includes(`/api/stocks/${SID}/`) && !String(c[0]).includes("/api/v1/stocks/"),
    );
    expect(called).toBe(true);
  });

  it("renders id, location, variant, quantity and timestamps", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/api/stocks/${SID}/`)) return new Response(JSON.stringify(stockResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200 });
    });
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("stock-detail")).toBeTruthy());
    expect(screen.getByTestId("stock-id").textContent).toBe(SID);
    expect(screen.getByTestId("stock-location").textContent).toBe(LOC);
    expect(screen.getByTestId("stock-variant").textContent).toBe(VID);
    expect(screen.getByTestId("stock-quantity").textContent).toBe("100.00");
  });

  it("renders a negative quantity without coercing to positive", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/api/stocks/${SID}/`)) return new Response(JSON.stringify(stockResponse({ quantity: "-3.00" })), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200 });
    });
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("stock-quantity").textContent).toBe("-3.00"));
  });

  it("handles 401 by redirecting to login", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/api/stocks/${SID}/`)) return new Response("Unauthorized", { status: 401 });
      return new Response("[]", { status: 200 });
    });
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });

  it("handles 404 gracefully", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/api/stocks/${SID}/`)) return new Response("Not found", { status: 404 });
      return new Response("[]", { status: 200 });
    });
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("stock-detail-error")).toBeTruthy());
  });
});
