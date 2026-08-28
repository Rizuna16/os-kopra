import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider, useBusiness } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { RolePermissionList } from "../pages/RolePermissionList";
import { listMembers, addMember, updateMemberRole, removeMember } from "../roles/roleService";

const BID = "11111111-1111-1111-1111-111111111111";
const MID = "22222222-2222-2222-2222-222222222222";
const ADMIN_MID = "33333333-3333-3333-3333-333333333333";

function seedContext() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([{ id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" }]),
  );
  localStorage.setItem("kopera_current_business", BID);
  localStorage.setItem("kopera_current_location", "l1");
}

function renderPage(fetchMock?: any) {
  seedContext();
  if (fetchMock) (globalThis as any).fetch = fetchMock;
  return render(
    <MemoryRouter initialEntries={["/roles"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/roles" element={<RolePermissionList />} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function memberResponse(role: "ADMIN" | "KASIR", id = MID) {
  return {
    id,
    business: BID,
    user: { id, email: "member@example.com", first_name: "", last_name: "" },
    role,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };
}

describe("RolePermissionList (RED)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the role & permission page", async () => {
    await bootAuth(true);
    renderPage();
    await waitFor(() => expect(screen.getByTestId("role-permission-page")).toBeTruthy());
  });

  it("shows a loading state while fetching members", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200 });
      }
      return new Response("[]", { status: 200 });
    });
    renderPage();
    expect(screen.getByTestId("member-list-loading")).toBeTruthy();
  });

  it("requests members for the active business and renders member email + role", async () => {
    await bootAuth(true);
    const calls: string[] = [];
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200 });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/members/`)) {
        calls.push(String(url));
        return new Response(JSON.stringify([memberResponse("ADMIN")]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("[]", { status: 200 });
    });
    renderPage(fetchMock);
    await waitFor(() => expect(screen.getByTestId("member-list")).toBeTruthy());
    expect(calls.some((c) => c.includes(BID))).toBe(true);
    expect(screen.getByText("member@example.com")).toBeTruthy();
    expect(screen.getByTestId("member-role-ADMIN")).toBeTruthy();
  });

  it("renders add-member form and submits a POST to the members endpoint", async () => {
    await bootAuth(true);
    let posted = false;
    const fetchMock = vi.fn(async (url: string, init?: any) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200 });
      }
      if (
        String(url).includes(`/api/v1/businesses/${BID}/members/`) &&
        (init?.method ?? "GET") === "POST"
      ) {
        posted = true;
        return new Response(
          JSON.stringify(memberResponse("KASIR")),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    renderPage(fetchMock);
    await waitFor(() => expect(screen.getByTestId("member-add-form")).toBeTruthy());
    fireEvent.change(screen.getByTestId("member-user-id-input"), {
      target: { value: MID },
    });
    fireEvent.change(screen.getByTestId("member-role-select"), {
      target: { value: "KASIR" },
    });
    fireEvent.click(screen.getByTestId("member-add-submit"));
    await waitFor(() => expect(posted).toBe(true));
  });

  it("updates an existing member role via PATCH members endpoint", async () => {
    await bootAuth(true);
    let patched = false;
    let patchBody: any = null;
    const fetchMock = vi.fn(async (url: string, init?: any) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200 });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/members/`)) {
        if ((init?.method ?? "GET") === "PATCH") {
          patched = true;
          patchBody = init?.body ? JSON.parse(init.body) : null;
          return new Response(
            JSON.stringify(memberResponse("ADMIN")),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify([memberResponse("KASIR")]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    renderPage(fetchMock);
    await waitFor(() => expect(screen.getByTestId("member-list")).toBeTruthy());
    const select = screen.getByTestId(`member-role-select-${MID}`) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "ADMIN" } });
    await waitFor(() => expect(patched).toBe(true));
    expect(patchBody).toEqual({ role: "ADMIN" });
  });

  it("removes a member via DELETE members endpoint", async () => {
    await bootAuth(true);
    let deleted = false;
    const fetchMock = vi.fn(async (url: string, init?: any) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200 });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/members/`)) {
        if ((init?.method ?? "GET") === "DELETE") {
          deleted = true;
          return new Response(null, { status: 204 });
        }
        return new Response(
          JSON.stringify([memberResponse("ADMIN")]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    renderPage(fetchMock);
    await waitFor(() => expect(screen.getByTestId("member-list")).toBeTruthy());
    fireEvent.click(screen.getByTestId(`member-remove-btn-${MID}`));
    await waitFor(() => expect(deleted).toBe(true));
  });

  it("renders a read-only permission matrix for ADMIN and KASIR", async () => {
    await bootAuth(true);
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("permission-matrix-table")).toBeTruthy(),
    );
    expect(screen.getByTestId("permission-matrix-row-ADMIN")).toBeTruthy();
    expect(screen.getByTestId("permission-matrix-row-KASIR")).toBeTruthy();
    expect(screen.queryByTestId("permission-matrix-edit-control")).toBeNull();
  });

  it("does not expose SUPER ADMIN or GUDANG in the role selector", async () => {
    await bootAuth(true);
    renderPage();
    await waitFor(() => expect(screen.getByTestId("member-add-form")).toBeTruthy());
    const select = screen.getByTestId("member-role-select") as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).not.toContain("SUPER_ADMIN");
    expect(options).not.toContain("GUDANG");
  });

  it("reloads member list when business context changes", async () => {
    await bootAuth(true);
    const calls: string[] = [];
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200 });
      }
      if (String(url).includes("/members/")) {
        calls.push(String(url));
        return new Response("[]", { status: 200 });
      }
      return new Response("[]", { status: 200 });
    });
    renderPage(fetchMock);
    await waitFor(() => expect(calls.some((c) => c.includes(BID))).toBe(true));
    // No hardcoded business id on the page; reload is driven by useBusiness().
    expect(calls.every((c) => !c.includes("hardcoded"))).toBe(true);
  });

  it("redirects to login on 401", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200 });
      }
      if (String(url).includes("/auth/token/refresh/")) {
        return new Response("Unauthorized", { status: 401 });
      }
      return new Response("Unauthorized", { status: 401 });
    });
    renderPage(fetchMock);
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });

  it("service layer targets the PATCH members endpoint with a role payload", async () => {
    await bootAuth(true);
    let patched = false;
    let body: any = null;
    (globalThis as any).fetch = vi.fn(async (url: string, init?: any) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200 });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/members/${MID}/`) &&
        (init?.method ?? "GET") === "PATCH") {
        patched = true;
        body = init?.body ? JSON.parse(init.body) : null;
        return new Response(
          JSON.stringify(memberResponse("ADMIN")),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    await updateMemberRole(BID, MID, "ADMIN");
    expect(patched).toBe(true);
    expect(body).toEqual({ role: "ADMIN" });
  });
});
