import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider, useBusiness } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { Notifications } from "../pages/Notifications";

const BID_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const BID_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const NOTIFS_A = [
  {
    id: "notif-a",
    type: "info",
    title: "Notif A",
    message: "Msg A",
    is_read: false,
    created_at: "2024-01-01T00:00:00Z",
  },
];

const NOTIFS_B = [
  {
    id: "notif-b",
    type: "info",
    title: "Notif B",
    message: "Msg B",
    is_read: false,
    created_at: "2024-01-01T00:00:00Z",
  },
];

function seedBusinesses() {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([
      { id: BID_A, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" },
      { id: BID_B, name: "Toko B", status: "ACTIVE", created_at: "2024-01-02T00:00:00Z" },
    ])
  );
  localStorage.setItem("kopera_current_business", BID_A);
  localStorage.setItem("kopera_current_location", "l1");
}

function renderWithSwitch() {
  seedBusinesses();
  function Harness() {
    const b = useBusiness();
    return (
      <div>
        <div data-testid="ctx-biz">{b.currentBusinessId}</div>
        <button data-testid="switch-b" onClick={() => b.selectBusiness(BID_B)}>
          switch-b
        </button>
        <Notifications />
      </div>
    );
  }

  return render(
    <MemoryRouter initialEntries={["/notifications"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/notifications" element={<Harness />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("NotificationTenantIsolation", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("uses currentBusinessId from BusinessContext and reloads when business context switches", async () => {
    await bootAuth(true);
    const notifsByBiz: Record<string, typeof NOTIFS_A> = {
      [BID_A]: NOTIFS_A,
      [BID_B]: NOTIFS_B,
    };

    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      const m = String(url).match(/\/api\/v1\/businesses\/([^/]+)\/notifications\//);
      const biz = m ? m[1] : BID_A;
      return new Response(JSON.stringify(notifsByBiz[biz] ?? []), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    (globalThis as any).fetch = fetchMock;

    renderWithSwitch();

    await waitFor(() => expect(screen.getByTestId("notification-item-notif-a")).toBeTruthy());
    const calledA = fetchMock.mock.calls.some((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID_A}/notifications/`)
    );
    expect(calledA).toBe(true);

    screen.getByTestId("switch-b").click();

    await waitFor(() => expect(screen.getByTestId("notification-item-notif-b")).toBeTruthy());
    const calledB = fetchMock.mock.calls.some((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID_B}/notifications/`)
    );
    expect(calledB).toBe(true);
  });

  it("never sends business_id in request body or query parameter for tenant switching", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify(NOTIFS_A), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    (globalThis as any).fetch = fetchMock;

    renderWithSwitch();
    await waitFor(() => expect(screen.getByTestId("notification-item-notif-a")).toBeTruthy());

    fetchMock.mock.calls.forEach((c) => {
      const url = String(c[0]);
      if (url.includes("/notifications/")) {
        expect(url).not.toContain("business_id=");
        expect(url).not.toContain("business=");
        if (c[1]?.body) {
          expect(String(c[1].body)).not.toContain("business");
        }
      }
    });
  });
});