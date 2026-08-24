import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { PromotionList } from "../pages/PromotionList";
import { PromotionCreate } from "../pages/PromotionCreate";
import { PromotionDetail } from "../pages/PromotionDetail";
import { PromotionEdit } from "../pages/PromotionEdit";
import { PromotionDelete } from "../pages/PromotionDelete";

const BID = "11111111-1111-1111-1111-111111111111";
const PID = "22222222-2222-2222-2222-222222222222";

function seedContext() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([{ id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" }]),
  );
  localStorage.setItem("kopera_current_business", BID);
  localStorage.setItem("kopera_current_location", "l1");
}

function renderPromotionList() {
  seedContext();
  return render(
    <MemoryRouter initialEntries={["/promotions"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/promotions" element={<PromotionList />} />
            <Route path="/promotions/new" element={<PromotionCreate />} />
            <Route path="/promotions/:promotionId" element={<PromotionDetail />} />
            <Route path="/promotions/:promotionId/edit" element={<PromotionEdit />} />
            <Route path="/promotions/:promotionId/delete" element={<PromotionDelete />} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("Promotion", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the list with loading state", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/promotions/`)) {
        return new Response(JSON.stringify([{ id: PID, name: "Promo A", discount_type: "PERCENTAGE", discount_value: "10.00", valid_from: "2024-01-01T00:00:00Z", valid_to: "2024-12-31T23:59:59Z", status: "ACTIVE", applicability: "BUSINESS_WIDE", target_product: null, target_variant: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderPromotionList();
    await waitFor(() => expect(screen.getByTestId("promotion-list")).toBeTruthy());
    await screen.findByText("Promo A");
  });

  it("shows a loading state", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderPromotionList();
    expect(screen.getByTestId("promotion-list-loading")).toBeTruthy();
  });

  it("shows empty state when no promotions", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderPromotionList();
    await waitFor(() => expect(screen.getByTestId("promotion-list-empty")).toBeTruthy());
  });

  it("handles API error with generic error state", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response("Server error", { status: 500 });
    });
    renderPromotionList();
    await waitFor(() => expect(screen.getByTestId("promotion-list-error")).toBeTruthy());
  });

  it("handles 401 gracefully by navigating to login", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response("Unauthorized", { status: 401 });
    });
    renderPromotionList();
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });

it("handles 404 gracefully with a generic error state", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/promotions/`)) {
        return new Response("Not found", { status: 404 });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderPromotionList();
    await waitFor(() => expect(screen.getByTestId("promotion-list-error")).toBeTruthy());
  });

  it("navigates to the correct detail route when a promotion name is clicked", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/promotions/`)) {
        return new Response(JSON.stringify([{ id: PID, name: "Promo A", discount_type: "PERCENTAGE", discount_value: "10.00", valid_from: "2024-01-01T00:00:00Z", valid_to: "2024-12-31T23:59:59Z", status: "ACTIVE", applicability: "BUSINESS_WIDE", target_product: null, target_variant: null, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderPromotionList();
    await waitFor(() => expect(screen.getByTestId("promotion-list")).toBeTruthy());
    const link = screen.getByRole("link", { name: "Promo A" });
    expect(link.getAttribute("href")).toBe(`/promotions/${PID}`);
    link.click();
    await screen.findByTestId("promotion-detail");
  });
});
