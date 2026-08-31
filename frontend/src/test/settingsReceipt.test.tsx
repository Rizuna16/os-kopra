import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth } from "./testUtils";
import { SettingsReceipt } from "../pages/SettingsReceipt";

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

describe("18. SETTINGS — Receipt Tab GREEN", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders SettingsReceipt and handles changes and submit", async () => {
    await bootAuth(true);
    seedBusiness(BID);

    const mockReceiptSettings = {
      id: "r1",
      business: BID,
      receipt_prefix: "RCT-",
      receipt_next_number: 1,
      receipt_notes: "",
      receipt_footer: "",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify({ id: "1", email: "a@b.com" }), { status: 200 });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/settings/receipt/`)) {
        if (init?.method === "PATCH") {
          const body = JSON.parse(init.body as string);
          return new Response(JSON.stringify({ ...mockReceiptSettings, ...body }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify(mockReceiptSettings), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    render(
      <MemoryRouter initialEntries={["/settings/receipt"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/settings/receipt" element={<SettingsReceipt />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId("settings-receipt-page")).toBeTruthy());
    
    const prefixInput = screen.getByTestId("receipt-prefix-input") as HTMLInputElement;
    expect(prefixInput.value).toBe("RCT-");

    fireEvent.change(prefixInput, { target: { value: "RCP-" } });
    fireEvent.click(screen.getByTestId("save-receipt-settings-btn"));

    await waitFor(() => expect(screen.getByTestId("settings-receipt-success")).toBeTruthy());
    expect(prefixInput.value).toBe("RCP-");
  });
});
