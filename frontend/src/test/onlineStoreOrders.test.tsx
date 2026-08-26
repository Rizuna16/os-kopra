import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { OnlineStoreOrders } from "../pages/OnlineStoreOrders";

const BID = "11111111-1111-1111-1111-111111111111";
const OID = "44444444-4444-4444-4444-444444444444";

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

function renderOrders(businessId: string, slug: string) {
  seedCurrentBusiness(businessId);
  return render(
    <MemoryRouter initialEntries={[`/stores/${slug}/orders`]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/stores/:slug/orders" element={<OnlineStoreOrders />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("OnlineStoreOrders UI component (/stores/:store_id/orders)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("lists online orders for the merchant store", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/stores/toko-makmur/orders/`)) {
        return new Response(
          JSON.stringify([
            { id: OID, status: "PENDING", guest_name: "John Doe", lines: [] }
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    renderOrders(BID, "toko-makmur");

    await waitFor(() => expect(screen.getByTestId("store-orders-list")).toBeTruthy());
    expect(screen.getByText("John Doe")).toBeTruthy();
  });
});