import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { LoyaltyProgramCreate } from "../pages/LoyaltyProgramCreate";

const BID = "11111111-1111-1111-1111-111111111111";

function seedContext() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([{ id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" }]),
  );
  localStorage.setItem("kopera_current_business", BID);
  localStorage.setItem("kopera_current_location", "l1");
}

function renderCreate() {
  seedContext();
  return render(
    <MemoryRouter initialEntries={["/loyalty-programs/new"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/loyalty-programs/new" element={<LoyaltyProgramCreate />} />
            <Route path="/loyalty-programs" element={<div data-testid="loyalty-program-list-nav">Navigated</div>} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

const validProgram = {
  id: "lp1",
  business: BID,
  name: "Loyalty Pro",
  status: "ACTIVE",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("LoyaltyProgramCreate", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the create form with name and status fields", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("loyalty-program-create-form")).toBeTruthy());
    expect(screen.getByTestId("loyalty-program-name-input")).toBeTruthy();
    expect(screen.getByTestId("loyalty-program-status-input")).toBeTruthy();
    expect(screen.getByTestId("loyalty-program-create-submit")).toBeTruthy();
  });

  it("rejects an empty name without calling the API", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("loyalty-program-create-submit")).toBeTruthy());
    screen.getByTestId("loyalty-program-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("loyalty-program-create-error")).toBeTruthy());
    const calls = fetchMock.mock.calls.filter((c) => String(c[0]).includes(`/api/v1/businesses/${BID}/loyalty-programs/`));
    expect(calls.length).toBe(0);
  });

  it("submits a valid program and sends only name and status", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/loyalty-programs/`)) {
        expect(init?.method).toBe("POST");
        const body = JSON.parse(String(init?.body));
        expect(Object.keys(body).sort()).toEqual(["name", "status"]);
        expect(body).not.toHaveProperty("business");
        expect(body).not.toHaveProperty("id");
        expect(body).not.toHaveProperty("created_at");
        expect(body).not.toHaveProperty("updated_at");
        expect(body.name).toBe("Loyalty Pro");
        return new Response(JSON.stringify(validProgram), { status: 201, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("loyalty-program-create-submit")).toBeTruthy());
    (screen.getByTestId("loyalty-program-name-input") as HTMLInputElement).value = "Loyalty Pro";
    screen.getByTestId("loyalty-program-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("loyalty-program-list-nav")).toBeTruthy());
  });

  it("handles backend 400 name error", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/loyalty-programs/`)) {
        return new Response(
          JSON.stringify({ name: ["Name must not be empty or whitespace only."] }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("loyalty-program-create-submit")).toBeTruthy());
    (screen.getByTestId("loyalty-program-name-input") as HTMLInputElement).value = "Loyalty Pro";
    screen.getByTestId("loyalty-program-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("loyalty-program-create-error")).toBeTruthy());
  });

  it("handles 401 gracefully by navigating to login", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/loyalty-programs/`)) {
        return new Response("Unauthorized", { status: 401 });
      }
      return new Response("Unauthorized", { status: 401 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });
});
