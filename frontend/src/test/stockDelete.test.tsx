import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { StockDelete } from "../pages/StockDelete";

const SID = "ssssssss-ssss-ssss-ssss-ssssssssssss";

function seedContext() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([{ id: "11111111-1111-1111-1111-111111111111", name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" }]),
  );
  localStorage.setItem("kopera_current_business", "11111111-1111-1111-1111-111111111111");
  localStorage.setItem("kopera_current_location", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
}

function renderDelete() {
  seedContext();
  return render(
    <MemoryRouter initialEntries={[`/inventory/stocks/${SID}`]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/inventory/stocks/:stockId" element={<StockDelete />} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("StockDelete", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("sends DELETE to /api/stocks/<id>/ (no /v1/) and tolerates 204 with empty body", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/stocks/${SID}/`)) {
        expect(init?.method).toBe("DELETE");
        expect(String(url)).not.toContain("/api/v1/stocks/");
        return new Response(null, { status: 204 });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderDelete();
    await waitFor(() => expect(screen.getByTestId("stock-delete-confirm-button")).toBeTruthy());
    screen.getByTestId("stock-delete-confirm-button").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const deleteCall = fetchMock.mock.calls.find((c) => String(c[0]).includes(`/api/stocks/${SID}/`));
    expect(deleteCall).toBeTruthy();
  });

  it("does NOT parse JSON from a 204 response", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/stocks/${SID}/`)) return new Response(null, { status: 204 });
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderDelete();
    await waitFor(() => expect(screen.getByTestId("stock-delete-confirm-button")).toBeTruthy());
    screen.getByTestId("stock-delete-confirm-button").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("handles 404 gracefully", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/api/stocks/${SID}/`)) return new Response("Not found", { status: 404 });
      return new Response("[]", { status: 200 });
    });
    renderDelete();
    await waitFor(() => expect(screen.getByTestId("stock-delete-confirm-button")).toBeTruthy());
    screen.getByTestId("stock-delete-confirm-button").click();
    await waitFor(() => expect(screen.getByTestId("stock-delete-error")).toBeTruthy());
  });

  it("handles 401 by redirecting to login", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes(`/api/stocks/${SID}/`)) return new Response("Unauthorized", { status: 401 });
      return new Response("[]", { status: 200 });
    });
    renderDelete();
    await waitFor(() => expect(screen.getByTestId("stock-delete-confirm-button")).toBeTruthy());
    screen.getByTestId("stock-delete-confirm-button").click();
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });

  it("removes the item after successful deletion", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/stocks/${SID}/`)) return new Response(null, { status: 204 });
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderDelete();
    await waitFor(() => expect(screen.getByTestId("stock-delete-confirm-button")).toBeTruthy());
    screen.getByTestId("stock-delete-confirm-button").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });
});
