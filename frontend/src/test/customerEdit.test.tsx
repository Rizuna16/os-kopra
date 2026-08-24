import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { CustomerEdit } from "../pages/CustomerEdit";

const BID = "11111111-1111-1111-1111-111111111111";
const CID = "33333333-3333-3333-3333-333333333333";

const existing = {
  id: CID,
  business: BID,
  name: "Customer A",
  phone: "081234567890",
  email: "a@customer.com",
  address: "Jl. Contoh 1",
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
    <MemoryRouter initialEntries={[`/customers/${CID}/edit`]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/customers/:customerId/edit" element={<CustomerEdit />} />
            <Route path="/customers/:customerId" element={<div data-testid="customer-detail-nav">Navigated</div>} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("CustomerEdit", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows a loading state while fetching existing customer", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response(JSON.stringify(existing), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderEdit();
    expect(screen.getByTestId("customer-edit-loading")).toBeTruthy();
  });

  it("loads the existing customer through GET and prefills all fields", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/customers/${CID}/`)) {
        return new Response(JSON.stringify(existing), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("customer-edit-submit")).toBeTruthy());
    expect((screen.getByTestId("customer-name-input") as HTMLInputElement).value).toBe("Customer A");
    expect((screen.getByTestId("customer-phone-input") as HTMLInputElement).value).toBe("081234567890");
    expect((screen.getByTestId("customer-email-input") as HTMLInputElement).value).toBe("a@customer.com");
    expect((screen.getByTestId("customer-address-input") as HTMLInputElement).value).toBe("Jl. Contoh 1");
  });

  it("updates using PATCH and sends exactly name, phone, email, address", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/customers/${CID}/`)) {
        if (init?.method === "GET") {
          return new Response(JSON.stringify(existing), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        expect(init?.method).toBe("PATCH");
        expect(init?.method).not.toBe("PUT");
        const body = JSON.parse(String(init?.body));
        expect(Object.keys(body).sort()).toEqual(["address", "email", "name", "phone"]);
        expect(body).not.toHaveProperty("business");
        expect(body).not.toHaveProperty("id");
        expect(body).not.toHaveProperty("created_at");
        expect(body).not.toHaveProperty("updated_at");
        return new Response(JSON.stringify({ ...existing, name: "Customer B" }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("customer-edit-submit")).toBeTruthy());
    screen.getByTestId("customer-edit-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("explicitly does NOT use PUT for update", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/customers/${CID}/`)) {
        if (init?.method === "GET") {
          return new Response(JSON.stringify(existing), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        expect(init?.method).toBe("PATCH");
        expect(init?.method).not.toBe("PUT");
        return new Response(JSON.stringify(existing), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("customer-edit-submit")).toBeTruthy());
    screen.getByTestId("customer-edit-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("rejects an empty name without calling PATCH", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/customers/${CID}/`)) {
        if (String(url).endsWith(CID + "/")) {
          return new Response(JSON.stringify(existing), { status: 200, headers: { "Content-Type": "application/json" } });
        }
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("customer-edit-submit")).toBeTruthy());
    const nameInput = screen.getByTestId("customer-name-input") as HTMLInputElement;
    nameInput.value = "";
    screen.getByTestId("customer-edit-submit").click();
    await waitFor(() => expect(screen.getByTestId("customer-edit-error")).toBeTruthy());
    const patchCalled = fetchMock.mock.calls.some(
      (c) => String(c[0]).includes(`/api/v1/businesses/${BID}/customers/${CID}/`) && c[1]?.method === "PATCH",
    );
    expect(patchCalled).toBe(false);
  });

  it("rejects a whitespace-only name without calling PATCH", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/customers/${CID}/`)) {
        if (String(url).endsWith(CID + "/")) {
          return new Response(JSON.stringify(existing), { status: 200, headers: { "Content-Type": "application/json" } });
        }
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("customer-edit-submit")).toBeTruthy());
    const nameInput = screen.getByTestId("customer-name-input") as HTMLInputElement;
    nameInput.value = "   ";
    screen.getByTestId("customer-edit-submit").click();
    await waitFor(() => expect(screen.getByTestId("customer-edit-error")).toBeTruthy());
    const patchCalled = fetchMock.mock.calls.some(
      (c) => String(c[0]).includes(`/api/v1/businesses/${BID}/customers/${CID}/`) && c[1]?.method === "PATCH",
    );
    expect(patchCalled).toBe(false);
  });

  it("sends empty optional fields as empty strings on update", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/customers/${CID}/`)) {
        if (init?.method === "GET") {
          return new Response(JSON.stringify(existing), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        const body = JSON.parse(String(init?.body));
        expect(body.phone).toBe("");
        expect(body.email).toBe("");
        expect(body.address).toBe("");
        return new Response(JSON.stringify(existing), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("customer-edit-submit")).toBeTruthy());
    const phoneInput = screen.getByTestId("customer-phone-input") as HTMLInputElement;
    const emailInput = screen.getByTestId("customer-email-input") as HTMLInputElement;
    const addressInput = screen.getByTestId("customer-address-input") as HTMLInputElement;
    phoneInput.value = "";
    emailInput.value = "";
    addressInput.value = "";
    screen.getByTestId("customer-edit-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("handles backend 400 field validation errors", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/customers/${CID}/`)) {
        if (init?.method === "GET") return new Response(JSON.stringify(existing), { status: 200, headers: { "Content-Type": "application/json" } });
        return new Response(
          JSON.stringify({ name: ["Name must not be empty or whitespace only."] }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("customer-edit-submit")).toBeTruthy());
    screen.getByTestId("customer-edit-submit").click();
    await waitFor(() => expect(screen.getByTestId("customer-edit-error")).toBeTruthy());
  });

  it("handles 401 gracefully by navigating to login", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/customers/${CID}/`)) {
        return new Response("Unauthorized", { status: 401 });
      }
      return new Response("Unauthorized", { status: 401 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });

  it("handles 404 gracefully with an error state", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/customers/${CID}/`)) {
        return new Response("Not found", { status: 404 });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("customer-edit-error")).toBeTruthy());
  });

  it("navigates to /customers/:customerId on successful update", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/customers/${CID}/`)) {
        if (init?.method === "GET") {
          return new Response(JSON.stringify(existing), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify(existing), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("customer-edit-submit")).toBeTruthy());
    screen.getByTestId("customer-edit-submit").click();
    await waitFor(() => expect(screen.getByTestId("customer-detail-nav")).toBeTruthy());
  });
});
