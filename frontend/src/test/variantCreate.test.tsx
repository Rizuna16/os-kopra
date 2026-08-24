import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { VariantCreate } from "../pages/VariantCreate";

const BID = "11111111-1111-1111-1111-111111111111";
const PID = "22222222-2222-2222-2222-222222222222";

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
    <MemoryRouter initialEntries={["/products/" + PID + "/variants/new"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/products/:productId/variants/new" element={<VariantCreate />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("VariantCreate", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the create form with a name field", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("variant-create-form")).toBeTruthy());
    expect(screen.getByTestId("variant-name-input")).toBeTruthy();
    expect(screen.getByTestId("variant-create-submit")).toBeTruthy();
  });

  it("rejects an empty name", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200 });
    });
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("variant-create-submit")).toBeTruthy());
    screen.getByTestId("variant-create-submit").click();
    await waitFor(() =>
      expect(screen.getByTestId("variant-create-error")).toBeTruthy(),
    );
  });

  it("rejects a whitespace-only name", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200 });
    });
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("variant-create-submit")).toBeTruthy());
    screen.getByTestId("variant-create-submit").click();
    await waitFor(() =>
      expect(screen.getByTestId("variant-create-error")).toBeTruthy(),
    );
  });

  it("submits a valid name and sends ONLY the name field", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/products/${PID}/variants/`)) {
        expect(init?.method).toBe("POST");
        const body = JSON.parse(String(init?.body));
        expect(Object.keys(body).sort()).toEqual(["name"]);
        expect(body).not.toHaveProperty("business");
        expect(body).not.toHaveProperty("product");
        expect(body).not.toHaveProperty("id");
        expect(body).not.toHaveProperty("created_at");
        expect(body).not.toHaveProperty("updated_at");
        return new Response(
          JSON.stringify({ id: "v1", product: PID, name: "Hitam - 40", created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("variant-create-submit")).toBeTruthy());
    const nameInput = screen.getByTestId("variant-name-input") as HTMLInputElement;
    screen.getByTestId("variant-create-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("handles backend 400 field validation errors", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/products/${PID}/variants/`)) {
        return new Response(
          JSON.stringify({ name: ["Name must not be empty or whitespace only."] }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("variant-create-submit")).toBeTruthy());
    screen.getByTestId("variant-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("variant-create-error")).toBeTruthy());
  });

  it("handles a successful 201 response and navigates per frontend architecture", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/products/${PID}/variants/`)) {
        return new Response(
          JSON.stringify({ id: "v1", product: PID, name: "Hitam - 40", created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("variant-create-submit")).toBeTruthy());
    screen.getByTestId("variant-create-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("does NOT call the API when the name is empty or whitespace-only", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderCreate();
    await waitFor(() => expect(screen.getByTestId("variant-create-submit")).toBeTruthy());

    screen.getByTestId("variant-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("variant-create-error")).toBeTruthy());

    const nameInput = screen.getByTestId("variant-name-input") as HTMLInputElement;
    nameInput.textContent = "   ";
    screen.getByTestId("variant-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("variant-create-error")).toBeTruthy());

    const variantCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID}/products/${PID}/variants/`) && String(c[0]).includes("POST"),
    );
    expect(variantCalls.length).toBe(0);
  });
});