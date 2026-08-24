import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { SupplierCreate } from "../pages/SupplierCreate";

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
    <MemoryRouter initialEntries={["/suppliers/new"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/suppliers/new" element={<SupplierCreate />} />
            <Route path="/suppliers" element={<div data-testid="supplier-list-nav">Navigated</div>} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("SupplierCreate", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the create form with name, phone, email, address fields", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response("[]", { status: 200 });
    });
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("supplier-create-form")).toBeTruthy());
    expect(screen.getByTestId("supplier-name-input")).toBeTruthy();
    expect(screen.getByTestId("supplier-phone-input")).toBeTruthy();
    expect(screen.getByTestId("supplier-email-input")).toBeTruthy();
    expect(screen.getByTestId("supplier-address-input")).toBeTruthy();
    expect(screen.getByTestId("supplier-create-submit")).toBeTruthy();
  });

  it("rejects an empty name without calling the API", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("supplier-create-submit")).toBeTruthy());
    screen.getByTestId("supplier-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("supplier-create-error")).toBeTruthy());
    const supplierCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID}/suppliers/`),
    );
    expect(supplierCalls.length).toBe(0);
  });

  it("rejects a whitespace-only name without calling the API", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("supplier-create-submit")).toBeTruthy());
    const nameInput = screen.getByTestId("supplier-name-input") as HTMLInputElement;
    nameInput.value = "   ";
    screen.getByTestId("supplier-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("supplier-create-error")).toBeTruthy());
    const supplierCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID}/suppliers/`),
    );
    expect(supplierCalls.length).toBe(0);
  });

  it("submits a valid name and sends name, phone, email, address (empty optionals as empty strings)", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200 });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/suppliers/`)) {
        expect(init?.method).toBe("POST");
        const body = JSON.parse(String(init?.body));
        expect(Object.keys(body).sort()).toEqual(["address", "email", "name", "phone"]);
        expect(body.name).toBe("Supplier A");
        expect(body.phone).toBe("");
        expect(body.email).toBe("");
        expect(body.address).toBe("");
        expect(body).not.toHaveProperty("business");
        expect(body).not.toHaveProperty("id");
        expect(body).not.toHaveProperty("created_at");
        expect(body).not.toHaveProperty("updated_at");
        return new Response(
          JSON.stringify({ id: "s1", business: BID, name: "Supplier A", phone: "", email: "", address: "", created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("supplier-create-submit")).toBeTruthy());
    const nameInput = screen.getByTestId("supplier-name-input") as HTMLInputElement;
    nameInput.value = "Supplier A";
    screen.getByTestId("supplier-create-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("handles backend 400 name error", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/suppliers/`)) {
        return new Response(
          JSON.stringify({ name: ["Name must not be empty or whitespace only."] }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("supplier-create-submit")).toBeTruthy());
    const nameInput = screen.getByTestId("supplier-name-input") as HTMLInputElement;
    nameInput.value = "Supplier A";
    screen.getByTestId("supplier-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("supplier-create-error")).toBeTruthy());
  });

  it("handles backend 400 email error (email validation delegated to backend)", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/suppliers/`)) {
        return new Response(
          JSON.stringify({ email: ["Enter a valid email address."] }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("supplier-create-submit")).toBeTruthy());
    const nameInput = screen.getByTestId("supplier-name-input") as HTMLInputElement;
    nameInput.value = "Supplier A";
    screen.getByTestId("supplier-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("supplier-create-error")).toBeTruthy());
  });

  it("handles backend 400 phone error", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/suppliers/`)) {
        return new Response(
          JSON.stringify({ phone: ["Enter a valid phone number."] }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("supplier-create-submit")).toBeTruthy());
    const nameInput = screen.getByTestId("supplier-name-input") as HTMLInputElement;
    nameInput.value = "Supplier A";
    screen.getByTestId("supplier-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("supplier-create-error")).toBeTruthy());
  });

  it("handles backend 400 address error", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/suppliers/`)) {
        return new Response(
          JSON.stringify({ address: ["Address too long."] }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("supplier-create-submit")).toBeTruthy());
    const nameInput = screen.getByTestId("supplier-name-input") as HTMLInputElement;
    nameInput.value = "Supplier A";
    screen.getByTestId("supplier-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("supplier-create-error")).toBeTruthy());
  });

  it("handles backend duplicate name error via errors.name", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/suppliers/`)) {
        return new Response(
          JSON.stringify({ name: ["Supplier with this name already exists."] }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("supplier-create-submit")).toBeTruthy());
    const nameInput = screen.getByTestId("supplier-name-input") as HTMLInputElement;
    nameInput.value = "Supplier A";
    screen.getByTestId("supplier-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("supplier-create-error")).toBeTruthy());
  });

  it("handles backend duplicate name error via errors.non_field_errors", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/suppliers/`)) {
        return new Response(
          JSON.stringify({ non_field_errors: ["Supplier with this name already exists."] }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("supplier-create-submit")).toBeTruthy());
    const nameInput = screen.getByTestId("supplier-name-input") as HTMLInputElement;
    nameInput.value = "Supplier A";
    screen.getByTestId("supplier-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("supplier-create-error")).toBeTruthy());
  });

  it("handles 401 gracefully by navigating to login", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/suppliers/`)) {
        return new Response("Unauthorized", { status: 401 });
      }
      return new Response("Unauthorized", { status: 401 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });

  it("navigates to /suppliers on successful creation", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200 });
      if (String(url).includes(`/api/v1/businesses/${BID}/suppliers/`)) {
        return new Response(
          JSON.stringify({ id: "s1", business: BID, name: "Supplier A", phone: "", email: "", address: "", created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("supplier-create-submit")).toBeTruthy());
    const nameInput = screen.getByTestId("supplier-name-input") as HTMLInputElement;
    nameInput.value = "Supplier A";
    screen.getByTestId("supplier-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("supplier-list-nav")).toBeTruthy());
  });
});
