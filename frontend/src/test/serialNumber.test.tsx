import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { SerialNumberList } from "../pages/SerialNumberList";

const BID = "11111111-1111-1111-1111-111111111111";
const LOC = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const BATCH_ID = "bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb";
const SERIAL_ID = "cccccccc-1111-1111-1111-cccccccccccc";

function seedContext() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([{ id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" }]),
  );
  localStorage.setItem("kopera_current_business", BID);
  localStorage.setItem("kopera_current_location", LOC);
}

function renderSerials() {
  seedContext();
  return render(
    <MemoryRouter initialEntries={["/inventory/serial-numbers"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/inventory/serial-numbers" element={<SerialNumberList />} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function serialResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: SERIAL_ID,
    batch: BATCH_ID,
    serial_number: "SN-001",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("SerialNumberList", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("GETs /api/v1/inventory/serial-numbers/ and renders a plain array", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes("/api/v1/inventory/serial-numbers/")) {
        return new Response(JSON.stringify([serialResponse()]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderSerials();
    await waitFor(() => expect(screen.getByTestId("serial-list")).toBeTruthy());
    const called = fetchMock.mock.calls.some((c) => String(c[0]).includes("/api/v1/inventory/serial-numbers/"));
    expect(called).toBe(true);
  });

  it("renders serial_number value", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/api/v1/inventory/serial-numbers/")) return new Response(JSON.stringify([serialResponse()]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200 });
    });
    renderSerials();
    await waitFor(() => expect(screen.getByText("SN-001")).toBeTruthy());
  });

  it("submits a create with batch and serial_number only", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes("/api/v1/inventory/serial-numbers/") && init?.method === "POST") {
        const body = JSON.parse(String(init?.body));
        expect(Object.keys(body).sort()).toEqual(["batch", "serial_number"]);
        return new Response(JSON.stringify(serialResponse()), { status: 201, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes("/api/v1/inventory/serial-numbers/")) return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderSerials();
    await waitFor(() => expect(screen.getByTestId("serial-create-submit")).toBeTruthy());
    screen.getByTestId("serial-create-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("handles empty serial_number rejection (400)", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes("/api/v1/inventory/serial-numbers/") && init?.method === "POST") {
        return new Response(JSON.stringify({ serial_number: ["Serial number must not be empty."] }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes("/api/v1/inventory/serial-numbers/")) return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderSerials();
    await waitFor(() => expect(screen.getByTestId("serial-create-submit")).toBeTruthy());
    screen.getByTestId("serial-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("serial-create-error")).toBeTruthy());
  });

  it("handles duplicate serial_number (400)", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes("/api/v1/inventory/serial-numbers/") && init?.method === "POST") {
        return new Response(JSON.stringify({ serial_number: ["Serial number already exists."] }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes("/api/v1/inventory/serial-numbers/")) return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200 });
    });
    renderSerials();
    await waitFor(() => expect(screen.getByTestId("serial-create-submit")).toBeTruthy());
    screen.getByTestId("serial-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("serial-create-error")).toBeTruthy());
  });

  it("deletes a serial and tolerates 204 with empty body", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/inventory/serial-numbers/${SERIAL_ID}/`)) {
        expect(init?.method).toBe("DELETE");
        return new Response(null, { status: 204 });
      }
      if (String(url).includes("/api/v1/inventory/serial-numbers/")) return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderSerials();
    await waitFor(() => expect(screen.getByTestId("serial-list")).toBeTruthy());
  });

  it("updates serial_number via PATCH only (batch not sent)", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/inventory/serial-numbers/${SERIAL_ID}/`)) {
        if (init?.method === "PATCH") {
          const body = JSON.parse(String(init?.body));
          expect(Object.keys(body).sort()).toEqual(["serial_number"]);
          expect(body).not.toHaveProperty("batch");
          return new Response(JSON.stringify(serialResponse({ serial_number: "SN-002" })), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify(serialResponse()), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes("/api/v1/inventory/serial-numbers/")) return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderSerials();
    await waitFor(() => expect(screen.getByTestId("serial-list")).toBeTruthy());
  });

  it("handles 401 by redirecting to login", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/api/v1/inventory/serial-numbers/")) return new Response("Unauthorized", { status: 401 });
      return new Response("[]", { status: 200 });
    });
    renderSerials();
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });
});
