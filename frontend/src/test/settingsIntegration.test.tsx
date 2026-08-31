import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth } from "./testUtils";
import { SettingsIntegration } from "../pages/SettingsIntegration";

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

describe("18. SETTINGS — Integration Tab GREEN", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders SettingsIntegration and handles changes and submit", async () => {
    await bootAuth(true);
    seedBusiness(BID);

    const mockIntegrationSettings = {
      id: "int1",
      business: BID,
      storefront_url: "/store/toko/",
      webhook_url: "https://hook.com",
      api_docs_url: "/api/v1/docs/",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify({ id: "1", email: "a@b.com" }), { status: 200 });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/settings/integration/`)) {
        if (init?.method === "PATCH") {
          const body = JSON.parse(init.body as string);
          return new Response(JSON.stringify({ ...mockIntegrationSettings, ...body }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify(mockIntegrationSettings), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    render(
      <MemoryRouter initialEntries={["/settings/integration"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/settings/integration" element={<SettingsIntegration />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId("settings-integration-page")).toBeTruthy());
    
    const webhookInput = screen.getByTestId("webhook-url-input") as HTMLInputElement;
    expect(webhookInput.value).toBe("https://hook.com");

    fireEvent.change(webhookInput, { target: { value: "https://hook2.com" } });
    fireEvent.click(screen.getByTestId("save-integration-settings-btn"));

    await waitFor(() => expect(screen.getByTestId("settings-integration-success")).toBeTruthy());
    expect(webhookInput.value).toBe("https://hook2.com");
  });
});
