import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { EmployeeDelete } from "../pages/EmployeeDelete";

const BID = "11111111-1111-1111-1111-111111111111";
const EID = "33333333-3333-3333-3333-333333333333";

function seedContext() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([{ id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" }]),
  );
  localStorage.setItem("kopera_current_business", BID);
  localStorage.setItem("kopera_current_location", "l1");
}

function renderDelete() {
  seedContext();
  return render(
    <MemoryRouter initialEntries={[`/employees/${EID}`]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/employees/:employeeId" element={<EmployeeDelete />} />
            <Route path="/employees" element={<div data-testid="employee-list-nav">List</div>} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function meFetch() {
  return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
}

describe("EmployeeDelete", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders a confirmation button", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return meFetch();
      return new Response("{}", { status: 200 });
    });
    renderDelete();
    expect(screen.getByTestId("employee-delete-confirm-button")).toBeTruthy();
  });

  it("sends DELETE to the exact business/employee endpoint and navigates on success", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return meFetch();
      if (init?.method === "DELETE") {
        expect(String(url)).toContain(`/api/v1/businesses/${BID}/employees/${EID}/`);
        return new Response(null, { status: 204 });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderDelete();
    await userEvent.click(screen.getByTestId("employee-delete-confirm-button"));
    await waitFor(() => expect(screen.getByTestId("employee-list-nav")).toBeTruthy());
  });

  it("handles 401 gracefully by navigating to login", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return meFetch();
      if (String(url).includes("/auth/token/refresh/")) return new Response("Unauthorized", { status: 401 });
      if (init?.method === "DELETE") return new Response("Unauthorized", { status: 401 });
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderDelete();
    await userEvent.click(screen.getByTestId("employee-delete-confirm-button"));
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });

  it("handles 404 gracefully with a generic error state", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return meFetch();
      if (init?.method === "DELETE") return new Response("Not found", { status: 404 });
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderDelete();
    await userEvent.click(screen.getByTestId("employee-delete-confirm-button"));
    await waitFor(() => expect(screen.getByTestId("employee-delete-error")).toBeTruthy());
  });
});
