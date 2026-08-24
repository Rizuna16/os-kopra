import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { VariantEdit } from "../pages/VariantEdit";

const BID = "11111111-1111-1111-1111-111111111111";
const PID = "22222222-2222-2222-2222-222222222222";
const VID = "33333333-3333-3333-3333-333333333333";

const existing = {
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

function renderEdit() {
  seedContext();
  return render(
    <MemoryRouter initialEntries={["/products/" + PID + "/variants/" + VID + "/edit"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/products/:productId/variants/:variantId/edit" element={<VariantEdit />} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("VariantEdit", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("loads the existing variant through GET and prefills the name", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/products/${PID}/variants/${VID}/`)) {
        return new Response(JSON.stringify(existing), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("variant-edit-submit")).toBeTruthy());
    expect((screen.getByTestId("variant-name-input") as HTMLInputElement).value).toBe("Hitam - 40");
  });

  it("updates using PATCH and sends ONLY the name field", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/products/${PID}/variants/${VID}/`)) {
        if (init?.method === "GET") {
          return new Response(JSON.stringify(existing), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        expect(init?.method).toBe("PATCH");
        expect(init?.method).not.toBe("PUT");
        const body = JSON.parse(String(init?.body));
        expect(Object.keys(body).sort()).toEqual(["name"]);
        expect(body).not.toHaveProperty("business");
        expect(body).not.toHaveProperty("product");
        expect(body).not.toHaveProperty("id");
        return new Response(JSON.stringify({ ...existing, name: "Putih - 41" }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("variant-edit-submit")).toBeTruthy());
    screen.getByTestId("variant-edit-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("explicitly does NOT use PUT for update", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/products/${PID}/variants/${VID}/`)) {
        if (init?.method === "GET") {
          return new Response(JSON.stringify(existing), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        expect(init?.method).toBe("PATCH");
        expect(init?.method).not.toBe("PUT");
        return new Response(JSON.stringify(existing), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("variant-edit-submit")).toBeTruthy());
    screen.getByTestId("variant-edit-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("rejects an empty name without calling the API", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/products/${PID}/variants/${VID}/`)) {
        if (String(url).endsWith(VID + "/")) {
          return new Response(JSON.stringify(existing), { status: 200, headers: { "Content-Type": "application/json" } });
        }
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("variant-edit-submit")).toBeTruthy());
    const nameInput = screen.getByTestId("variant-name-input") as HTMLInputElement;
    nameInput.value = "";
    screen.getByTestId("variant-edit-submit").click();
    await waitFor(() => expect(screen.getByTestId("variant-edit-error")).toBeTruthy());
    const patchCalled = fetchMock.mock.calls.some(
      (c) => String(c[0]).includes(`/api/v1/businesses/${BID}/products/${PID}/variants/${VID}/`) && c[1]?.method === "PATCH",
    );
    expect(patchCalled).toBe(false);
  });

  it("handles backend 400 field validation errors", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/products/${PID}/variants/${VID}/`)) {
        if (init?.method === "GET") return new Response(JSON.stringify(existing), { status: 200, headers: { "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ name: ["Name must not be empty or whitespace only."] }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("variant-edit-submit")).toBeTruthy());
    screen.getByTestId("variant-edit-submit").click();
    await waitFor(() => expect(screen.getByTestId("variant-edit-error")).toBeTruthy());
  });

  it("handles 401 gracefully", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/products/${PID}/variants/${VID}/`)) {
        return new Response("Unauthorized", { status: 401 });
      }
      return new Response("Unauthorized", { status: 401 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
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
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("variant-edit-error")).toBeTruthy());
  });
});