import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth } from "./testUtils";
import { SettingsCurrency } from "../pages/SettingsCurrency";

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

describe("18. SETTINGS — Currency Tab GREEN", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders SettingsCurrency and handles changes and submit", async () => {
    await bootAuth(true);
    seedBusiness(BID);

    const mockCurrencySettings = {
      id: "c1",
      business: BID,
      currency_code: "IDR",
      currency_symbol: "Rp",
      decimal_places: 0,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify({ id: "1", email: "a@b.com" }), { status: 200 });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/settings/currency/`)) {
        if (init?.method === "PATCH") {
          const body = JSON.parse(init.body as string);
          return new Response(JSON.stringify({ ...mockCurrencySettings, ...body }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify(mockCurrencySettings), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    render(
      <MemoryRouter initialEntries={["/settings/currency"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/settings/currency" element={<SettingsCurrency />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId("settings-currency-page")).toBeTruthy());
    
    const codeInput = screen.getByTestId("currency-code-input") as HTMLInputElement;
    expect(codeInput.value).toBe("IDR");

    fireEvent.change(codeInput, { target: { value: "USD" } });
    fireEvent.click(screen.getByTestId("save-currency-settings-btn"));

    await waitFor(() => expect(screen.getByTestId("settings-currency-success")).toBeTruthy());
    expect(codeInput.value).toBe("USD");
  });
});
