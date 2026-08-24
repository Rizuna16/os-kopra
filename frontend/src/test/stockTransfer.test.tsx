import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { StockTransfer } from "../pages/StockTransfer";

const BID = "11111111-1111-1111-1111-111111111111";
const LOC_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const LOC_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const VID = "vvvvvvvv-vvvv-vvvv-vvvv-vvvvvvvvvvvv";

function seedContext() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([{ id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" }]),
  );
  localStorage.setItem("kopera_current_business", BID);
  localStorage.setItem("kopera_current_location", LOC_A);
  localStorage.setItem(
    "kopera_locations",
    JSON.stringify([
      { id: LOC_A, name: "Gudang A" },
      { id: LOC_B, name: "Gudang B" },
    ]),
  );
}

function renderTransfer() {
  seedContext();
  return render(
    <MemoryRouter initialEntries={["/inventory/stocks/transfer"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/inventory/stocks/transfer" element={<StockTransfer />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("StockTransfer", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the transfer form with source, destination, variant and quantity fields", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200 });
    });
    renderTransfer();
    await waitFor(() => expect(screen.getByTestId("stock-transfer-form")).toBeTruthy());
    expect(screen.getByTestId("stock-transfer-source")).toBeTruthy();
    expect(screen.getByTestId("stock-transfer-destination")).toBeTruthy();
    expect(screen.getByTestId("stock-transfer-variant")).toBeTruthy();
    expect(screen.getByTestId("stock-transfer-quantity")).toBeTruthy();
    expect(screen.getByTestId("stock-transfer-submit")).toBeTruthy();
  });

  it("POSTs to /api/v1/stocks/transfer/ with source_location, destination_location, variant, quantity", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes("/api/v1/stocks/transfer/")) {
        expect(init?.method).toBe("POST");
        const body = JSON.parse(String(init?.body));
        expect(Object.keys(body).sort()).toEqual([
          "destination_location",
          "quantity",
          "source_location",
          "variant",
        ]);
        return new Response(
          JSON.stringify({
            source: { id: "s1", location: LOC_A, variant: VID, quantity: "60.00", created_at: "", updated_at: "" },
            destination: { id: "s2", location: LOC_B, variant: VID, quantity: "40.00", created_at: "", updated_at: "" },
            transferred_quantity: "40.00",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderTransfer();
    await waitFor(() => expect(screen.getByTestId("stock-transfer-submit")).toBeTruthy());
    screen.getByTestId("stock-transfer-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const call = fetchMock.mock.calls.find((c) => String(c[0]).includes("/api/v1/stocks/transfer/"));
    expect(call).toBeTruthy();
  });

  it("renders source, destination and transferred_quantity on a successful transfer", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/api/v1/stocks/transfer/")) {
        return new Response(
          JSON.stringify({
            source: { id: "s1", location: LOC_A, variant: VID, quantity: "60.00", created_at: "", updated_at: "" },
            destination: { id: "s2", location: LOC_B, variant: VID, quantity: "40.00", created_at: "", updated_at: "" },
            transferred_quantity: "40.00",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    renderTransfer();
    await waitFor(() => expect(screen.getByTestId("stock-transfer-submit")).toBeTruthy());
    screen.getByTestId("stock-transfer-submit").click();
    await waitFor(() => expect(screen.getByTestId("stock-transfer-result")).toBeTruthy());
    expect(screen.getByTestId("stock-transfer-transferred-quantity").textContent).toBe("40.00");
  });

  it("handles insufficient stock (400)", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/api/v1/stocks/transfer/")) {
        return new Response(JSON.stringify({ quantity: ["Insufficient stock at source."] }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderTransfer();
    await waitFor(() => expect(screen.getByTestId("stock-transfer-submit")).toBeTruthy());
    screen.getByTestId("stock-transfer-submit").click();
    await waitFor(() => expect(screen.getByTestId("stock-transfer-error")).toBeTruthy());
  });

  it("handles source stock missing (400)", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/api/v1/stocks/transfer/")) {
        return new Response(JSON.stringify({ source_location: ["No stock available at source location for this variant."] }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    renderTransfer();
    await waitFor(() => expect(screen.getByTestId("stock-transfer-submit")).toBeTruthy());
    screen.getByTestId("stock-transfer-submit").click();
    await waitFor(() => expect(screen.getByTestId("stock-transfer-error")).toBeTruthy());
  });

  it("handles cross-business validation (400)", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/api/v1/stocks/transfer/")) {
        return new Response(JSON.stringify({ non_field_errors: ["Source and destination must be in the same business."] }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    renderTransfer();
    await waitFor(() => expect(screen.getByTestId("stock-transfer-submit")).toBeTruthy());
    screen.getByTestId("stock-transfer-submit").click();
    await waitFor(() => expect(screen.getByTestId("stock-transfer-error")).toBeTruthy());
  });
});
