import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { PromotionDetail } from "../pages/PromotionDetail";

const BID = "11111111-1111-1111-1111-111111111111";
const PID = "22222222-2222-2222-2222-222222222222";

const promotion = {
  id: PID,
  business: BID,
  name: "Promo A",
  discount_type: "PERCENTAGE",
  discount_value: "10.00",
  valid_from: "2024-01-01T00:00:00Z",
  valid_to: "2024-12-31T23:59:59Z",
  status: "ACTIVE",
  applicability: "BUSINESS_WIDE",
  target_product: null,
  target_variant: null,
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

function tree() {
  seedContext();
  return (
    <MemoryRouter initialEntries={[`/promotions/${PID}`]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/promotions/:promotionId" element={<PromotionDetail />} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("PromotionDetail", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows a loading state", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response(JSON.stringify(promotion), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    render(tree());
    expect(screen.getByTestId("promotion-detail-loading")).toBeTruthy();
  });

  it("loads the correct promotion by id and renders all fields", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/promotions/${PID}/`)) {
        return new Response(JSON.stringify(promotion), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    render(tree());
    await waitFor(() => expect(screen.getByTestId("promotion-detail")).toBeTruthy());
    expect(screen.getByTestId("promotion-detail-id").textContent).toBe(PID);
    expect(screen.getByTestId("promotion-detail-business").textContent).toBe(BID);
    expect(screen.getByTestId("promotion-detail-name").textContent).toBe("Promo A");
    expect(screen.getByTestId("promotion-detail-discount-type").textContent).toBe("PERCENTAGE");
    expect(screen.getByTestId("promotion-detail-discount-value").textContent).toBe("10.00");
    expect(screen.getByTestId("promotion-detail-status").textContent).toBe("ACTIVE");
    expect(screen.getByTestId("promotion-detail-applicability").textContent).toBe("BUSINESS_WIDE");
    const called = fetchMock.mock.calls.some((c) => String(c[0]).includes(`/api/v1/businesses/${BID}/promotions/${PID}/`));
    expect(called).toBe(true);
  });

  it("handles a generic error state on failure", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response("Server error", { status: 500 });
    });
    (globalThis as any).fetch = fetchMock;
    render(tree());
    await waitFor(() => expect(screen.getByTestId("promotion-detail-error")).toBeTruthy());
  });

  it("handles 401 gracefully by navigating to login", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response("Unauthorized", { status: 401 });
    });
    (globalThis as any).fetch = fetchMock;
    render(tree());
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });

  it("handles 404 gracefully with a generic error (no cross-tenant exposure)", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/promotions/${PID}/`)) {
        return new Response("Not found", { status: 404 });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    render(tree());
    await waitFor(() => expect(screen.getByTestId("promotion-detail-error")).toBeTruthy());
  });
});
