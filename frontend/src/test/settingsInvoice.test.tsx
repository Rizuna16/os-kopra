import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth } from "./testUtils";
import { SettingsInvoice } from "../pages/SettingsInvoice";

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

describe("18. SETTINGS — Invoice Tab GREEN", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders SettingsInvoice and handles changes and submit", async () => {
    await bootAuth(true);
    seedBusiness(BID);

    const mockInvoiceSettings = {
      id: "i1",
      business: BID,
      invoice_prefix: "INV-",
      invoice_next_number: 1,
      invoice_notes: "",
      invoice_footer: "",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify({ id: "1", email: "a@b.com" }), { status: 200 });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/settings/invoice/`)) {
        if (init?.method === "PATCH") {
          const body = JSON.parse(init.body as string);
          return new Response(JSON.stringify({ ...mockInvoiceSettings, ...body }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify(mockInvoiceSettings), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    render(
      <MemoryRouter initialEntries={["/settings/invoice"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/settings/invoice" element={<SettingsInvoice />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId("settings-invoice-page")).toBeTruthy());
    
    const prefixInput = screen.getByTestId("invoice-prefix-input") as HTMLInputElement;
    expect(prefixInput.value).toBe("INV-");

    fireEvent.change(prefixInput, { target: { value: "FTR-" } });
    fireEvent.click(screen.getByTestId("save-invoice-settings-btn"));

    await waitFor(() => expect(screen.getByTestId("settings-invoice-success")).toBeTruthy());
    expect(prefixInput.value).toBe("FTR-");
  });
});
