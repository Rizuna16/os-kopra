import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { OnlineStoreCreate } from "../pages/OnlineStoreCreate";

const BID = "11111111-1111-1111-1111-111111111111";
const LOC_ID = "loc-1111-1111-1111";

function seedCurrentBusiness(businessId: string) {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([
      { id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" },
    ]),
  );
  localStorage.setItem(
    "kopera_locations",
    JSON.stringify([
      { id: LOC_ID, business: BID, name: "Toko Utama", created_at: "2024-01-01T00:00:00Z" },
    ]),
  );
  localStorage.setItem("kopera_current_business", businessId);
  localStorage.setItem("kopera_current_location", LOC_ID);
}

function renderCreate(businessId: string) {
  seedCurrentBusiness(businessId);
  return render(
    <MemoryRouter initialEntries={["/stores/create"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/stores/create" element={<OnlineStoreCreate />} />
            <Route path="/stores" element={<div data-testid="store-list-redirect">Stores</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("OnlineStoreCreate UI component (/stores/create)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("submits create form with name, slug, default_location and redirects", async () => {
    await bootAuth(true);
    let createBody: any = null;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/online-stores/`) && init?.method === "POST") {
        createBody = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({ id: "store-1", business: BID, ...createBody, is_active: true }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;

    renderCreate(BID);

    await waitFor(() => expect(screen.getByTestId("store-create-form")).toBeTruthy());

    fireEvent.change(screen.getByTestId("store-name-input"), { target: { value: "Toko Baru" } });
    fireEvent.change(screen.getByTestId("store-slug-input"), { target: { value: "toko-baru" } });
    fireEvent.change(screen.getByTestId("store-location-select"), { target: { value: LOC_ID } });

    fireEvent.click(screen.getByTestId("store-submit-btn"));

    await waitFor(() => expect(screen.getByTestId("store-list-redirect")).toBeTruthy());
    expect(createBody).toEqual({
      name: "Toko Baru",
      slug: "toko-baru",
      default_location: LOC_ID,
    });
  });

  it("displays validation error when required fields are missing", async () => {
    await bootAuth(true);
    renderCreate(BID);

    await waitFor(() => expect(screen.getByTestId("store-create-form")).toBeTruthy());
    fireEvent.click(screen.getByTestId("store-submit-btn"));

    await waitFor(() => expect(screen.getByTestId("store-form-error")).toBeTruthy());
  });
});