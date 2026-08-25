import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { EmployeeCreate } from "../pages/EmployeeCreate";

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
    <MemoryRouter initialEntries={["/employees/new"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/employees/new" element={<EmployeeCreate />} />
            <Route path="/employees" element={<div data-testid="employee-list-nav">List</div>} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("EmployeeCreate", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders form elements and data-testid attributes", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response("{}", { status: 200 });
    });
    renderCreate();
    expect(screen.getByTestId("employee-create-form")).toBeTruthy();
    expect(screen.getByTestId("employee-name-input")).toBeTruthy();
    expect(screen.getByTestId("employee-code-input")).toBeTruthy();
    expect(screen.getByTestId("employee-hire-date-input")).toBeTruthy();
    expect(screen.getByTestId("employee-active-input")).toBeTruthy();
    expect(screen.getByTestId("employee-create-submit")).toBeTruthy();
  });

  it("submits the form successfully and navigates back to list", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (init?.method === "POST") {
        return new Response(
          JSON.stringify({
            id: "e1",
            business: BID,
            name: "Budi",
            code: "EMP001",
            hire_date: "2024-01-01",
            active: true,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();

    await userEvent.type(screen.getByTestId("employee-name-input"), "Budi");
    await userEvent.type(screen.getByTestId("employee-code-input"), "EMP001");
    await userEvent.type(screen.getByTestId("employee-hire-date-input"), "2024-01-01");
    await userEvent.click(screen.getByTestId("employee-create-submit"));

    await waitFor(() => expect(screen.getByTestId("employee-list-nav")).toBeTruthy());
  });

  it("shows validation error when name is empty", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response("{}", { status: 200 });
    });
    renderCreate();
    await userEvent.click(screen.getByTestId("employee-create-submit"));
    expect(screen.getByTestId("employee-create-error")).toBeTruthy();
  });

  it("handles a 400 field error without faking success", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (init?.method === "POST") {
        return new Response(
          JSON.stringify({ name: ["This field is required."] }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await userEvent.type(screen.getByTestId("employee-name-input"), "Budi");
    await userEvent.click(screen.getByTestId("employee-create-submit"));
    await waitFor(() => expect(screen.getByTestId("employee-create-error")).toBeTruthy());
  });

  it("handles 401 gracefully by navigating to login", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes("/auth/token/refresh/")) return new Response("Unauthorized", { status: 401 });
      if (init?.method === "POST") return new Response("Unauthorized", { status: 401 });
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await userEvent.type(screen.getByTestId("employee-name-input"), "Budi");
    await userEvent.click(screen.getByTestId("employee-create-submit"));
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });
});
