import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { LoyaltyProgramEdit } from "../pages/LoyaltyProgramEdit";

const BID = "11111111-1111-1111-1111-111111111111";
const PROGID = "33333333-3333-3333-3333-333333333333";

const program = {
  id: PROGID,
  business: BID,
  name: "Loyalty Pro",
  status: "ACTIVE",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

function seedContext() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([{ id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" }]),
  );
  localStorage.setItem("kopera_current_business", BID);
  localStorage.setItem("kopera_current_location", "l1");
}

function renderEdit() {
  seedContext();
  return render(
    <MemoryRouter initialEntries={[`/loyalty-programs/${PROGID}/edit`]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/loyalty-programs/:programId/edit" element={<LoyaltyProgramEdit />} />
            <Route path="/loyalty-programs/:programId" element={<div data-testid="loyalty-program-detail-nav">Navigated</div>} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("LoyaltyProgramEdit", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows a loading state while fetching", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response(JSON.stringify(program), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderEdit();
    expect(screen.getByTestId("loyalty-program-edit-loading")).toBeTruthy();
  });

  it("loads the program and pre-fills the form", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/loyalty-programs/${PROGID}/`)) {
        return new Response(JSON.stringify(program), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("loyalty-program-edit-form")).toBeTruthy());
    expect((screen.getByTestId("loyalty-program-name-input") as HTMLInputElement).value).toBe("Loyalty Pro");
  });

  it("rejects empty name without calling the API", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/loyalty-programs/${PROGID}/`)) {
        return new Response(JSON.stringify(program), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("loyalty-program-edit-submit")).toBeTruthy());
    (screen.getByTestId("loyalty-program-name-input") as HTMLInputElement).value = "";
    screen.getByTestId("loyalty-program-edit-submit").click();
    await waitFor(() => expect(screen.getByTestId("loyalty-program-edit-error")).toBeTruthy());
    const calls = fetchMock.mock.calls.filter((c) => String(c[0]).includes(`/api/v1/businesses/${BID}/loyalty-programs/${PROGID}/`) && c[1]?.method === "PATCH");
    expect(calls.length).toBe(0);
  });

  it("submits a valid update via PATCH with only writable fields", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/loyalty-programs/${PROGID}/`)) {
        if (init?.method === "PATCH") {
          expect(init.method).toBe("PATCH");
          const body = JSON.parse(String(init.body));
          expect(Object.keys(body).sort()).toEqual(["name", "status"]);
          expect(body).not.toHaveProperty("business");
          expect(body).not.toHaveProperty("id");
          expect(body).not.toHaveProperty("created_at");
          expect(body).not.toHaveProperty("updated_at");
          return new Response(JSON.stringify({ ...program, name: "Loyalty Pro 2" }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify(program), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("loyalty-program-edit-submit")).toBeTruthy());
    (screen.getByTestId("loyalty-program-name-input") as HTMLInputElement).value = "Loyalty Pro 2";
    screen.getByTestId("loyalty-program-edit-submit").click();
    await waitFor(() => expect(screen.getByTestId("loyalty-program-detail-nav")).toBeTruthy());
  });

  it("handles backend 400 error", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/loyalty-programs/${PROGID}/`) && init?.method === "PATCH") {
        return new Response(
          JSON.stringify({ name: ["Name must not be empty or whitespace only."] }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/loyalty-programs/${PROGID}/`)) {
        return new Response(JSON.stringify(program), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("loyalty-program-edit-submit")).toBeTruthy());
    (screen.getByTestId("loyalty-program-name-input") as HTMLInputElement).value = "Loyalty Pro 2";
    screen.getByTestId("loyalty-program-edit-submit").click();
    await waitFor(() => expect(screen.getByTestId("loyalty-program-edit-error")).toBeTruthy());
  });

  it("handles 401 gracefully by navigating to login", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes("/auth/token/refresh/")) return new Response("Unauthorized", { status: 401 });
      if (String(url).includes(`/api/v1/businesses/${BID}/loyalty-programs/${PROGID}/`)) {
        return new Response("Unauthorized", { status: 401 });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });
});
