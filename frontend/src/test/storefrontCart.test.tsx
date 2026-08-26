import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { bootAuth } from "./testUtils";
import { StorefrontCart } from "../pages/StorefrontCart";

const SLUG = "toko-makmur";
const SESSION = "session-abc-123";

function renderCart(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/store/${slug}/cart`]}>
      <AuthProvider>
        <Routes>
          <Route path="/store/:slug/cart" element={<StorefrontCart />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("Storefront cart UI component (/store/:slug/cart)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders existing session cart items without auth", async () => {
    await bootAuth(false);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes(`/api/v1/stores/${SLUG}/cart/`)) {
        return new Response(
          JSON.stringify({
            id: "c1",
            session_token: SESSION,
            items: [
              { id: "ci1", variant: "v1", quantity: "2.00", product_name: "Minyak", price: "15000.00" }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    renderCart(SLUG);

    await waitFor(() => expect(screen.getByTestId("storefront-cart")).toBeTruthy());
    expect(screen.getByText("Minyak")).toBeTruthy();
  });

  it("adds item to cart with positive quantity", async () => {
    await bootAuth(false);
    let postedBody: any = null;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes(`/api/v1/stores/${SLUG}/cart/`)) {
        if (init?.method === "POST") {
          postedBody = JSON.parse(String(init?.body));
          return new Response(
            JSON.stringify({
              id: "c1",
              session_token: SESSION,
              items: [{ id: "ci1", variant: "v1", quantity: "1.00", product_name: "Minyak", price: "15000.00" }]
            }),
            { status: 201, headers: { "Content-Type": "application/json" } }
          );
        }
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    renderCart(SLUG);

    await waitFor(() => expect(screen.getByTestId("storefront-cart")).toBeTruthy());
    fireEvent.change(screen.getByTestId("cart-quantity-input"), { target: { value: "1" } });
    fireEvent.click(screen.getByTestId("cart-add-btn"));

    await waitFor(() => expect(postedBody).not.toBeNull());
    expect(postedBody.session_token).toBe(SESSION);
    expect(postedBody.quantity).toBe("1.00");
  });

  it("validates positive quantity (rejects zero / negative)", async () => {
    await bootAuth(false);
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    (globalThis as any).fetch = fetchMock;

    renderCart(SLUG);

    await waitFor(() => expect(screen.getByTestId("storefront-cart")).toBeTruthy());
    fireEvent.change(screen.getByTestId("cart-quantity-input"), { target: { value: "0" } });
    fireEvent.click(screen.getByTestId("cart-add-btn"));

    await waitFor(() => expect(screen.getByTestId("cart-quantity-error")).toBeTruthy());
  });
});