import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth } from "./testUtils";
import { Settings } from "../pages/Settings";
import { SettingsSecurity } from "../pages/SettingsSecurity";

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

describe("GAP-10: SETTINGS — Security Tab & Password Change", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders SettingsSecurity and successfully changes password via existing API", async () => {
    await bootAuth(true);
    seedBusiness(BID);

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify({ id: "1", email: "owner@kopera.id" }), { status: 200 });
      }
      if (String(url).includes("/auth/password/change/")) {
        if (init?.method === "POST") {
          const body = JSON.parse(init.body as string);
          if (body.current_password === "OldPass123!" && body.new_password === "NewPass123!" && body.new_password_confirm === "NewPass123!") {
            return new Response(JSON.stringify({ message: "Password changed successfully" }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ detail: "Invalid credentials" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    render(
      <MemoryRouter initialEntries={["/settings/security"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/:tab" element={<Settings />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId("settings-security-page")).toBeTruthy());

    const currentPassInput = screen.getByTestId("current-password-input") as HTMLInputElement;
    const newPassInput = screen.getByTestId("new-password-input") as HTMLInputElement;
    const confirmPassInput = screen.getByTestId("confirm-password-input") as HTMLInputElement;

    fireEvent.change(currentPassInput, { target: { value: "OldPass123!" } });
    fireEvent.change(newPassInput, { target: { value: "NewPass123!" } });
    fireEvent.change(confirmPassInput, { target: { value: "NewPass123!" } });

    fireEvent.click(screen.getByTestId("save-security-settings-btn"));

    await waitFor(() => expect(screen.getByTestId("settings-security-success")).toBeTruthy());
    expect(screen.getByTestId("settings-security-success").textContent).toContain("Password berhasil diubah");
  });

  it("handles password mismatch validation error", async () => {
    await bootAuth(true);
    seedBusiness(BID);

    render(
      <MemoryRouter initialEntries={["/settings/security"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/settings/security" element={<SettingsSecurity />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId("settings-security-page")).toBeTruthy());

    fireEvent.change(screen.getByTestId("current-password-input"), { target: { value: "OldPass123!" } });
    fireEvent.change(screen.getByTestId("new-password-input"), { target: { value: "NewPass123!" } });
    fireEvent.change(screen.getByTestId("confirm-password-input"), { target: { value: "MismatchPass123!" } });

    fireEvent.click(screen.getByTestId("save-security-settings-btn"));

    await waitFor(() => expect(screen.getByTestId("settings-security-error")).toBeTruthy());
    expect(screen.getByTestId("settings-security-error").textContent).toContain("Konfirmasi password baru tidak cocok");
  });
});
