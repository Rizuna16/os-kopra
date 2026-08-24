import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { VariantDetail } from "../pages/VariantDetail";

const BID = "11111111-1111-1111-1111-111111111111";
const PID = "22222222-2222-2222-2222-222222222222";
const VID = "33333333-3333-3333-3333-333333333333";

const variant = {
  id: VID,
  product: PID,
  name: "Hitam - 40",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

function seedContext() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([{ id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" }]),
  );
  localStorage.setItem("kopera_current_business", BID);
  localStorage.setItem("kopera_current_location", "l1");
}

describe("VariantDetail", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  function tree() {
    seedContext();
    return (
      <MemoryRouter initialEntries={[`/products/${PID}/variants/${VID}`]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/products/:productId/variants/:variantId" element={<VariantDetail />} />
              <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
  }

  it("loads the correct variant by id and renders name/product/timestamps", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/products/${PID}/variants/${VID}/`)) {
        return new Response(JSON.stringify(variant), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    render(tree());
    await waitFor(() => expect(screen.getByTestId("variant-detail")).toBeTruthy());
    expect(screen.getByTestId("variant-detail-name").textContent).toBe("Hitam - 40");
    expect(screen.getByTestId("variant-detail-product").textContent).toBe(PID);
    expect(screen.getByTestId("variant-detail-created-at").textContent).toBe("2024-01-01T00:00:00Z");
    const called = fetchMock.mock.calls.some((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID}/products/${PID}/variants/${VID}/`),
    );
    expect(called).toBe(true);
  });

  it("shows a loading state", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response(JSON.stringify(variant), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    render(tree());
    expect(screen.getByTestId("variant-detail-loading")).toBeTruthy();
  });

  it("shows an error state on failure", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response("Server error", { status: 500 });
    });
    (globalThis as any).fetch = fetchMock;
    render(tree());
    await waitFor(() => expect(screen.getByTestId("variant-detail-error")).toBeTruthy());
  });

  it("handles 401 gracefully", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response("Unauthorized", { status: 401 });
    });
    (globalThis as any).fetch = fetchMock;
    render(tree());
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });

  it("handles 404 gracefully", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/products/${PID}/variants/${VID}/`)) {
        return new Response("Not found", { status: 404 });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    render(tree());
    await waitFor(() => expect(screen.getByTestId("variant-detail-error")).toBeTruthy());
  });
});