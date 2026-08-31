import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth } from "./testUtils";
import { SettingsNotificationPrefs } from "../pages/SettingsNotificationPrefs";

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

describe("18. SETTINGS — Notification Preferences Tab GREEN", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders SettingsNotificationPrefs and submits toggled preferences", async () => {
    await bootAuth(true);
    seedBusiness(BID);

    const mockNotificationPrefs = {
      id: "n1",
      user: "u1",
      business: BID,
      receive_stock_alerts: true,
      receive_order_alerts: true,
      receive_payment_alerts: true,
      receive_subscription_alerts: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify({ id: "1", email: "a@b.com" }), { status: 200 });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/settings/notifications/`)) {
        if (init?.method === "PATCH") {
          const body = JSON.parse(init.body as string);
          return new Response(
            JSON.stringify({ ...mockNotificationPrefs, ...body }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response(JSON.stringify(mockNotificationPrefs), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    render(
      <MemoryRouter initialEntries={["/settings/notifications"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/settings/notifications" element={<SettingsNotificationPrefs />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId("settings-notifications-page")).toBeTruthy());
    await waitFor(() =>
      expect(screen.getByTestId("toggle-stock-alerts").getAttribute("aria-checked")).toBe("true")
    );

    fireEvent.click(screen.getByTestId("toggle-stock-alerts"));
    await waitFor(() =>
      expect(screen.getByTestId("toggle-stock-alerts").getAttribute("aria-checked")).toBe("false")
    );

    fireEvent.click(screen.getByTestId("save-notification-preferences-btn"));

    await waitFor(() => expect(screen.getByTestId("settings-notifications-success")).toBeTruthy());

    const patchCall = fetchMock.mock.calls.find(
      (c) =>
        String(c[0]).includes(`/api/v1/businesses/${BID}/settings/notifications/`) &&
        (c[1] as RequestInit | undefined)?.method === "PATCH"
    );
    expect(patchCall).toBeTruthy();
    const body = JSON.parse((patchCall![1] as RequestInit).body as string);
    expect(body.receive_stock_alerts).toBe(false);
  });
});
