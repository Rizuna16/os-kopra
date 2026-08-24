import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BusinessProvider } from "../business/BusinessContext";
import { AppLayout } from "../layouts/AppLayout";
import { AuthProvider } from "../auth/AuthContext";
import { bootAuth } from "./testUtils";

describe("Business selector in AppLayout", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the current business name", async () => {
    await bootAuth(true);
    localStorage.setItem(
      "kopera_businesses",
      JSON.stringify([
        { id: "b1", name: "Toko Satu", status: "ONBOARDING", created_at: "2024-01-01T00:00:00Z" },
        { id: "b2", name: "Toko Dua", status: "ACTIVE", created_at: "2024-01-02T00:00:00Z" },
      ]),
    );
    localStorage.setItem("kopera_current_business", "b1");
    render(
      <MemoryRouter>
        <AuthProvider>
          <BusinessProvider>
            <AppLayout><div data-testid="app-body" /></AppLayout>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("business-selector")).toBeTruthy(),
    );
    expect(screen.getByTestId("business-selector").textContent).toContain(
      "Toko Satu",
    );
  });

  it("lists all stored businesses in the selector", async () => {
    await bootAuth(true);
    localStorage.setItem(
      "kopera_businesses",
      JSON.stringify([
        { id: "b1", name: "Toko Satu", status: "ONBOARDING", created_at: "2024-01-01T00:00:00Z" },
        { id: "b2", name: "Toko Dua", status: "ACTIVE", created_at: "2024-01-02T00:00:00Z" },
      ]),
    );
    localStorage.setItem("kopera_current_business", "b1");
    render(
      <MemoryRouter>
        <AuthProvider>
          <BusinessProvider>
            <AppLayout><div data-testid="app-body" /></AppLayout>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("business-selector-list")).toBeTruthy(),
    );
    expect(screen.getByTestId("business-selector-list").textContent).toContain(
      "Toko Satu",
    );
    expect(screen.getByTestId("business-selector-list").textContent).toContain(
      "Toko Dua",
    );
  });

  it("selecting another business changes currentBusinessId", async () => {
    await bootAuth(true);
    localStorage.setItem(
      "kopera_businesses",
      JSON.stringify([
        { id: "b1", name: "Toko Satu", status: "ONBOARDING", created_at: "2024-01-01T00:00:00Z" },
        { id: "b2", name: "Toko Dua", status: "ACTIVE", created_at: "2024-01-02T00:00:00Z" },
      ]),
    );
    localStorage.setItem("kopera_current_business", "b1");
    render(
      <MemoryRouter>
        <AuthProvider>
          <BusinessProvider>
            <AppLayout><div data-testid="app-body" /></AppLayout>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("business-selector")).toBeTruthy(),
    );
    screen.getByTestId("business-selector-option-b2").click();
    await waitFor(() =>
      expect(
        screen.getByTestId("business-selector").textContent,
      ).toContain("Toko Dua"),
    );
  });

  it("selecting another business triggers location refresh", async () => {
    await bootAuth(true);
    localStorage.setItem(
      "kopera_businesses",
      JSON.stringify([
        { id: "b1", name: "Toko Satu", status: "ONBOARDING", created_at: "2024-01-01T00:00:00Z" },
        { id: "b2", name: "Toko Dua", status: "ACTIVE", created_at: "2024-01-02T00:00:00Z" },
      ]),
    );
    localStorage.setItem("kopera_current_business", "b1");
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/api/v1/businesses/b2/locations/")) {
        return new Response(JSON.stringify([{ id: "l2", name: "Cabang Dua" }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    (globalThis as any).fetch = fetchMock;
    render(
      <MemoryRouter>
        <AuthProvider>
          <BusinessProvider>
            <AppLayout><div data-testid="app-body" /></AppLayout>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("business-selector")).toBeTruthy(),
    );
    screen.getByTestId("business-selector-option-b2").click();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/businesses/b2/locations/"),
        expect.any(Object),
      ),
    );
  });

  it("selected business persists in localStorage", async () => {
    await bootAuth(true);
    localStorage.setItem(
      "kopera_businesses",
      JSON.stringify([
        { id: "b1", name: "Toko Satu", status: "ONBOARDING", created_at: "2024-01-01T00:00:00Z" },
        { id: "b2", name: "Toko Dua", status: "ACTIVE", created_at: "2024-01-02T00:00:00Z" },
      ]),
    );
    localStorage.setItem("kopera_current_business", "b1");
    render(
      <MemoryRouter>
        <AuthProvider>
          <BusinessProvider>
            <AppLayout><div data-testid="app-body" /></AppLayout>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("business-selector")).toBeTruthy(),
    );
    screen.getByTestId("business-selector-option-b2").click();
    await waitFor(() =>
      expect(localStorage.getItem("kopera_current_business")).toBe("b2"),
    );
  });

  it("stale business is handled safely (not selectable)", async () => {
    await bootAuth(true);
    localStorage.setItem(
      "kopera_businesses",
      JSON.stringify([
        { id: "b1", name: "Toko Satu", status: "ONBOARDING", created_at: "2024-01-01T00:00:00Z" },
        { id: "b2", name: "Toko Dua", status: "ACTIVE", created_at: "2024-01-02T00:00:00Z" },
      ]),
    );
    localStorage.setItem("kopera_current_business", "b1");
    render(
      <MemoryRouter>
        <AuthProvider>
          <BusinessProvider>
            <AppLayout><div data-testid="app-body" /></AppLayout>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("business-selector")).toBeTruthy(),
    );
    expect(
      screen.queryByTestId("business-selector-option-b3"),
    ).not.toBeInTheDocument();
  });
});
