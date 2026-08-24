import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { PromotionEdit } from "../pages/PromotionEdit";

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

function renderEdit() {
  seedContext();
  return render(
    <MemoryRouter initialEntries={[`/promotions/${PID}/edit`]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/promotions/:promotionId/edit" element={<PromotionEdit />} />
            <Route path="/promotions/:promotionId" element={<div data-testid="promotion-detail-nav">Navigated</div>} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("PromotionEdit", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows a loading state while fetching", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response(JSON.stringify(promotion), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderEdit();
    expect(screen.getByTestId("promotion-edit-loading")).toBeTruthy();
  });

  it("loads the promotion and pre-fills the form", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/promotions/${PID}/`)) {
        return new Response(JSON.stringify(promotion), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("promotion-edit-form")).toBeTruthy());
    expect((screen.getByTestId("promotion-name-input") as HTMLInputElement).value).toBe("Promo A");
  });

  it("rejects empty name without calling the API", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/promotions/${PID}/`)) {
        return new Response(JSON.stringify(promotion), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("promotion-edit-submit")).toBeTruthy());
    (screen.getByTestId("promotion-name-input") as HTMLInputElement).value = "";
    screen.getByTestId("promotion-edit-submit").click();
    await waitFor(() => expect(screen.getByTestId("promotion-edit-error")).toBeTruthy());
    const calls = fetchMock.mock.calls.filter((c) => String(c[0]).includes(`/api/v1/businesses/${BID}/promotions/${PID}/`) && c[1]?.method === "PATCH");
    expect(calls.length).toBe(0);
  });

  it("submits a valid update via PATCH with only writable fields", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/promotions/${PID}/`)) {
        if (init?.method === "PATCH") {
          expect(init.method).toBe("PATCH");
          const body = JSON.parse(String(init.body));
          expect(Object.keys(body).sort()).toEqual([
            "applicability",
            "discount_type",
            "discount_value",
            "name",
            "status",
            "target_product",
            "target_variant",
            "valid_from",
            "valid_to",
          ]);
          expect(body).not.toHaveProperty("business");
          expect(body).not.toHaveProperty("id");
          expect(body).not.toHaveProperty("created_at");
          expect(body).not.toHaveProperty("updated_at");
          return new Response(JSON.stringify({ ...promotion, name: "Promo B" }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify(promotion), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("promotion-edit-submit")).toBeTruthy());
    (screen.getByTestId("promotion-name-input") as HTMLInputElement).value = "Promo B";
    (screen.getByTestId("promotion-discount-value-input") as HTMLInputElement).value = "10.00";
    screen.getByTestId("promotion-edit-submit").click();
    await waitFor(() => expect(screen.getByTestId("promotion-detail-nav")).toBeTruthy());
  });

  it("handles backend 400 error", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/promotions/${PID}/`) && init?.method === "PATCH") {
        return new Response(
          JSON.stringify({ discount_value: ["Discount value must be positive."] }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/promotions/${PID}/`)) {
        return new Response(JSON.stringify(promotion), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("promotion-edit-submit")).toBeTruthy());
    (screen.getByTestId("promotion-name-input") as HTMLInputElement).value = "Promo B";
    (screen.getByTestId("promotion-discount-value-input") as HTMLInputElement).value = "10.00";
    screen.getByTestId("promotion-edit-submit").click();
    await waitFor(() => expect(screen.getByTestId("promotion-edit-error")).toBeTruthy());
  });

  it("handles 401 gracefully by navigating to login", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes("/auth/token/refresh/")) return new Response("Unauthorized", { status: 401 });
      if (String(url).includes(`/api/v1/businesses/${BID}/promotions/${PID}/`)) {
        return new Response("Unauthorized", { status: 401 });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });
});
