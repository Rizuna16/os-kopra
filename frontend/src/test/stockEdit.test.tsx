import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { StockEdit } from "../pages/StockEdit";

const SID = "ssssssss-ssss-ssss-ssss-ssssssssssss";
const LOC = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const VID = "vvvvvvvv-vvvv-vvvv-vvvv-vvvvvvvvvvvv";

function seedContext() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([{ id: "11111111-1111-1111-1111-111111111111", name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" }]),
  );
  localStorage.setItem("kopera_current_business", "11111111-1111-1111-1111-111111111111");
  localStorage.setItem("kopera_current_location", LOC);
}

function renderEdit() {
  seedContext();
  return render(
    <MemoryRouter initialEntries={[`/inventory/stocks/${SID}/edit`]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/inventory/stocks/:stockId/edit" element={<StockEdit />} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function stockResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: SID,
    location: LOC,
    variant: VID,
    quantity: "100.00",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("StockEdit", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("loads existing stock and populates the quantity field", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/api/stocks/${SID}/`)) return new Response(JSON.stringify(stockResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200 });
    });
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("stock-edit-form")).toBeTruthy());
    expect((screen.getByTestId("stock-quantity-input") as HTMLInputElement).value).toBe("100.00");
  });

  it("submits PATCH with quantity only, using the /api/stocks/ path, no PUT", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/stocks/${SID}/`)) {
        if (init?.method === "PATCH") {
          expect(init?.method).toBe("PATCH");
          const body = JSON.parse(String(init?.body));
          expect(Object.keys(body).sort()).toEqual(["quantity"]);
          expect(body).not.toHaveProperty("location");
          expect(body).not.toHaveProperty("variant");
          expect(body).not.toHaveProperty("id");
          return new Response(JSON.stringify(stockResponse({ quantity: "250.00" })), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify(stockResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("stock-edit-submit")).toBeTruthy());
    screen.getByTestId("stock-edit-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const patchCall = fetchMock.mock.calls.find(
      (c) => String(c[0]).includes(`/api/stocks/${SID}/`) && c[1]?.method === "PATCH",
    );
    expect(patchCall).toBeTruthy();
  });

  it("does NOT use PUT", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/stocks/${SID}/`)) {
        if (init?.method === "PATCH") return new Response(JSON.stringify(stockResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
        return new Response(JSON.stringify(stockResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("stock-edit-submit")).toBeTruthy());
    screen.getByTestId("stock-edit-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const putCall = fetchMock.mock.calls.find((c) => c[1]?.method === "PUT");
    expect(putCall).toBeFalsy();
  });

  it("handles backend 400 validation errors", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/stocks/${SID}/`)) {
        if (init?.method === "PATCH") {
          return new Response(JSON.stringify({ quantity: ["Jumlah tidak valid."] }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify(stockResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("stock-edit-submit")).toBeTruthy());
    screen.getByTestId("stock-edit-submit").click();
    await waitFor(() => expect(screen.getByTestId("stock-edit-error")).toBeTruthy());
  });

  it("handles 404 gracefully", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/api/stocks/${SID}/`)) return new Response("Not found", { status: 404 });
      return new Response("[]", { status: 200 });
    });
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("stock-edit-error")).toBeTruthy());
  });

  it("handles 401 by redirecting to login", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/api/stocks/${SID}/`)) return new Response("Unauthorized", { status: 401 });
      return new Response("[]", { status: 200 });
    });
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });

  it("handles a successful update", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/stocks/${SID}/`)) {
        if (init?.method === "PATCH") return new Response(JSON.stringify(stockResponse({ quantity: "250.00" })), { status: 200, headers: { "Content-Type": "application/json" } });
        return new Response(JSON.stringify(stockResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("stock-edit-submit")).toBeTruthy());
    screen.getByTestId("stock-edit-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });
});
