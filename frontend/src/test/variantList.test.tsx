import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { VariantList } from "../pages/VariantList";

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

function renderList() {
  seedContext();
  return render(
    <MemoryRouter initialEntries={["/products", "/products/" + PID + "/variants"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/products/:productId/variants" element={<VariantList />} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("VariantList", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("requests variants for the active product and renders the returned plain array", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/products/${PID}/variants/`)) {
        return new Response(
          JSON.stringify([
            { id: "v1", product: PID, name: "Hitam - 40", created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderList();
    await waitFor(() => expect(screen.getByTestId("variant-list")).toBeTruthy());
    expect(screen.getByText("Hitam - 40")).toBeTruthy();
    const calledForProd = fetchMock.mock.calls.some((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID}/products/${PID}/variants/`),
    );
    expect(calledForProd).toBe(true);
  });

  it("handles an empty variant array with an empty state", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderList();
    await waitFor(() => expect(screen.getByTestId("variant-list-empty")).toBeTruthy());
  });

  it("does NOT expect pagination metadata in the response", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderList();
    await waitFor(() => expect(screen.getByTestId("variant-list")).toBeTruthy());
    expect(screen.queryByTestId("variant-list-pagination")).not.toBeInTheDocument();
  });

  it("handles 401 gracefully", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("Unauthorized", { status: 401 });
    });
    (globalThis as any).fetch = fetchMock;
    renderList();
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });

  it("handles 404 gracefully", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/products/${PID}/variants/`)) {
        return new Response("Not found", { status: 404 });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderList();
    await waitFor(() => expect(screen.getByTestId("variant-list-error")).toBeTruthy());
  });

  it("reloads data and does not display previous product variants after context switch", async () => {
    await bootAuth(true);
    const variantsByProd: Record<string, unknown[]> = {
      [PID]: [
        { id: "v1", product: PID, name: "Produk A", created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
      ],
    };
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      const match = String(url).match(/\/api\/v1\/businesses\/([^/]+)\/products\/([^/]+)\/variants\//);
      const prod = match ? match[2] : PID;
      return new Response(JSON.stringify(variantsByProd[prod] ?? []), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    (globalThis as any).fetch = fetchMock;
    renderList();
    await waitFor(() => expect(screen.getByText("Produk A")).toBeTruthy());
  });
});