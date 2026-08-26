import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { bootAuth } from "./testUtils";
import { StorefrontCheckout } from "../pages/StorefrontCheckout";

const SLUG = "toko-makmur";

function renderCheckout(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/store/${slug}/checkout`]}>
      <AuthProvider>
        <Routes>
          <Route path="/store/:slug/checkout" element={<StorefrontCheckout />} />
          <Route path="/store/:slug/cart" element={<div data-testid="cart-redirect">Cart</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("Storefront checkout UI component (/store/:slug/checkout)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("places an order with guest info, shipping address and valid line items", async () => {
    await bootAuth(false);
    let checkoutBody: any = null;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes(`/api/v1/stores/${SLUG}/checkout/`)) {
        checkoutBody = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({ id: "o1", status: "PENDING", guest_name: "John Doe" }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    renderCheckout(SLUG);

    await waitFor(() => expect(screen.getByTestId("storefront-checkout")).toBeTruthy());
    fireEvent.change(screen.getByTestId("checkout-name-input"), { target: { value: "John Doe" } });
    fireEvent.change(screen.getByTestId("checkout-email-input"), { target: { value: "john@test.com" } });
    fireEvent.change(screen.getByTestId("checkout-phone-input"), { target: { value: "08123456789" } });
    fireEvent.change(screen.getByTestId("checkout-address-input"), { target: { value: "Jakarta" } });

    fireEvent.click(screen.getByTestId("checkout-submit-btn"));

    await waitFor(() => expect(checkoutBody).not.toBeNull());
    expect(checkoutBody.guest_name).toBe("John Doe");
    expect(checkoutBody.guest_email).toBe("john@test.com");
    expect(checkoutBody.guest_phone).toBe("08123456789");
    expect(checkoutBody.shipping_address).toBe("Jakarta");
    expect(Array.isArray(checkoutBody.lines)).toBe(true);
  });

  it("displays error state when order submission fails", async () => {
    await bootAuth(false);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes(`/api/v1/stores/${SLUG}/checkout/`)) {
        return new Response(JSON.stringify({ detail: "Invalid line items" }), { status: 400 });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    renderCheckout(SLUG);

    await waitFor(() => expect(screen.getByTestId("storefront-checkout")).toBeTruthy());
    fireEvent.click(screen.getByTestId("checkout-submit-btn"));

    await waitFor(() => expect(screen.getByTestId("checkout-error")).toBeTruthy());
  });
});