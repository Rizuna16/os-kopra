import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { Notifications } from "../pages/Notifications";

const BID = "11111111-1111-1111-1111-111111111111";

function seedCurrentBusiness(businessId: string) {
  localStorage.setItem(
    "kopera_businesses",
    JSON.stringify([
      { id: BID, name: "Toko A", status: "ACTIVE", created_at: "2024-01-01T00:00:00Z" },
    ])
  );
  localStorage.setItem("kopera_current_business", businessId);
  localStorage.setItem("kopera_current_location", "l1");
}

function renderNotifications() {
  seedCurrentBusiness(BID);
  return render(
    <MemoryRouter initialEntries={["/notifications"]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/notifications/:notificationId" element={<div data-testid="detail-page">Detail</div>} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

const mockNotifs = [
  {
    id: "notif-1",
    type: "info",
    title: "Sale info",
    message: "A new sale has occurred",
    is_read: false,
    created_at: "2024-01-01T12:00:00Z",
  },
  {
    id: "notif-2",
    type: "alert",
    title: "Low stock alert",
    message: "Item x is low",
    is_read: true,
    created_at: "2024-01-02T13:00:00Z",
  },
];

describe("Notifications List Page", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders loading state while fetching", async () => {
    await bootAuth(true);
    let resolvePromise: (res: Response) => void = () => {};
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Promise<Response>((resolve) => {
        resolvePromise = resolve;
      });
    });
    (globalThis as any).fetch = fetchMock;

    renderNotifications();

    expect(screen.getByTestId("notification-list-loading")).toBeTruthy();
    resolvePromise(new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } }));
  });

  it("renders notifications list and validates read/unread presentation", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/notifications/`)) {
        return new Response(JSON.stringify(mockNotifs), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    renderNotifications();

    await waitFor(() => expect(screen.getByTestId("notification-list")).toBeTruthy());

    // Check display of notifications
    expect(screen.getByText("Sale info")).toBeTruthy();
    expect(screen.getByText("Low stock alert")).toBeTruthy();

    const notif1 = screen.getByTestId("notification-item-notif-1");
    const notif2 = screen.getByTestId("notification-item-notif-2");

    // Read vs Unread visual check
    expect(notif1.getAttribute("data-isread")).toBe("false");
    expect(notif2.getAttribute("data-isread")).toBe("true");

    // Link/navigation check
    const link1 = screen.getByTestId("notification-link-notif-1");
    fireEvent.click(link1);
    await waitFor(() => expect(screen.getByTestId("detail-page")).toBeTruthy());
  });

  it("handles empty notifications list state", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/notifications/`)) {
        return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    renderNotifications();

    await waitFor(() => expect(screen.getByTestId("notification-list-empty")).toBeTruthy());
  });

  it("handles API error state gracefully", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/notifications/`)) {
        return new Response("Server Error", { status: 500 });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    renderNotifications();

    await waitFor(() => expect(screen.getByTestId("notification-list-error")).toBeTruthy());
  });

  it("supports mark-as-read interaction and uses API response as source of truth", async () => {
    await bootAuth(true);
    let mockList = [...mockNotifs];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/notifications/notif-1/read/`)) {
        mockList[0] = { ...mockList[0], is_read: true };
        return new Response(JSON.stringify({ is_read: true }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/notifications/`)) {
        return new Response(JSON.stringify(mockList), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    renderNotifications();

    await waitFor(() => expect(screen.getByTestId("notification-item-notif-1")).toBeTruthy());
    const notif1Before = screen.getByTestId("notification-item-notif-1");
    expect(notif1Before.getAttribute("data-isread")).toBe("false");

    const markReadBtn = screen.getByTestId("mark-read-btn-notif-1");
    fireEvent.click(markReadBtn);

    await waitFor(() => {
      const notif1After = screen.getByTestId("notification-item-notif-1");
      expect(notif1After.getAttribute("data-isread")).toBe("true");
    });

    const calls = fetchMock.mock.calls;
    const hasPatch = calls.some((c) =>
      String(c[0]).includes(`/api/v1/businesses/${BID}/notifications/notif-1/read/`) &&
      c[1]?.method === "PATCH"
    );
    expect(hasPatch).toBe(true);
  });
});