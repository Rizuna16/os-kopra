import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { EmployeeDetail } from "../pages/EmployeeDetail";
import { EmployeeDelete } from "../pages/EmployeeDelete";

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

function renderDetail() {
  seedContext();
  return render(
    <MemoryRouter initialEntries={[`/employees/${EID}`]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/employees/:employeeId" element={<><EmployeeDetail /><EmployeeDelete /></>} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("EmployeeDetail", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows a loading state", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response(JSON.stringify(employee), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderDetail();
    expect(screen.getByTestId("employee-detail-loading")).toBeTruthy();
  });

  it("loads the correct employee id and renders all fields", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/employees/${EID}/`)) {
        return new Response(JSON.stringify(employee), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("employee-detail")).toBeTruthy());
    expect(screen.getByTestId("employee-detail-id").textContent).toBe(EID);
    expect(screen.getByTestId("employee-detail-name").textContent).toBe("Employee A");
    expect(screen.getByTestId("employee-detail-code").textContent).toBe("EMP001");
    expect(screen.getByTestId("employee-detail-hire-date").textContent).toBe("2024-01-01");
    expect(screen.getByTestId("employee-detail-active").textContent).toBe("true");
  });

  it("handles 404 gracefully with a generic error state", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/employees/${EID}/`)) {
        return new Response("Not found", { status: 404 });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("employee-detail-error")).toBeTruthy());
  });

  it("handles 401 gracefully by navigating to login", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes("/auth/token/refresh/")) return new Response("Unauthorized", { status: 401 });
      if (String(url).includes(`/api/v1/businesses/${BID}/employees/${EID}/`)) {
        return new Response("Unauthorized", { status: 401 });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderDetail();
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });
});
