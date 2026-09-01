import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { bootAuth } from "./testUtils";
import { Storefront } from "../pages/Storefront";

const SLUG = "toko-makmur";

function renderStorefront(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/store/${slug}`]}>
      <AuthProvider>
        <Routes>
          <Route path="/store/:slug" element={<Storefront />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("Storefront public catalog UI component (/store/:slug)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders active store info and published product catalog without auth", async () => {
    await bootAuth(false);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes(`/api/v1/stores/${SLUG}/products/`)) {
        return new Response(
          JSON.stringify([
            {
              id: "p1",
              name: "Minyak Goreng",
              price: "15000.00",
              variants: [{ id: "v1", name: "1 Liter", available: 10 }]
            }
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (String(url).includes(`/api/v1/stores/${SLUG}/`)) {
        return new Response(
          JSON.stringify({ id: "s1", name: "Toko Makmur", slug: SLUG, is_active: true }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    renderStorefront(SLUG);

    await waitFor(() => expect(screen.getByTestId("storefront")).toBeTruthy());
    await waitFor(() => expect(screen.getByText("Online Store: Toko Makmur")).toBeTruthy());
    await waitFor(() => expect(screen.getByText("Minyak Goreng")).toBeTruthy());
    expect(screen.getByText("1 Liter")).toBeTruthy();
    expect(screen.getByText("10")).toBeTruthy();
  });

  it("handles inactive store / 404 error gracefully", async () => {
    await bootAuth(false);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes(`/api/v1/stores/${SLUG}/`)) {
        return new Response("Not found", { status: 404 });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    renderStorefront(SLUG);

    await waitFor(() => expect(screen.getByTestId("storefront-error")).toBeTruthy());
  });

  it("renders typed branding fields (logo, tagline, CTA brand color)", async () => {
    await bootAuth(false);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes(`/api/v1/stores/${SLUG}/products/`)) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (String(url).includes(`/api/v1/stores/${SLUG}/`)) {
        return new Response(
          JSON.stringify({
            id: "s1",
            name: "Toko Makmur",
            slug: SLUG,
            is_active: true,
            logo_url: "https://example.com/logo.png",
            brand_color: "#123456",
            tagline: "Serba Ada",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    renderStorefront(SLUG);

    await waitFor(() => expect(screen.getByTestId("storefront-logo")).toBeTruthy());
    const logoImg = screen.getByTestId("storefront-logo") as HTMLImageElement;
    expect(logoImg.src).toBe("https://example.com/logo.png");

    await waitFor(() => expect(screen.getByTestId("storefront-tagline")).toBeTruthy());
    expect(screen.getByText("Serba Ada")).toBeTruthy();

    const cartLink = screen.getByRole("link", { name: /view cart/i });
    expect(cartLink.style.backgroundColor).toBe("rgb(18, 52, 86)");
  });
});
