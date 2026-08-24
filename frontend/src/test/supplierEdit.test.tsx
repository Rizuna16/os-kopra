import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { SupplierEdit } from "../pages/SupplierEdit";

const BID = "11111111-1111-1111-1111-111111111111";
const SID = "33333333-3333-3333-3333-333333333333";

const existing = {
  id: SID,
  business: BID,
  name: "Supplier A",
  phone: "081234567890",
  email: "a@supplier.com",
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
    <MemoryRouter initialEntries={[`/suppliers/${SID}/edit`]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/suppliers/:supplierId/edit" element={<SupplierEdit />} />
            <Route path="/suppliers/:supplierId" element={<div data-testid="supplier-detail-nav">Navigated</div>} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("SupplierEdit", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows a loading state while fetching existing supplier", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response(JSON.stringify(existing), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    renderEdit();
    expect(screen.getByTestId("supplier-edit-loading")).toBeTruthy();
  });

  it("loads the existing supplier through GET and prefills all fields", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/suppliers/${SID}/`)) {
        return new Response(JSON.stringify(existing), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("supplier-edit-submit")).toBeTruthy());
    expect((screen.getByTestId("supplier-name-input") as HTMLInputElement).value).toBe("Supplier A");
    expect((screen.getByTestId("supplier-phone-input") as HTMLInputElement).value).toBe("081234567890");
    expect((screen.getByTestId("supplier-email-input") as HTMLInputElement).value).toBe("a@supplier.com");
    expect((screen.getByTestId("supplier-address-input") as HTMLInputElement).value).toBe("Jl. Contoh 1");
  });

  it("updates using PATCH and sends exactly name, phone, email, address", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/suppliers/${SID}/`)) {
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
        return new Response(JSON.stringify({ ...existing, name: "Supplier B" }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("supplier-edit-submit")).toBeTruthy());
    screen.getByTestId("supplier-edit-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("explicitly does NOT use PUT for update", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/suppliers/${SID}/`)) {
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
    await waitFor(() => expect(screen.getByTestId("supplier-edit-submit")).toBeTruthy());
    screen.getByTestId("supplier-edit-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("rejects an empty name without calling PATCH", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/suppliers/${SID}/`)) {
        if (String(url).endsWith(SID + "/")) {
          return new Response(JSON.stringify(existing), { status: 200, headers: { "Content-Type": "application/json" } });
        }
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("supplier-edit-submit")).toBeTruthy());
    const nameInput = screen.getByTestId("supplier-name-input") as HTMLInputElement;
    nameInput.value = "";
    screen.getByTestId("supplier-edit-submit").click();
    await waitFor(() => expect(screen.getByTestId("supplier-edit-error")).toBeTruthy());
    const patchCalled = fetchMock.mock.calls.some(
      (c) => String(c[0]).includes(`/api/v1/businesses/${BID}/suppliers/${SID}/`) && c[1]?.method === "PATCH",
    );
    expect(patchCalled).toBe(false);
  });

  it("rejects a whitespace-only name without calling PATCH", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/suppliers/${SID}/`)) {
        if (String(url).endsWith(SID + "/")) {
          return new Response(JSON.stringify(existing), { status: 200, headers: { "Content-Type": "application/json" } });
        }
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("supplier-edit-submit")).toBeTruthy());
    const nameInput = screen.getByTestId("supplier-name-input") as HTMLInputElement;
    nameInput.value = "   ";
    screen.getByTestId("supplier-edit-submit").click();
    await waitFor(() => expect(screen.getByTestId("supplier-edit-error")).toBeTruthy());
    const patchCalled = fetchMock.mock.calls.some(
      (c) => String(c[0]).includes(`/api/v1/businesses/${BID}/suppliers/${SID}/`) && c[1]?.method === "PATCH",
    );
    expect(patchCalled).toBe(false);
  });

  it("sends empty optional fields as empty strings on update", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/suppliers/${SID}/`)) {
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
    await waitFor(() => expect(screen.getByTestId("supplier-edit-submit")).toBeTruthy());
    const phoneInput = screen.getByTestId("supplier-phone-input") as HTMLInputElement;
    const emailInput = screen.getByTestId("supplier-email-input") as HTMLInputElement;
    const addressInput = screen.getByTestId("supplier-address-input") as HTMLInputElement;
    phoneInput.value = "";
    emailInput.value = "";
    addressInput.value = "";
    screen.getByTestId("supplier-edit-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("handles backend 400 field validation errors", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/suppliers/${SID}/`)) {
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
    await waitFor(() => expect(screen.getByTestId("supplier-edit-submit")).toBeTruthy());
    screen.getByTestId("supplier-edit-submit").click();
    await waitFor(() => expect(screen.getByTestId("supplier-edit-error")).toBeTruthy());
  });

  it("handles duplicate name error via errors.name", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/suppliers/${SID}/`)) {
        if (init?.method === "GET") return new Response(JSON.stringify(existing), { status: 200, headers: { "Content-Type": "application/json" } });
        return new Response(
          JSON.stringify({ name: ["Supplier with this name already exists."] }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("supplier-edit-submit")).toBeTruthy());
    screen.getByTestId("supplier-edit-submit").click();
    await waitFor(() => expect(screen.getByTestId("supplier-edit-error")).toBeTruthy());
  });

  it("handles duplicate name error via errors.non_field_errors", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/suppliers/${SID}/`)) {
        if (init?.method === "GET") return new Response(JSON.stringify(existing), { status: 200, headers: { "Content-Type": "application/json" } });
        return new Response(
          JSON.stringify({ non_field_errors: ["Supplier with this name already exists."] }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("supplier-edit-submit")).toBeTruthy());
    screen.getByTestId("supplier-edit-submit").click();
    await waitFor(() => expect(screen.getByTestId("supplier-edit-error")).toBeTruthy());
  });

  it("handles 401 gracefully by navigating to login", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/suppliers/${SID}/`)) {
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
      if (String(url).includes(`/api/v1/businesses/${BID}/suppliers/${SID}/`)) {
        return new Response("Not found", { status: 404 });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("supplier-edit-error")).toBeTruthy());
  });

  it("navigates to /suppliers/:supplierId on successful update", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/suppliers/${SID}/`)) {
        if (init?.method === "GET") {
          return new Response(JSON.stringify(existing), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify(existing), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderEdit();
    await waitFor(() => expect(screen.getByTestId("supplier-edit-submit")).toBeTruthy());
    screen.getByTestId("supplier-edit-submit").click();
    await waitFor(() => expect(screen.getByTestId("supplier-detail-nav")).toBeTruthy());
  });
});
