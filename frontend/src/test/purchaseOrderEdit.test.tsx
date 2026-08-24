import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { PurchaseOrderEdit } from "../pages/PurchaseOrderEdit";

const BID = "11111111-1111-1111-1111-111111111111";
const POID = "55555555-5555-5555-5555-555555555555";
const SID = "33333333-3333-3333-3333-333333333333";
const LID = "44444444-4444-4444-4444-444444444444";
const VID = "66666666-6666-6666-6666-666666666666";

function seedCurrentBusiness() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([{ id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" }]),
  );
  localStorage.setItem("kopera_current_business", BID);
  localStorage.setItem("kopera_current_location", "l1");
}

function renderEdit() {
  seedCurrentBusiness();
  return render(
    <MemoryRouter initialEntries={[`/purchasing/${POID}/edit`]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/purchasing/:poId/edit" element={<PurchaseOrderEdit />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function poResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: POID,
    business: BID,
    supplier: SID,
    location: LID,
    status: "DRAFT",
    lines: [
      { id: "l1", variant: VID, quantity: 10, unit_price: 5000, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
    ],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("PurchaseOrderEdit", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("loads the purchase order and renders the edit form", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response(JSON.stringify(poResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("purchase-order-edit-form")).toBeTruthy());
    expect(screen.getByTestId("purchase-order-edit-submit")).toBeTruthy();
  });

  it("sends PATCH to the correct URL with provided fields", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/purchase-orders/${POID}/`)) {
        if (init?.method === "PATCH") {
          expect(init?.method).toBe("PATCH");
          const body = JSON.parse(String(init?.body));
          expect(body).toHaveProperty("status", "CONFIRMED");
          expect(body).not.toHaveProperty("business");
          expect(body).not.toHaveProperty("id");
          return new Response(JSON.stringify({ ...poResponse(), status: "CONFIRMED" }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify(poResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify(poResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("purchase-order-edit-submit")).toBeTruthy());
    screen.getByTestId("purchase-order-edit-status-select").textContent = "CONFIRMED";
    screen.getByTestId("purchase-order-edit-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("sends only partial fields without forcing supplier/location when unchanged", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/purchase-orders/${POID}/`)) {
        if (init?.method === "PATCH") {
          const body = JSON.parse(String(init?.body));
          expect(Object.keys(body).sort()).toEqual(["status"]);
          return new Response(JSON.stringify({ ...poResponse(), status: "CONFIRMED" }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify(poResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify(poResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("purchase-order-edit-submit")).toBeTruthy());
    screen.getByTestId("purchase-order-edit-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("replaces lines entirely when lines are sent in the PATCH", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/purchase-orders/${POID}/`)) {
        if (init?.method === "PATCH") {
          const body = JSON.parse(String(init?.body));
          expect(Array.isArray(body.lines)).toBe(true);
          expect(body.lines).toHaveLength(1);
          expect(body.lines[0]).toHaveProperty("variant", VID);
          expect(body.lines[0]).toHaveProperty("quantity", 5);
          return new Response(
            JSON.stringify({ ...poResponse(), lines: [{ id: "l2", variant: VID, quantity: 5, unit_price: 7000, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }] }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(JSON.stringify(poResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify(poResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("purchase-order-edit-submit")).toBeTruthy());
    screen.getByTestId("purchase-order-edit-line-quantity-input").textContent = "5";
    screen.getByTestId("purchase-order-edit-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("handles backend 400 field validation errors", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/purchase-orders/${POID}/`)) {
        if (init?.method === "PATCH") {
          return new Response(
            JSON.stringify({ lines: ["Invalid variant."] }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(JSON.stringify(poResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify(poResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("purchase-order-edit-submit")).toBeTruthy());
    screen.getByTestId("purchase-order-edit-submit").click();
    await waitFor(() => expect(screen.getByTestId("purchase-order-edit-error")).toBeTruthy());
  });

  it("handles 404 gracefully", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/api/v1/businesses/${BID}/purchase-orders/${POID}/`)) return new Response("Not found", { status: 404 });
      return new Response(JSON.stringify(poResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("purchase-order-edit-error")).toBeTruthy());
  });
});
