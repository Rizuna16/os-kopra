import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { OnlineStoreList } from "../pages/OnlineStoreList";

const BID = "11111111-1111-1111-1111-111111111111";

function seedCurrentBusiness(businessId: string) {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([
      { id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" },
    ]),
  );
  localStorage.setItem("kopera_current_business", businessId);
  localStorage.setItem("kopera_current_location", "l1");
}

function renderList(businessId: string) {
  seedCurrentBusiness(businessId);
  return render(
    <MemoryRouter initialEntries={["/stores"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/stores" element={<OnlineStoreList />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("OnlineStoreList UI component (/stores)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("lists merchant stores scoped by active business_id", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/online-stores/`)) {
        return new Response(
          JSON.stringify([
            { id: "store-1", business: BID, name: "Store A", slug: "store-a", default_location: "loc-1", is_active: true }
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    renderList(BID);

    await waitFor(() => expect(screen.getByTestId("store-list")).toBeTruthy());
    expect(screen.getByText("Store A")).toBeTruthy();
    expect(screen.getByText("store-a")).toBeTruthy();
  });

  it("handles empty store list state", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;

    renderList(BID);

    await waitFor(() => expect(screen.getByTestId("store-list-empty")).toBeTruthy());
  });

  it("handles store list load error state", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("Error", { status: 500 });
    });
    (globalThis as any).fetch = fetchMock;

    renderList(BID);

    await waitFor(() => expect(screen.getByTestId("store-list-error")).toBeTruthy());
  });
});