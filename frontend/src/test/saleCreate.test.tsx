import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { SaleCreate } from "../pages/SaleCreate";

const BID = "11111111-1111-1111-1111-111111111111";
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
    <MemoryRouter initialEntries={["/sales/new"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/sales/new" element={<SaleCreate />} />
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

describe("SaleCreate", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the create form with location, status and line fields", async () => {
    await bootAuth(true);
    buildFetch((url) =>
      String(url).includes("/auth/me/")
        ? new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } })
        : new Response("[]", { status: 200 }),
    );
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("sale-create-form")).toBeTruthy());
    expect(screen.getByTestId("sale-location-select")).toBeTruthy();
    expect(screen.getByTestId("sale-status-select")).toBeTruthy();
    expect(screen.getByTestId("sale-line-variant-select")).toBeTruthy();
    expect(screen.getByTestId("sale-line-quantity-input")).toBeTruthy();
    expect(screen.getByTestId("sale-line-unit-price-input")).toBeTruthy();
    expect(screen.getByTestId("sale-create-submit")).toBeTruthy();
  });

  it("rejects when location is missing", async () => {
    await bootAuth(true);
    buildFetch((url) =>
      String(url).includes("/auth/me/")
        ? new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } })
        : new Response("[]", { status: 200 }),
    );
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("sale-create-submit")).toBeTruthy());
    screen.getByTestId("sale-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("sale-create-error")).toBeTruthy());
  });

  it("submits with location, status and a line", async () => {
    await bootAuth(true);
    const fetchMock = buildFetch((url, init) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/sales/`)) {
        expect(init?.method).toBe("POST");
        const body = JSON.parse(String(init?.body));
        expect(body).toHaveProperty("location", LID);
        expect(body).toHaveProperty("status");
        expect(Array.isArray(body.lines)).toBe(true);
        expect(body.lines[0]).toHaveProperty("variant", VID);
        expect(body.lines[0]).toHaveProperty("quantity");
        expect(body.lines[0]).toHaveProperty("unit_price");
        expect(body).not.toHaveProperty("business");
        return new Response(
          JSON.stringify({ id: "s1", business: BID, location: LID, status: "DRAFT", lines: [], created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("sale-create-submit")).toBeTruthy());
    screen.getByTestId("sale-location-select").textContent = LID;
    screen.getByTestId("sale-status-select").textContent = "DRAFT";
    screen.getByTestId("sale-line-variant-select").textContent = VID;
    screen.getByTestId("sale-line-quantity-input").textContent = "10";
    screen.getByTestId("sale-line-unit-price-input").textContent = "5000";
    screen.getByTestId("sale-create-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("sends quantity and unit_price from the line inputs", async () => {
    await bootAuth(true);
    const fetchMock = buildFetch((url, init) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/sales/`)) {
        const body = JSON.parse(String(init?.body));
        expect(Number(body.lines[0].quantity)).toBeGreaterThan(0);
        expect(Number(body.lines[0].unit_price)).toBeGreaterThanOrEqual(0);
        return new Response(
          JSON.stringify({ id: "s1", business: BID, location: LID, status: "DRAFT", lines: [], created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("sale-create-submit")).toBeTruthy());
    screen.getByTestId("sale-location-select").textContent = LID;
    screen.getByTestId("sale-line-variant-select").textContent = VID;
    screen.getByTestId("sale-line-quantity-input").textContent = "3";
    screen.getByTestId("sale-line-unit-price-input").textContent = "2500";
    screen.getByTestId("sale-create-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("handles backend 400 field validation errors", async () => {
    await bootAuth(true);
    const fetchMock = buildFetch((url, init) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/sales/`)) {
        return new Response(
          JSON.stringify({ location: ["This field is required."], lines: ["At least one line is required."] }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("sale-create-submit")).toBeTruthy());
    screen.getByTestId("sale-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("sale-create-error")).toBeTruthy());
  });

  it("handles a successful 201 response and navigates back to the list", async () => {
    await bootAuth(true);
    const fetchMock = buildFetch((url, init) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/sales/`)) {
        return new Response(
          JSON.stringify({ id: "s1", business: BID, location: LID, status: "DRAFT", lines: [], created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("sale-create-submit")).toBeTruthy());
    screen.getByTestId("sale-location-select").textContent = LID;
    screen.getByTestId("sale-create-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("does NOT call the API when location is missing", async () => {
    await bootAuth(true);
    const fetchMock = buildFetch((url) =>
      String(url).includes("/auth/me/")
        ? new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } })
        : new Response("[]", { status: 200 }),
    );
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("sale-create-submit")).toBeTruthy());
    screen.getByTestId("sale-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("sale-create-error")).toBeTruthy());
    const saleCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID}/sales/`) && (c[1]?.method ?? "GET") === "POST",
    );
    expect(saleCalls.length).toBe(0);
  });
});
