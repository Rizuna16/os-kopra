import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth } from "./testUtils";
import { SettingsTax } from "../pages/SettingsTax";

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

describe("18. SETTINGS — Tax Tab GREEN", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders SettingsTax and handles changes and submit", async () => {
    await bootAuth(true);
    seedBusiness(BID);

    const mockTaxSettings = {
      id: "t1",
      business: BID,
      tax_rate: "10.00",
      tax_name: "PPN",
      tax_inclusive: false,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify({ id: "1", email: "a@b.com" }), { status: 200 });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/settings/tax/`)) {
        if (init?.method === "PATCH") {
          const body = JSON.parse(init.body as string);
          return new Response(JSON.stringify({ ...mockTaxSettings, ...body }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify(mockTaxSettings), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    render(
      <MemoryRouter initialEntries={["/settings/tax"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/settings/tax" element={<SettingsTax />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId("settings-tax-page")).toBeTruthy());
    
    const rateInput = screen.getByTestId("tax-rate-input") as HTMLInputElement;
    expect(rateInput.value).toBe("10.00");

    fireEvent.change(rateInput, { target: { value: "11" } });
    fireEvent.click(screen.getByTestId("save-tax-settings-btn"));

    await waitFor(() => expect(screen.getByTestId("settings-tax-success")).toBeTruthy());
    expect(rateInput.value).toBe("11");
  });
});
