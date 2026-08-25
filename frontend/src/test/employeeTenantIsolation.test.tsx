import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider, useBusiness } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { EmployeeList } from "../pages/EmployeeList";

const BID_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const BID_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const EMPLOYEE_A = {
  id: "ea",
  business: BID_A,
  name: "Employee A",
  code: "EMP001",
  hire_date: "2024-01-01",
  active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};
const EMPLOYEE_B = {
  id: "eb",
  business: BID_B,
  name: "Employee B",
  code: "EMP002",
  hire_date: "2024-01-02",
  active: true,
  created_at: "2024-01-02T00:00:00Z",
  updated_at: "2024-01-02T00:00:00Z",
};

function renderWithSwitch() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([
      { id: BID_A, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" },
      { id: BID_B, name: "Toko B", status: "ACTIVE", created_at: "2024-01-02T00:00:00Z" },
    ]),
  );
  localStorage.setItem("kopera_current_business", BID_A);
  localStorage.setItem("kopera_current_location", "l1");

  function Harness() {
    const b = useBusiness();
    return (
      <div>
        <div data-testid="ctx-biz">{b.currentBusinessId}</div>
        <button data-testid="switch-b" onClick={() => b.selectBusiness(BID_B)}>
          switch-b
        </button>
        <EmployeeList />
      </div>
    );
  }

  return render(
    <MemoryRouter initialEntries={["/employees"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/employees" element={<Harness />} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("EmployeeTenantIsolation", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("uses currentBusinessId for Employee list, then reloads with new Business after switching", async () => {
    await bootAuth(true);
    const employeesByBiz: Record<string, unknown[]> = {
      [BID_A]: [EMPLOYEE_A],
      [BID_B]: [EMPLOYEE_B],
    };
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      const m = String(url).match(/\/api\/v1\/businesses\/([^/]+)\/employees\//);
      const biz = m ? m[1] : BID_A;
      return new Response(JSON.stringify(employeesByBiz[biz] ?? []), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;

    renderWithSwitch();

    await waitFor(() => expect(screen.getByText("Employee A")).toBeTruthy());
    const calledA = fetchMock.mock.calls.some((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID_A}/employees/`) &&
      (c[1]?.method ?? "GET") === "GET",
    );
    expect(calledA).toBe(true);

    screen.getByTestId("switch-b").click();

    await waitFor(() => expect(screen.queryByText("Employee A")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Employee B")).toBeTruthy());
    const calledB = fetchMock.mock.calls.some((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID_B}/employees/`) &&
      (c[1]?.method ?? "GET") === "GET",
    );
    expect(calledB).toBe(true);
  });

  it("never keeps a stale Employee A visible after switching business context", async () => {
    await bootAuth(true);
    const employeesByBiz: Record<string, unknown[]> = {
      [BID_A]: [EMPLOYEE_A],
      [BID_B]: [EMPLOYEE_B],
    };
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      const m = String(url).match(/\/api\/v1\/businesses\/([^/]+)\/employees\//);
      const biz = m ? m[1] : BID_A;
      return new Response(JSON.stringify(employeesByBiz[biz] ?? []), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    (globalThis as any).fetch = fetchMock;

    renderWithSwitch();
    await waitFor(() => expect(screen.getByText("Employee A")).toBeTruthy());
    screen.getByTestId("switch-b").click();
    await waitFor(() => expect(screen.queryByText("Employee A")).not.toBeInTheDocument());
  });

  it("never sends business in the request body", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID_A}/employees/`)) {
        return new Response(JSON.stringify([EMPLOYEE_A]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    renderWithSwitch();
    await waitFor(() => expect(screen.getByText("Employee A")).toBeTruthy());
    const bodyHasBusiness = fetchMock.mock.calls.some((c) => {
      const init = c[1];
      if (!init || init.method === "GET" || init.body === undefined) return false;
      return String(init.body).includes("business");
    });
    expect(bodyHasBusiness).toBe(false);
  });

  it("cannot silently accept cross-business access (response data is scoped to the active business only)", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID_A}/employees/`)) {
        return new Response(JSON.stringify([EMPLOYEE_A]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    renderWithSwitch();
    await waitFor(() => expect(screen.getByText("Employee A")).toBeTruthy());
    const crossBizLeak = fetchMock.mock.calls.some((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID_B}/employees/`),
    );
    expect(crossBizLeak).toBe(false);
  });
});
