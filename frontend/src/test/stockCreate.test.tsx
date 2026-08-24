import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { StockCreate } from "../pages/StockCreate";

const BID = "11111111-1111-1111-1111-111111111111";
const LOC = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const VID = "vvvvvvvv-vvvv-vvvv-vvvv-vvvvvvvvvvvv";

function seedContext() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([{ id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" }]),
  );
  localStorage.setItem("kopera_current_business", BID);
  localStorage.setItem("kopera_current_location", LOC);
}

function renderCreate() {
  seedContext();
  return render(
    <MemoryRouter initialEntries={["/inventory/stocks/new"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/inventory/stocks/new" element={<StockCreate />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("StockCreate", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the create form with a variant picker and quantity field", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200 });
    });
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("stock-create-form")).toBeTruthy());
    expect(screen.getByTestId("stock-variant-input")).toBeTruthy();
    expect(screen.getByTestId("stock-quantity-input")).toBeTruthy();
    expect(screen.getByTestId("stock-create-submit")).toBeTruthy();
  });

  it("rejects a non-positive quantity before submitting", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200 });
    });
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("stock-create-submit")).toBeTruthy());
    screen.getByTestId("stock-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("stock-create-error")).toBeTruthy());
  });

  it("submits variant_id and quantity only (no business/location in body)", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/locations/${LOC}/stocks/`)) {
        expect(init?.method).toBe("POST");
        const body = JSON.parse(String(init?.body));
        expect(Object.keys(body).sort()).toEqual(["quantity", "variant_id"]);
        expect(body).not.toHaveProperty("business");
        expect(body).not.toHaveProperty("location");
        return new Response(
          JSON.stringify({ id: "s1", location: LOC, variant: VID, quantity: "50.00", created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("stock-create-submit")).toBeTruthy());
    screen.getByTestId("stock-create-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("handles backend 400 validation errors", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/locations/${LOC}/stocks/`)) {
        return new Response(
          JSON.stringify({ quantity: ["Quantity must be greater than 0."] }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("stock-create-submit")).toBeTruthy());
    screen.getByTestId("stock-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("stock-create-error")).toBeTruthy());
  });

  it("handles a successful 201 creation", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/locations/${LOC}/stocks/`)) {
        return new Response(
          JSON.stringify({ id: "s1", location: LOC, variant: VID, quantity: "50.00", created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("stock-create-submit")).toBeTruthy());
    screen.getByTestId("stock-create-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });
});
