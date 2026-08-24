import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { PromotionCreate } from "../pages/PromotionCreate";

const BID = "11111111-1111-1111-1111-111111111111";

function seedContext() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([{ id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" }]),
  );
  localStorage.setItem("kopera_current_business", BID);
  localStorage.setItem("kopera_current_location", "l1");
}

function renderCreate() {
  seedContext();
  return render(
    <MemoryRouter initialEntries={["/promotions/new"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/promotions/new" element={<PromotionCreate />} />
            <Route path="/promotions" element={<div data-testid="promotion-list-nav">Navigated</div>} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

const validPromotion = {
  id: "p1",
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

describe("PromotionCreate", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the create form with all required fields", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("promotion-create-form")).toBeTruthy());
    expect(screen.getByTestId("promotion-name-input")).toBeTruthy();
    expect(screen.getByTestId("promotion-discount-type-input")).toBeTruthy();
    expect(screen.getByTestId("promotion-discount-value-input")).toBeTruthy();
    expect(screen.getByTestId("promotion-valid-from-input")).toBeTruthy();
    expect(screen.getByTestId("promotion-valid-to-input")).toBeTruthy();
    expect(screen.getByTestId("promotion-status-input")).toBeTruthy();
    expect(screen.getByTestId("promotion-applicability-input")).toBeTruthy();
    expect(screen.getByTestId("promotion-create-submit")).toBeTruthy();
  });

  it("rejects an empty name without calling the API", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("promotion-create-submit")).toBeTruthy());
    screen.getByTestId("promotion-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("promotion-create-error")).toBeTruthy());
    const calls = fetchMock.mock.calls.filter((c) => String(c[0]).includes(`/api/v1/businesses/${BID}/promotions/`));
    expect(calls.length).toBe(0);
  });

  it("submits a valid promotion and sends only writable fields (no business/id/timestamps)", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/promotions/`)) {
        expect(init?.method).toBe("POST");
        const body = JSON.parse(String(init?.body));
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
        expect(body.name).toBe("Promo A");
        return new Response(JSON.stringify(validPromotion), { status: 201, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("promotion-create-submit")).toBeTruthy());
    (screen.getByTestId("promotion-name-input") as HTMLInputElement).value = "Promo A";
    (screen.getByTestId("promotion-discount-value-input") as HTMLInputElement).value = "10.00";
    screen.getByTestId("promotion-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("promotion-list-nav")).toBeTruthy());
  });

  it("handles backend 400 name error", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/promotions/`)) {
        return new Response(
          JSON.stringify({ name: ["Name must not be empty or whitespace only."] }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("promotion-create-submit")).toBeTruthy());
    (screen.getByTestId("promotion-name-input") as HTMLInputElement).value = "Promo A";
    (screen.getByTestId("promotion-discount-value-input") as HTMLInputElement).value = "10.00";
    screen.getByTestId("promotion-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("promotion-create-error")).toBeTruthy());
  });

  it("handles backend 400 discount value error", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/promotions/`)) {
        return new Response(
          JSON.stringify({ discount_value: ["Discount value must be positive."] }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("promotion-create-submit")).toBeTruthy());
    (screen.getByTestId("promotion-name-input") as HTMLInputElement).value = "Promo A";
    (screen.getByTestId("promotion-discount-value-input") as HTMLInputElement).value = "10.00";
    screen.getByTestId("promotion-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("promotion-create-error")).toBeTruthy());
  });

  it("handles 401 gracefully by navigating to login", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/promotions/`)) {
        return new Response("Unauthorized", { status: 401 });
      }
      return new Response("Unauthorized", { status: 401 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });
});
