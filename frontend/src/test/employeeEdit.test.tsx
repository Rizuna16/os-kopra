import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { EmployeeEdit } from "../pages/EmployeeEdit";

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

function renderEdit() {
  seedContext();
  return render(
    <MemoryRouter initialEntries={[`/employees/${EID}/edit`]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/employees/:employeeId/edit" element={<EmployeeEdit />} />
            <Route path="/employees/:employeeId" element={<div data-testid="employee-detail-nav">Detail</div>} />
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

describe("EmployeeEdit", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows a loading state", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return meFetch();
      return new Response(JSON.stringify(employee), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderEdit();
    expect(screen.getByTestId("employee-edit-loading")).toBeTruthy();
  });

  it("fetches the employee and populates name, code, hire_date and active fields", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return meFetch();
      if (String(url).includes(`/api/v1/businesses/${BID}/employees/${EID}/`)) {
        return new Response(JSON.stringify(employee), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("employee-edit-form")).toBeTruthy());
    expect((screen.getByTestId("employee-edit-name-input") as HTMLInputElement).value).toBe("Employee A");
    expect((screen.getByTestId("employee-edit-code-input") as HTMLInputElement).value).toBe("EMP001");
    expect((screen.getByTestId("employee-edit-hire-date-input") as HTMLInputElement).value).toBe("2024-01-01");
  });

  it("submits the updated fields successfully and navigates to detail", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return meFetch();
      if (init?.method === "GET") {
        return new Response(JSON.stringify(employee), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (init?.method === "PATCH") {
        return new Response(
          JSON.stringify({ ...employee, name: "Employee B" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("employee-edit-form")).toBeTruthy());
    await userEvent.clear(screen.getByTestId("employee-edit-name-input"));
    await userEvent.type(screen.getByTestId("employee-edit-name-input"), "Employee B");
    await userEvent.click(screen.getByTestId("employee-edit-submit"));
    await waitFor(() => expect(screen.getByTestId("employee-detail-nav")).toBeTruthy());
  });

  it("shows validation error when name is empty", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return meFetch();
      if (init?.method === "GET") {
        return new Response(JSON.stringify(employee), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("employee-edit-form")).toBeTruthy());
    await userEvent.clear(screen.getByTestId("employee-edit-name-input"));
    await userEvent.click(screen.getByTestId("employee-edit-submit"));
    expect(screen.getByTestId("employee-edit-error")).toBeTruthy();
  });

  it("handles a 400 field error without faking success", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return meFetch();
      if (init?.method === "GET") {
        return new Response(JSON.stringify(employee), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (init?.method === "PATCH") {
        return new Response(
          JSON.stringify({ code: ["Employee with this code already exists for the business."] }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("employee-edit-form")).toBeTruthy());
    await userEvent.click(screen.getByTestId("employee-edit-submit"));
    await waitFor(() => expect(screen.getByTestId("employee-edit-error")).toBeTruthy());
  });

  it("handles 401 gracefully by navigating to login", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return meFetch();
      if (String(url).includes("/auth/token/refresh/")) return new Response("Unauthorized", { status: 401 });
      if (init?.method === "GET") {
        return new Response(JSON.stringify(employee), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (init?.method === "PATCH") return new Response("Unauthorized", { status: 401 });
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("employee-edit-form")).toBeTruthy());
    await userEvent.click(screen.getByTestId("employee-edit-submit"));
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });

  it("handles 404 gracefully with a generic error state", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return meFetch();
      if (init?.method === "GET" && String(url).includes(`/employees/${EID}/`)) {
        return new Response("Not found", { status: 404 });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("employee-edit-error")).toBeTruthy());
  });
});
