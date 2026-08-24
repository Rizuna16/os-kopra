import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BusinessProvider } from "../business/BusinessContext";
import { AppLayout } from "../layouts/AppLayout";
import { AuthProvider } from "../auth/AuthContext";
import { bootAuth, userObj } from "./testUtils";

const BIZ_B1 = {
  id: "b1",
  name: "Toko Satu",
  status: "ONBOARDING" as const,
  created_at: "2024-01-01T00:00:00Z",
};

describe("Location selector in AppLayout", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows the current location for the selected business", async () => {
    await bootAuth(true);
    localStorage.setItem(
      "kopera_businesses",
      JSON.stringify([
        {
          id: "b1",
          name: "Toko Satu",
          status: "ONBOARDING",
          created_at: "2024-01-01T00:00:00Z",
        },
      ]),
    );
    localStorage.setItem("kopera_current_location", "l1");
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
      expect(screen.getByTestId("location-selector")).toBeTruthy(),
    );
    expect(screen.getByTestId("location-selector").textContent).toContain("l1");
  });

  it("selecting a location changes currentLocationId", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (String(url).includes("/businesses/b1/locations/")) {
        return new Response(
          JSON.stringify([
            { id: "l1", name: "Toko Utama" },
            { id: "l2", name: "Cabang Dua" },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    localStorage.setItem(
      "kopera_businesses",
      JSON.stringify([BIZ_B1]),
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
      expect(screen.getByTestId("location-selector")).toBeTruthy(),
    );
    await waitFor(() =>
      expect(screen.getByTestId("location-selector-option-l2")).toBeTruthy(),
    );
    screen.getByTestId("location-selector-option-l2").click();
    await waitFor(() =>
      expect(localStorage.getItem("kopera_current_location")).toBe("l2"),
    );
    expect(screen.getByTestId("location-selector").textContent).toContain(
      "Cabang Dua",
    );
  });

  it("current location persists after selection change", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (String(url).includes("/businesses/b1/locations/")) {
        return new Response(
          JSON.stringify([{ id: "l1", name: "Toko Utama" }]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    localStorage.setItem(
      "kopera_businesses",
      JSON.stringify([BIZ_B1]),
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
      expect(screen.getByTestId("location-selector")).toBeTruthy(),
    );
    await waitFor(() =>
      expect(screen.getByTestId("location-selector-option-l1")).toBeTruthy(),
    );
    screen.getByTestId("location-selector-option-l1").click();
    await waitFor(() =>
      expect(localStorage.getItem("kopera_current_location")).toBe("l1"),
    );
  });

  it("switching business replaces the location list", async () => {
    await bootAuth(true);
    localStorage.setItem(
      "kopera_businesses",
      JSON.stringify([
        BIZ_B1,
        {
          id: "b2",
          name: "Toko Dua",
          status: "ACTIVE",
          created_at: "2024-01-02T00:00:00Z",
        },
      ]),
    );
    localStorage.setItem("kopera_current_business", "b1");
    localStorage.setItem("kopera_current_location", "l1");
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (String(url).includes("/businesses/b1/locations/")) {
        return new Response(
          JSON.stringify([
            { id: "l1", name: "Toko Utama" },
            { id: "l2", name: "Cabang Satu" },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (String(url).includes("/businesses/b2/locations/")) {
        return new Response(
          JSON.stringify([
            { id: "l3", name: "Cabang Dua" },
            { id: "l4", name: "Cabang Empat" },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
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
      expect(screen.getByTestId("location-selector")).toBeTruthy(),
    );
    await waitFor(
      () => {
        const calledB1 = fetchMock.mock.calls.some((c) =>
          String(c[0]).includes("/businesses/b1/locations/"),
        );
        expect(calledB1, "b1 locations should be fetched").toBe(true);
      },
      { timeout: 3000 },
    );
    await waitFor(() =>
      expect(screen.getByTestId("location-selector-list").textContent).toContain(
        "Toko Utama",
      ),
    );
    screen.getByTestId("business-selector-option-b2").click();
    await waitFor(() => {
      const calledB2 = fetchMock.mock.calls.some((c) =>
        String(c[0]).includes("/businesses/b2/locations/"),
      );
      expect(calledB2, "b2 locations should be fetched after switching").toBe(
        true,
      );
    });
    await waitFor(() =>
      expect(screen.getByTestId("location-selector-list").textContent).toContain(
        "Cabang Dua",
      ),
    );
    expect(screen.getByTestId("location-selector-list").textContent).not.toContain(
      "Toko Utama",
    );
  });

  it("location from another business cannot become the current location", async () => {
    await bootAuth(true);
    localStorage.setItem(
      "kopera_businesses",
      JSON.stringify([
        {
          id: "b1",
          name: "Toko Satu",
          status: "ONBOARDING",
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "b2",
          name: "Toko Dua",
          status: "ACTIVE",
          created_at: "2024-01-02T00:00:00Z",
        },
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
      expect(screen.getByTestId("location-selector")).toBeTruthy(),
    );
    expect(
      screen.queryByTestId("location-selector-option-l2"),
    ).not.toBeInTheDocument();
  });
});
