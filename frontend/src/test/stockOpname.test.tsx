import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { StockOpname } from "../pages/StockOpname";

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

function renderOpname() {
  seedContext();
  return render(
    <MemoryRouter initialEntries={["/inventory/stocks/opname"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/inventory/stocks/opname" element={<StockOpname />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("StockOpname", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders location, variant and absolute quantity fields", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200 });
    });
    renderOpname();
    await waitFor(() => expect(screen.getByTestId("stock-opname-form")).toBeTruthy());
    expect(screen.getByTestId("stock-opname-location")).toBeTruthy();
    expect(screen.getByTestId("stock-opname-variant")).toBeTruthy();
    expect(screen.getByTestId("stock-opname-quantity")).toBeTruthy();
  });

  it("POSTs to /api/v1/stocks/opname/ with location, variant and absolute quantity", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes("/api/v1/stocks/opname/")) {
        expect(init?.method).toBe("POST");
        const body = JSON.parse(String(init?.body));
        expect(Object.keys(body).sort()).toEqual(["location", "quantity", "variant"]);
        return new Response(
          JSON.stringify({ id: "s1", location: LOC, variant: VID, quantity: "7.00", created_at: "", updated_at: "" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderOpname();
    await waitFor(() => expect(screen.getByTestId("stock-opname-submit")).toBeTruthy());
    screen.getByTestId("stock-opname-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("handles a successful Stock response", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/api/v1/stocks/opname/")) {
        return new Response(
          JSON.stringify({ id: "s1", location: LOC, variant: VID, quantity: "7.00", created_at: "", updated_at: "" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    renderOpname();
    await waitFor(() => expect(screen.getByTestId("stock-opname-submit")).toBeTruthy());
    screen.getByTestId("stock-opname-submit").click();
    await waitFor(() => expect(screen.getByTestId("stock-opname-result")).toBeTruthy());
    expect(screen.getByTestId("stock-opname-quantity-result").textContent).toBe("7.00");
  });

  it("handles the detail-only success response (no Stock object)", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/api/v1/stocks/opname/")) {
        return new Response(JSON.stringify({ detail: "No stock found and physical quantity is 0." }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    renderOpname();
    await waitFor(() => expect(screen.getByTestId("stock-opname-submit")).toBeTruthy());
    screen.getByTestId("stock-opname-submit").click();
    await waitFor(() => expect(screen.getByTestId("stock-opname-detail-result")).toBeTruthy());
  });

  it("handles negative quantity rejection (400)", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/api/v1/stocks/opname/")) {
        return new Response(JSON.stringify({ quantity: ["Quantity must not be negative."] }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    renderOpname();
    await waitFor(() => expect(screen.getByTestId("stock-opname-submit")).toBeTruthy());
    screen.getByTestId("stock-opname-submit").click();
    await waitFor(() => expect(screen.getByTestId("stock-opname-error")).toBeTruthy());
  });
});
