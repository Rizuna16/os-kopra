import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { StockAdjustment } from "../pages/StockAdjustment";

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

function renderAdjustment() {
  seedContext();
  return render(
    <MemoryRouter initialEntries={["/inventory/stocks/adjustment"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/inventory/stocks/adjustment" element={<StockAdjustment />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("StockAdjustment", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders location, variant and delta quantity fields", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200 });
    });
    renderAdjustment();
    await waitFor(() => expect(screen.getByTestId("stock-adjustment-form")).toBeTruthy());
    expect(screen.getByTestId("stock-adjustment-location")).toBeTruthy();
    expect(screen.getByTestId("stock-adjustment-variant")).toBeTruthy();
    expect(screen.getByTestId("stock-adjustment-quantity")).toBeTruthy();
  });

  it("POSTs to /api/v1/stocks/adjustment/ with location, variant and delta quantity", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes("/api/v1/stocks/adjustment/")) {
        expect(init?.method).toBe("POST");
        const body = JSON.parse(String(init?.body));
        expect(Object.keys(body).sort()).toEqual(["location", "quantity", "variant"]);
        expect(body).not.toHaveProperty("business");
        return new Response(
          JSON.stringify({ id: "s1", location: LOC, variant: VID, quantity: "15.00", created_at: "", updated_at: "" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderAdjustment();
    await waitFor(() => expect(screen.getByTestId("stock-adjustment-submit")).toBeTruthy());
    screen.getByTestId("stock-adjustment-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("handles zero quantity rejection (400)", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/api/v1/stocks/adjustment/")) {
        return new Response(JSON.stringify({ quantity: ["Quantity must not be zero."] }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    renderAdjustment();
    await waitFor(() => expect(screen.getByTestId("stock-adjustment-submit")).toBeTruthy());
    screen.getByTestId("stock-adjustment-submit").click();
    await waitFor(() => expect(screen.getByTestId("stock-adjustment-error")).toBeTruthy());
  });

  it("handles negative resulting stock (400)", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/api/v1/stocks/adjustment/")) {
        return new Response(JSON.stringify({ quantity: ["Adjustment would result in negative stock."] }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    renderAdjustment();
    await waitFor(() => expect(screen.getByTestId("stock-adjustment-submit")).toBeTruthy());
    screen.getByTestId("stock-adjustment-submit").click();
    await waitFor(() => expect(screen.getByTestId("stock-adjustment-error")).toBeTruthy());
  });

  it("handles missing stock + negative (400)", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/api/v1/stocks/adjustment/")) {
        return new Response(JSON.stringify({ quantity: ["No stock available at this location for adjustment."] }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    renderAdjustment();
    await waitFor(() => expect(screen.getByTestId("stock-adjustment-submit")).toBeTruthy());
    screen.getByTestId("stock-adjustment-submit").click();
    await waitFor(() => expect(screen.getByTestId("stock-adjustment-error")).toBeTruthy());
  });
});
