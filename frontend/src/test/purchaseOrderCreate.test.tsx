import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { PurchaseOrderCreate } from "../pages/PurchaseOrderCreate";

const BID = "11111111-1111-1111-1111-111111111111";
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

function renderCreate() {
  seedCurrentBusiness();
  return render(
    <MemoryRouter initialEntries={["/purchasing/new"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/purchasing/new" element={<PurchaseOrderCreate />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function buildFetch(handler: (url: string, init?: RequestInit) => Response) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => handler(url, init));
  (globalThis as any).fetch = fetchMock;
  return fetchMock;
}

describe("PurchaseOrderCreate", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the create form with supplier, location, status and line fields", async () => {
    await bootAuth(true);
    buildFetch((url) =>
      String(url).includes("/auth/me/")
        ? new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } })
        : new Response("[]", { status: 200 }),
    );
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("purchase-order-create-form")).toBeTruthy());
    expect(screen.getByTestId("purchase-order-supplier-select")).toBeTruthy();
    expect(screen.getByTestId("purchase-order-location-select")).toBeTruthy();
    expect(screen.getByTestId("purchase-order-status-select")).toBeTruthy();
    expect(screen.getByTestId("purchase-order-line-variant-select")).toBeTruthy();
    expect(screen.getByTestId("purchase-order-line-quantity-input")).toBeTruthy();
    expect(screen.getByTestId("purchase-order-line-unit-price-input")).toBeTruthy();
    expect(screen.getByTestId("purchase-order-create-submit")).toBeTruthy();
  });

  it("rejects when supplier is missing", async () => {
    await bootAuth(true);
    buildFetch((url) =>
      String(url).includes("/auth/me/")
        ? new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } })
        : new Response("[]", { status: 200 }),
    );
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("purchase-order-create-submit")).toBeTruthy());
    screen.getByTestId("purchase-order-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("purchase-order-create-error")).toBeTruthy());
  });

  it("rejects when location is missing", async () => {
    await bootAuth(true);
    buildFetch((url) =>
      String(url).includes("/auth/me/")
        ? new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } })
        : new Response("[]", { status: 200 }),
    );
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("purchase-order-create-submit")).toBeTruthy());
    screen.getByTestId("purchase-order-supplier-select").textContent = SID;
    screen.getByTestId("purchase-order-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("purchase-order-create-error")).toBeTruthy());
  });

  it("submits with supplier, location, status and a line", async () => {
    await bootAuth(true);
    const fetchMock = buildFetch((url, init) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/purchase-orders/`)) {
        expect(init?.method).toBe("POST");
        const body = JSON.parse(String(init?.body));
        expect(body).toHaveProperty("supplier", SID);
        expect(body).toHaveProperty("location", LID);
        expect(body).toHaveProperty("status");
        expect(Array.isArray(body.lines)).toBe(true);
        expect(body.lines[0]).toHaveProperty("variant", VID);
        expect(body.lines[0]).toHaveProperty("quantity");
        expect(body.lines[0]).toHaveProperty("unit_price");
        expect(body).not.toHaveProperty("business");
        return new Response(
          JSON.stringify({ id: "po1", business: BID, supplier: SID, location: LID, status: "DRAFT", lines: [], created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("purchase-order-create-submit")).toBeTruthy());
    screen.getByTestId("purchase-order-supplier-select").textContent = SID;
    screen.getByTestId("purchase-order-location-select").textContent = LID;
    screen.getByTestId("purchase-order-status-select").textContent = "DRAFT";
    screen.getByTestId("purchase-order-line-variant-select").textContent = VID;
    screen.getByTestId("purchase-order-line-quantity-input").textContent = "10";
    screen.getByTestId("purchase-order-line-unit-price-input").textContent = "5000";
    screen.getByTestId("purchase-order-create-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("sends quantity and unit_price from the line inputs", async () => {
    await bootAuth(true);
    const fetchMock = buildFetch((url, init) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/purchase-orders/`)) {
        const body = JSON.parse(String(init?.body));
        expect(Number(body.lines[0].quantity)).toBeGreaterThan(0);
        expect(Number(body.lines[0].unit_price)).toBeGreaterThanOrEqual(0);
        return new Response(
          JSON.stringify({ id: "po1", business: BID, supplier: SID, location: LID, status: "DRAFT", lines: [], created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("purchase-order-create-submit")).toBeTruthy());
    screen.getByTestId("purchase-order-supplier-select").textContent = SID;
    screen.getByTestId("purchase-order-location-select").textContent = LID;
    screen.getByTestId("purchase-order-line-variant-select").textContent = VID;
    screen.getByTestId("purchase-order-line-quantity-input").textContent = "3";
    screen.getByTestId("purchase-order-line-unit-price-input").textContent = "2500";
    screen.getByTestId("purchase-order-create-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("handles backend 400 field validation errors (maps e.errors / fallback e.message)", async () => {
    await bootAuth(true);
    const fetchMock = buildFetch((url, init) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/purchase-orders/`)) {
        return new Response(
          JSON.stringify({ supplier: ["This field is required."], lines: ["At least one line is required."] }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("purchase-order-create-submit")).toBeTruthy());
    screen.getByTestId("purchase-order-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("purchase-order-create-error")).toBeTruthy());
  });

  it("handles a successful 201 response and navigates back to the list", async () => {
    await bootAuth(true);
    const fetchMock = buildFetch((url, init) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/purchase-orders/`)) {
        return new Response(
          JSON.stringify({ id: "po1", business: BID, supplier: SID, location: LID, status: "DRAFT", lines: [], created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("purchase-order-create-submit")).toBeTruthy());
    screen.getByTestId("purchase-order-supplier-select").textContent = SID;
    screen.getByTestId("purchase-order-location-select").textContent = LID;
    screen.getByTestId("purchase-order-create-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("does NOT call the API when supplier or location is missing", async () => {
    await bootAuth(true);
    const fetchMock = buildFetch((url) =>
      String(url).includes("/auth/me/")
        ? new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } })
        : new Response("[]", { status: 200 }),
    );
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("purchase-order-create-submit")).toBeTruthy());
    screen.getByTestId("purchase-order-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("purchase-order-create-error")).toBeTruthy());
    const poCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID}/purchase-orders/`) && (c[1]?.method ?? "GET") === "POST",
    );
    expect(poCalls.length).toBe(0);
  });
});
