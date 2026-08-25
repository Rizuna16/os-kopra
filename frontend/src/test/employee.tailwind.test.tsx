import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { EmployeeList } from "../pages/EmployeeList";
import { EmployeeCreate } from "../pages/EmployeeCreate";
import { EmployeeDetail } from "../pages/EmployeeDetail";
import { EmployeeEdit } from "../pages/EmployeeEdit";
import { EmployeeDelete } from "../pages/EmployeeDelete";

const BID = "11111111-1111-1111-1111-111111111111";
const EID = "44444444-4444-4444-4444-444444444444";

const mockEmployee = {
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

function setupFetchMock() {
  return vi.fn(async (url: string) => {
    const u = String(url);
    if (u.includes("/auth/me/")) {
      return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (u.includes(`/api/v1/businesses/${BID}/employees/`)) {
      if (u.match(/\/employees\/[^/]+\/?$/)) {
        return new Response(JSON.stringify(mockEmployee), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify([mockEmployee]), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response("[]", { status: 200 });
  });
}

describe("Employee — Tailwind UI Normalization contract", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("EmployeeList has baseline root, container, card, title, list items", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={["/employees"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/employees" element={<EmployeeList />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("employee-list")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="employee-list"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
  });

  it("EmployeeCreate has baseline root, container, card, title, inputs, button", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={["/employees/new"]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/employees/new" element={<EmployeeCreate />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("employee-create-form")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="employee-create-form"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
    const nameInput = screen.getByTestId("employee-name-input");
    expect(nameInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");
    const codeInput = screen.getByTestId("employee-code-input");
    expect(codeInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");
    const hireDateInput = screen.getByTestId("employee-hire-date-input");
    expect(hireDateInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");
    const submitBtn = screen.getByTestId("employee-create-submit");
    expect(submitBtn).toHaveClass("py-3", "px-4", "bg-blue-600", "hover:bg-blue-700", "font-medium", "text-sm", "text-white", "rounded-xl", "shadow-sm", "transition-colors", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:ring-offset-2", "disabled:opacity-50", "disabled:cursor-not-allowed");
  });

  it("EmployeeDetail has baseline root, container, card, title, detail fields", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={[`/employees/${EID}`]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/employees/:employeeId" element={<EmployeeDetail />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("employee-detail")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="employee-detail"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
  });

  it("EmployeeEdit has baseline root, container, card, title, inputs, button", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={[`/employees/${EID}/edit`]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/employees/:employeeId/edit" element={<EmployeeEdit />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("employee-edit-form")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="employee-edit-form"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const title = card?.querySelector("h1.text-2xl.font-bold.tracking-tight.text-gray-900");
    expect(title).toBeInTheDocument();
    const nameInput = screen.getByTestId("employee-edit-name-input");
    expect(nameInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");
    const codeInput = screen.getByTestId("employee-edit-code-input");
    expect(codeInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");
    const hireDateInput = screen.getByTestId("employee-edit-hire-date-input");
    expect(hireDateInput).toHaveClass("w-full", "px-4", "py-2.5", "text-sm", "rounded-xl", "border", "border-gray-300", "bg-white", "text-gray-900", "placeholder-gray-400", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:border-transparent", "transition-all");
    const submitBtn = screen.getByTestId("employee-edit-submit");
    expect(submitBtn).toHaveClass("py-3", "px-4", "bg-blue-600", "hover:bg-blue-700", "font-medium", "text-sm", "text-white", "rounded-xl", "shadow-sm", "transition-colors", "focus:outline-none", "focus:ring-2", "focus:ring-blue-600", "focus:ring-offset-2", "disabled:opacity-50", "disabled:cursor-not-allowed");
  });

  it("EmployeeDelete has baseline root, container, card, delete button", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = setupFetchMock();
    seedContext();
    render(
      <MemoryRouter initialEntries={[`/employees/${EID}`]}>
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              <Route path="/employees/:employeeId" element={<EmployeeDelete />} />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId("employee-delete")).toBeTruthy());

    const root = document.body.querySelector('[data-testid="employee-delete"]')?.closest(".min-h-screen.bg-gray-50");
    expect(root).toBeInTheDocument();
    const container = root?.querySelector(".w-full.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-6");
    expect(container).toBeInTheDocument();
    const card = container?.querySelector(".bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.sm\\:p-6");
    expect(card).toBeInTheDocument();
    const deleteBtn = screen.getByTestId("employee-delete-confirm-button");
    expect(deleteBtn).toHaveClass("bg-red-600", "hover:bg-red-700", "font-medium", "text-sm", "text-white", "rounded-xl", "shadow-sm", "transition-colors", "focus:outline-none", "focus:ring-2", "focus:ring-red-600", "focus:ring-offset-2", "disabled:opacity-50", "disabled:cursor-not-allowed");
  });
});
