import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { OnlineStoreProductList } from "../pages/OnlineStoreProductList";

const BID = "11111111-1111-1111-1111-111111111111";
const SID = "22222222-2222-2222-2222-222222222222";
const PID = "33333333-3333-3333-3333-333333333333";

function seedCurrentBusiness(businessId: string) {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([
      { id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" },
    ]),
  );
  localStorage.setItem("kopera_current_business", businessId);
  localStorage.setItem("kopera_current_location", "loc-1");
}

function renderProductList(businessId: string, storeId: string) {
  seedCurrentBusiness(businessId);
  return render(
    <MemoryRouter initialEntries={[`/stores/${storeId}/products`]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/stores/:storeId/products" element={<OnlineStoreProductList />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("OnlineStoreProductList UI component (/stores/:store_id/products)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("lists products and publishing states for store", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/products/`)) {
        return new Response(
          JSON.stringify([{ id: PID, name: "Beras 5kg", price: 55000, business: BID }]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/online-stores/${SID}/products/`)) {
        return new Response(
          JSON.stringify([{ id: "link-1", online_store: SID, product: PID, is_published: true }]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;

    renderProductList(BID, SID);

    await waitFor(() => expect(screen.getByTestId("store-product-list")).toBeTruthy());
    expect(screen.getByText("Beras 5kg")).toBeTruthy();
    expect(screen.getByTestId(`publish-toggle-${PID}`)).toBeTruthy();
  });

  it("toggles publishing status when clicked", async () => {
    await bootAuth(true);
    let patched = false;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/products/`)) {
        return new Response(
          JSON.stringify([{ id: PID, name: "Beras 5kg", price: 55000, business: BID }]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/online-stores/${SID}/products/`)) {
        if (init?.method === "PATCH") {
          patched = true;
          return new Response(
            JSON.stringify({ id: "link-1", online_store: SID, product: PID, is_published: false }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify([{ id: "link-1", online_store: SID, product: PID, is_published: true }]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;

    renderProductList(BID, SID);

    await waitFor(() => expect(screen.getByTestId(`publish-toggle-${PID}`)).toBeTruthy());
    fireEvent.click(screen.getByTestId(`publish-toggle-${PID}`));

    await waitFor(() => expect(patched).toBe(true));
  });
});