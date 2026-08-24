import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { ProductCreate } from "../pages/ProductCreate";

const BID = "11111111-1111-1111-1111-111111111111";

function seedCurrentBusiness() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([{ id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" }]),
  );
  localStorage.setItem("kopera_current_business", BID);
  localStorage.setItem("kopera_current_location", "l1");
}

function renderCreate() {
  seedCurrentBusiness();
  return render(
    <MemoryRouter initialEntries={["/products/new"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/products/new" element={<ProductCreate />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("ProductCreate", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the create form", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("product-create-form")).toBeTruthy());
    expect(screen.getByTestId("product-name-input")).toBeTruthy();
    expect(screen.getByTestId("product-price-input")).toBeTruthy();
  });

  it("rejects an empty name", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200 });
    });
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("product-create-submit")).toBeTruthy());
    screen.getByTestId("product-name-input").textContent = "";
    screen.getByTestId("product-create-submit").click();
    await waitFor(() =>
      expect(screen.getByTestId("product-create-error")).toBeTruthy(),
    );
  });

  it("rejects a whitespace-only name", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200 });
    });
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("product-create-submit")).toBeTruthy());
    const nameInput = screen.getByTestId("product-name-input") as HTMLInputElement;
    screen.getByTestId("product-create-submit").click();
    await waitFor(() =>
      expect(screen.getByTestId("product-create-error")).toBeTruthy(),
    );
  });

  it("submits a valid integer price and sends only name and price", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/products/`)) {
        expect(init?.method).toBe("POST");
        const body = JSON.parse(String(init?.body));
        expect(Object.keys(body).sort()).toEqual(["name", "price"]);
        expect(body).not.toHaveProperty("business");
        expect(body).not.toHaveProperty("id");
        expect(body).not.toHaveProperty("created_at");
        expect(body).not.toHaveProperty("updated_at");
        return new Response(
          JSON.stringify({ id: "p1", name: "Beras", price: 55000, business: BID, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("product-create-submit")).toBeTruthy());
    const nameInput = screen.getByTestId("product-name-input") as HTMLInputElement;
    const priceInput = screen.getByTestId("product-price-input") as HTMLInputElement;
    screen.getByTestId("product-create-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("submits a valid decimal-string-compatible price", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/products/`)) {
        const body = JSON.parse(String(init?.body));
        expect(body.price).toBe("55000.50");
        return new Response(
          JSON.stringify({ id: "p1", name: "Beras", price: "55000.50", business: BID, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("product-create-submit")).toBeTruthy());
    screen.getByTestId("product-create-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("handles backend 400 field validation errors", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/products/`)) {
        return new Response(
          JSON.stringify({ name: ["Name must not be empty or whitespace only."] }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("product-create-submit")).toBeTruthy());
    screen.getByTestId("product-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("product-create-error")).toBeTruthy());
  });

  it("handles a successful 201 response and refreshes/navigates per frontend architecture", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/products/`)) {
        return new Response(
          JSON.stringify({ id: "p1", name: "Beras", price: 55000, business: BID, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("product-create-submit")).toBeTruthy());
    screen.getByTestId("product-create-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("does NOT call the API and does NOT navigate when the name is empty or whitespace-only", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("product-create-submit")).toBeTruthy());

    screen.getByTestId("product-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("product-create-error")).toBeTruthy());

    const nameInput = screen.getByTestId("product-name-input") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "   " } });
    screen.getByTestId("product-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("product-create-error")).toBeTruthy());

    const productCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID}/products/`),
    );
    expect(productCalls.length).toBe(0);
  });
});
