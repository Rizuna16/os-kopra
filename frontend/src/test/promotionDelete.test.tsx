import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { PromotionDelete } from "../pages/PromotionDelete";

const BID = "11111111-1111-1111-1111-111111111111";
const PID = "22222222-2222-2222-2222-222222222222";

function seedContext() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([{ id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" }]),
  );
  localStorage.setItem("kopera_current_business", BID);
  localStorage.setItem("kopera_current_location", "l1");
}

function renderDelete() {
  seedContext();
  return render(
    <MemoryRouter initialEntries={[`/promotions/${PID}`]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/promotions/:promotionId" element={<PromotionDelete />} />
            <Route path="/promotions" element={<div data-testid="promotion-list-nav">Navigated</div>} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("PromotionDelete", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the delete control", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderDelete();
    await waitFor(() => expect(screen.getByTestId("promotion-delete-submit")).toBeTruthy());
  });

  it("sends DELETE to the exact promotion endpoint (not PUT)", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/promotions/${PID}/`)) {
        expect(init?.method).toBe("DELETE");
        expect(init?.method).not.toBe("PUT");
        return new Response(null, { status: 204 });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderDelete();
    await waitFor(() => expect(screen.getByTestId("promotion-delete-submit")).toBeTruthy());
    screen.getByTestId("promotion-delete-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const called = fetchMock.mock.calls.some(
      (c) => String(c[0]).includes(`/api/v1/businesses/${BID}/promotions/${PID}/`) && c[1]?.method === "DELETE",
    );
    expect(called).toBe(true);
  });

  it("shows a deleting state while in progress", async () => {
    await bootAuth(true);
    let resolveDelete: () => void = () => {};
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/promotions/${PID}/`)) {
        await new Promise<void>((r) => (resolveDelete = r));
        return new Response(null, { status: 204 });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderDelete();
    await waitFor(() => expect(screen.getByTestId("promotion-delete-submit")).toBeTruthy());
    screen.getByTestId("promotion-delete-submit").click();
    await waitFor(() => expect(screen.getByTestId("promotion-delete-deleting")).toBeTruthy());
    resolveDelete();
  });

  it("handles 204 without JSON parsing and navigates to /promotions after success", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/promotions/${PID}/`)) {
        return new Response(null, { status: 204 });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderDelete();
    await waitFor(() => expect(screen.getByTestId("promotion-delete-submit")).toBeTruthy());
    screen.getByTestId("promotion-delete-submit").click();
    await waitFor(() => expect(screen.getByTestId("promotion-list-nav")).toBeTruthy());
  });

  it("handles 401 gracefully by navigating to login", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/promotions/${PID}/`)) {
        return new Response("Unauthorized", { status: 401 });
      }
      return new Response("Unauthorized", { status: 401 });
    });
    (globalThis as any).fetch = fetchMock;
    renderDelete();
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });

  it("handles 404 gracefully with an error state", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/promotions/${PID}/`)) {
        return new Response("Not found", { status: 404 });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderDelete();
    await waitFor(() => expect(screen.getByTestId("promotion-delete-submit")).toBeTruthy());
    screen.getByTestId("promotion-delete-submit").click();
    await waitFor(() => expect(screen.getByTestId("promotion-delete-error")).toBeTruthy());
  });
});
