import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { BatchList } from "../pages/BatchList";

const BID = "11111111-1111-1111-1111-111111111111";
const LOC = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const VID = "vvvvvvvv-vvvv-vvvv-vvvv-vvvvvvvvvvvv";
const BATCH_ID = "bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb";

function seedContext() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([{ id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" }]),
  );
  localStorage.setItem("kopera_current_business", BID);
  localStorage.setItem("kopera_current_location", LOC);
}

function renderBatch() {
  seedContext();
  return render(
    <MemoryRouter initialEntries={["/inventory/batches"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/inventory/batches" element={<BatchList />} />
            <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function batchResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: BATCH_ID,
    code: "BATCH-001",
    location: LOC,
    variant: VID,
    quantity: "10.00",
    expired_date: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("BatchList", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("GETs /api/v1/inventory/batches/ and renders a plain array with no pagination", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes("/api/v1/inventory/batches/")) {
        return new Response(JSON.stringify([batchResponse()]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderBatch();
    await waitFor(() => expect(screen.getByTestId("batch-list")).toBeTruthy());
    const called = fetchMock.mock.calls.some((c) => String(c[0]).includes("/api/v1/inventory/batches/"));
    expect(called).toBe(true);
  });

  it("renders batch code, quantity and expired_date", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/api/v1/inventory/batches/")) return new Response(JSON.stringify([batchResponse()]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200 });
    });
    renderBatch();
    await waitFor(() => expect(screen.getByText("BATCH-001")).toBeTruthy());
    await waitFor(() => expect(screen.getByText("10.00")).toBeTruthy());
  });

  it("submits a create with code, location, variant, quantity and expired_date", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes("/api/v1/inventory/batches/") && init?.method === "POST") {
        const body = JSON.parse(String(init?.body));
        expect(Object.keys(body).sort()).toEqual([
          "code",
          "expired_date",
          "location",
          "quantity",
          "variant",
        ]);
        return new Response(JSON.stringify(batchResponse()), { status: 201, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes("/api/v1/inventory/batches/")) {
        return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderBatch();
    await waitFor(() => expect(screen.getByTestId("batch-create-submit")).toBeTruthy());
    screen.getByTestId("batch-create-submit").click();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it("handles duplicate code (400)", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes("/api/v1/inventory/batches/") && init?.method === "POST") {
        return new Response(JSON.stringify({ code: ["Batch code already exists for this location."] }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes("/api/v1/inventory/batches/")) return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;
    renderBatch();
    await waitFor(() => expect(screen.getByTestId("batch-create-submit")).toBeTruthy());
    screen.getByTestId("batch-create-submit").click();
    await waitFor(() => expect(screen.getByTestId("batch-create-error")).toBeTruthy());
  });

  it("handles 401 by redirecting to login", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/api/v1/inventory/batches/")) return new Response("Unauthorized", { status: 401 });
      return new Response("[]", { status: 200 });
    });
    renderBatch();
    await waitFor(() => expect(screen.getByTestId("login-redirect")).toBeTruthy());
  });

  it("handles 404 gracefully", async () => {
    await bootAuth(true);
    (globalThis as any).fetch = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      if (String(url).includes("/api/v1/inventory/batches/")) return new Response("Not found", { status: 404 });
      return new Response("[]", { status: 200 });
    });
    renderBatch();
    await waitFor(() => expect(screen.getByTestId("batch-list-error")).toBeTruthy());
  });
});
