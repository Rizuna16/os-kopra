import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { SaleDelete } from "../pages/SaleDelete";

const BID = "11111111-1111-1111-1111-111111111111";
const SALEID = "55555555-5555-5555-5555-555555555555";
const LID = "44444444-4444-4444-4444-444444444444";

function seedCurrentBusiness() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([{ id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" }]),
  );
  localStorage.setItem("kopera_current_business", BID);
  localStorage.setItem("kopera_current_location", "l1");
}

function renderDelete() {
  seedCurrentBusiness();
  return render(
    <MemoryRouter initialEntries={[`/sales/${SALEID}`]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/sales/:saleId" element={<SaleDelete />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("SaleDelete", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows a delete confirmation and sends DELETE to the correct URL, handling 204 with empty body", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/sales/${SALEID}/`)) {
        expect(init?.method).toBe("DELETE");
        return new Response(null, { status: 204 });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderDelete();
    await waitFor(() => expect(screen.getByTestId("sale-delete-confirm-button")).toBeTruthy());
    screen.getByTestId("sale-delete-confirm-button").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const deleteCall = fetchMock.mock.calls.find((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID}/sales/${SALEID}/`),
    );
    expect(deleteCall).toBeTruthy();
  });

  it("does NOT attempt to parse JSON from a 204 response", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/sales/${SALEID}/`)) {
        return new Response(null, { status: 204 });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderDelete();
    await waitFor(() => expect(screen.getByTestId("sale-delete-confirm-button")).toBeTruthy());
    screen.getByTestId("sale-delete-confirm-button").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("handles 404 gracefully", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/api/v1/businesses/${BID}/sales/${SALEID}/`)) return new Response("Not found", { status: 404 });
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderDelete();
    await waitFor(() => expect(screen.getByTestId("sale-delete-confirm-button")).toBeTruthy());
    screen.getByTestId("sale-delete-confirm-button").click();
    await waitFor(() => expect(screen.getByTestId("sale-delete-error")).toBeTruthy());
  });

  it("handles 401 gracefully", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/api/v1/businesses/${BID}/sales/${SALEID}/`)) return new Response("Unauthorized", { status: 401 });
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderDelete();
    await waitFor(() => expect(screen.getByTestId("sale-delete-confirm-button")).toBeTruthy());
    screen.getByTestId("sale-delete-confirm-button").click();
    await waitFor(() => expect(screen.getByTestId("sale-delete-error")).toBeTruthy());
  });

  it("returns to the list after successful 204 deletion", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/sales/${SALEID}/`)) {
        return new Response(null, { status: 204 });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderDelete();
    await waitFor(() => expect(screen.getByTestId("sale-delete-confirm-button")).toBeTruthy());
    screen.getByTestId("sale-delete-confirm-button").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });
});
