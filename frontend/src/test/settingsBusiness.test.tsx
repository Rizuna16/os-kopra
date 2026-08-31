import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth } from "./testUtils";
import { SettingsBusiness } from "../pages/SettingsBusiness";

const BID = "33333333-3333-3333-3333-333333333333";

function seedBusiness(businessId: string) {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([
      { id: businessId, name: "Toko Settings", status: "ONBOARDING", created_at: "2024-01-01T00:00:00Z" },
    ])
  );
  localStorage.setItem("kopera_current_business", businessId);
}

describe("18. SETTINGS — Business Tab GREEN", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders SettingsBusiness and handles changes and submit", async () => {
    await bootAuth(true);
    seedBusiness(BID);

    const mockBusinessSettings = {
      id: BID,
      name: "Toko Settings",
      business_type: "Fashion",
      logo_url: "https://logo.com",
      brand_color: "#4F46E5",
      tagline: "Retail",
      status: "ACTIVE",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify({ id: "1", email: "a@b.com" }), { status: 200 });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/settings/business/`)) {
        if (init?.method === "PATCH") {
          const body = JSON.parse(init.body as string);
          return new Response(JSON.stringify({ ...mockBusinessSettings, ...body }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
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
    
    const nameInput = screen.getByTestId("business-name-input") as HTMLInputElement;
    expect(nameInput.value).toBe("Toko Settings");

    fireEvent.change(nameInput, { target: { value: "Toko Settings Updated" } });
    fireEvent.click(screen.getByTestId("save-business-settings-btn"));

    await waitFor(() => expect(screen.getByTestId("settings-business-success")).toBeTruthy());
    expect(nameInput.value).toBe("Toko Settings Updated");
  });
});
