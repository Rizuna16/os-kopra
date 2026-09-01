import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth } from "./testUtils";
import { SettingsBusiness } from "../pages/SettingsBusiness";
import { Storefront } from "../pages/Storefront";

const BID = "44444444-4444-4444-4444-444444444444";
const SLUG = "toko-brand";

function seedBusiness(businessId: string) {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([
      { id: businessId, name: "Toko Brand", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" },
    ])
  );
  localStorage.setItem("kopera_current_business", businessId);
}

describe("GAP-03BRAND — Brand Management UI Contract Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders brand preview card", async () => {
    await bootAuth(true);
    seedBusiness(BID);

    const mockBusinessSettings = {
      id: BID,
      name: "Toko Brand",
      business_type: "Fashion",
      logo_url: "https://example.com/logo.png",
      brand_color: "#4F46E5",
      tagline: "Your Brand Tagline",
      status: "ACTIVE",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify({ id: "1", email: "test@example.com" }), { status: 200 });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/settings/business/`)) {
        return new Response(JSON.stringify(mockBusinessSettings), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    render(
      <MemoryRouter initialEntries={["/settings/business"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/settings/business" element={<SettingsBusiness />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId("settings-business-page")).toBeTruthy());
    expect(screen.getByTestId("business-brand-preview-card")).toBeTruthy();
  });

  it("synchronizes color picker and hex input", async () => {
    await bootAuth(true);
    seedBusiness(BID);

    const mockBusinessSettings = {
      id: BID,
      name: "Toko Brand",
      business_type: "Fashion",
      logo_url: null,
      brand_color: "#FF0000",
      tagline: null,
      status: "ACTIVE",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify({ id: "1", email: "test@example.com" }), { status: 200 });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/settings/business/`)) {
        return new Response(JSON.stringify(mockBusinessSettings), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    render(
      <MemoryRouter initialEntries={["/settings/business"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/settings/business" element={<SettingsBusiness />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId("settings-business-page")).toBeTruthy());
    
    const colorPicker = screen.getByTestId("business-color-picker") as HTMLInputElement;
    const hexInput = screen.getByTestId("business-color-input") as HTMLInputElement;

    expect(colorPicker.value).toBe("#ff0000");
    expect(hexInput.value).toBe("#FF0000");

    fireEvent.change(colorPicker, { target: { value: "#00FF00" } });
    expect(hexInput.value).toBe("#00FF00");

    fireEvent.change(hexInput, { target: { value: "#0000FF" } });
    expect(colorPicker.value).toBe("#0000ff");
  });

  it("handles logo image error gracefully", async () => {
    await bootAuth(true);
    seedBusiness(BID);

    const mockBusinessSettings = {
      id: BID,
      name: "Toko Brand",
      business_type: "Fashion",
      logo_url: "https://invalid-domain-12345.com/broken-logo.png",
      brand_color: "#4F46E5",
      tagline: "Tagline",
      status: "ACTIVE",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify({ id: "1", email: "test@example.com" }), { status: 200 });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/settings/business/`)) {
        return new Response(JSON.stringify(mockBusinessSettings), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    render(
      <MemoryRouter initialEntries={["/settings/business"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/settings/business" element={<SettingsBusiness />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId("settings-business-page")).toBeTruthy());
    
    const logoPreview = screen.getByTestId("business-logo-preview");
    expect(logoPreview).toBeTruthy();
    
    if (logoPreview.tagName === "IMG") {
      fireEvent.error(logoPreview);
      await waitFor(() => {
        const fallback = screen.getByTestId("business-logo-preview");
        expect(fallback.textContent).toContain("Preview unavailable");
      });
    } else {
      expect(logoPreview.textContent).toContain("Preview unavailable");
    }
  });

  it("renders storefront logo", async () => {
    await bootAuth(false);

    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes(`/api/v1/stores/${SLUG}/products/`)) {
        return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/stores/${SLUG}/`)) {
        return new Response(
          JSON.stringify({ 
            id: "s1", 
            name: "Toko Brand", 
            slug: SLUG, 
            is_active: true,
            logo_url: "https://example.com/storefront-logo.png"
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    render(
      <MemoryRouter initialEntries={[`/store/${SLUG}`]}>
        <AuthProvider>
          <Routes>
            <Route path="/store/:slug" element={<Storefront />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId("storefront")).toBeTruthy());
    expect(screen.getByTestId("storefront-logo")).toBeTruthy();
  });

  it("renders storefront tagline", async () => {
    await bootAuth(false);

    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes(`/api/v1/stores/${SLUG}/products/`)) {
        return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/stores/${SLUG}/`)) {
        return new Response(
          JSON.stringify({ 
            id: "s1", 
            name: "Toko Brand", 
            slug: SLUG, 
            is_active: true,
            tagline: "Your Trusted Store"
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    render(
      <MemoryRouter initialEntries={[`/store/${SLUG}`]}>
        <AuthProvider>
          <Routes>
            <Route path="/store/:slug" element={<Storefront />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId("storefront")).toBeTruthy());
    expect(screen.getByTestId("storefront-tagline")).toBeTruthy();
    expect(screen.getByText("Your Trusted Store")).toBeTruthy();
  });

  it("applies storefront brand color", async () => {
    await bootAuth(false);

    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes(`/api/v1/stores/${SLUG}/products/`)) {
        return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/stores/${SLUG}/`)) {
        return new Response(
          JSON.stringify({ 
            id: "s1", 
            name: "Toko Brand", 
            slug: SLUG, 
            is_active: true,
            brand_color: "#FF5733"
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    render(
      <MemoryRouter initialEntries={[`/store/${SLUG}`]}>
        <AuthProvider>
          <Routes>
            <Route path="/store/:slug" element={<Storefront />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId("storefront")).toBeTruthy());
    
    const cartButton = screen.getByText("View Cart").closest("a");
    expect(cartButton).toBeTruthy();
    expect(cartButton?.style.backgroundColor).toBe("rgb(255, 87, 51)");
  });

  it("preserves existing testids", async () => {
    await bootAuth(true);
    seedBusiness(BID);

    const mockBusinessSettings = {
      id: BID,
      name: "Toko Brand",
      business_type: "Fashion",
      logo_url: null,
      brand_color: null,
      tagline: null,
      status: "ACTIVE",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify({ id: "1", email: "test@example.com" }), { status: 200 });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/settings/business/`)) {
        return new Response(JSON.stringify(mockBusinessSettings), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    render(
      <MemoryRouter initialEntries={["/settings/business"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/settings/business" element={<SettingsBusiness />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId("settings-business-page")).toBeTruthy());
    expect(screen.getByTestId("business-name-input")).toBeTruthy();
    expect(screen.getByTestId("business-logo-input")).toBeTruthy();
    expect(screen.getByTestId("business-color-input")).toBeTruthy();
    expect(screen.getByTestId("business-tagline-input")).toBeTruthy();
    expect(screen.getByTestId("save-business-settings-btn")).toBeTruthy();
  });
});
