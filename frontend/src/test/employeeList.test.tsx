import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider, useBusiness } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { EmployeeList } from "../pages/EmployeeList";

const BID = "11111111-1111-1111-1111-111111111111";
const EID = "33333333-3333-3333-3333-333333333333";

const employee = {
  id: EID,
  business: BID,
  name: "Employee A",
  code: "EMP001",
  hire_date: "2024-01-01",
  active: true,
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

function renderList() {
  seedContext();
  return render(
    <MemoryRouter initialEntries={["/employees"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/employees" element={<EmployeeList />} />
            <Route
              path="/employees/:employeeId"
              element={<div data-testid="employee-detail-nav">{EID}</div>}
            />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("EmployeeList", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("requests employees for the active business and renders the returned plain array", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/employees/`)) {
        return new Response(JSON.stringify([employee]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderList();
    await waitFor(() => expect(screen.getByTestId("employee-list")).toBeTruthy());
    expect(screen.getByText("Employee A")).toBeTruthy();
  });

  it("shows a loading state", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response(JSON.stringify([employee]), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderList();
    expect(screen.getByTestId("employee-list-loading")).toBeTruthy();
  });

  it("handles an empty employee array with an empty state", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;
    renderList();
    await waitFor(() => expect(screen.getByTestId("employee-list-empty")).toBeTruthy());
  });

  it("handles an API error with a generic error state", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("Server error", { status: 500 });
    });
    (globalThis as any).fetch = fetchMock;
    renderList();
    await waitFor(() => expect(screen.getByTestId("employee-list-error")).toBeTruthy());
  });

  it("handles 401 gracefully by navigating to login", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes("/auth/token/refresh/")) {
        return new Response("Unauthorized", { status: 401 });
      }
      return new Response("Unauthorized", { status: 401 });
    });
    (globalThis as any).fetch = fetchMock;
    renderList();
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });
});
