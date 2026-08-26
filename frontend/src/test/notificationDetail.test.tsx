import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { BusinessProvider } from "../business/BusinessContext";
import { bootAuth, userObj } from "./testUtils";
import { NotificationDetail } from "../pages/NotificationDetail";

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

function renderNotificationDetail(notificationId: string) {
  seedCurrentBusiness(BID);
  return render(
    <MemoryRouter initialEntries={[`/notifications/${notificationId}`]}>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/notifications/:notificationId" element={<NotificationDetail />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

const mockNotif = {
  id: "notif-1",
  type: "info",
  title: "Sale info",
  message: "A new sale has occurred",
  is_read: false,
  created_at: "2024-01-01T12:00:00Z",
};

describe("NotificationDetail Page", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders loading state while fetching detail", async () => {
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

    renderNotificationDetail("notif-1");

    expect(screen.getByTestId("notification-detail-loading")).toBeTruthy();
    resolvePromise(new Response("{}", { status: 200 }));
  });

  it("renders notification detail successfully and enforces exact contract fields", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/notifications/notif-1/`)) {
        return new Response(JSON.stringify(mockNotif), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    renderNotificationDetail("notif-1");

    await waitFor(() => expect(screen.getByTestId("notification-detail")).toBeTruthy());

    expect(screen.getByTestId("notification-detail-id").textContent).toBe("notif-1");
    expect(screen.getByTestId("notification-detail-type").textContent).toBe("info");
    expect(screen.getByTestId("notification-detail-title").textContent).toBe("Sale info");
    expect(screen.getByTestId("notification-detail-message").textContent).toBe("A new sale has occurred");
    expect(screen.getByTestId("notification-detail-isread").textContent).toBe("false");
    expect(screen.getByTestId("notification-detail-created").textContent).toBe("2024-01-01T12:00:00Z");
  });

  it("handles error state when detail API fails", async () => {
    await bootAuth(true);
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        return new Response(JSON.stringify(userObj), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes(`/api/v1/businesses/${BID}/notifications/notif-1/`)) {
        return new Response("Not Found", { status: 404 });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    renderNotificationDetail("notif-1");

    await waitFor(() => expect(screen.getByTestId("notification-detail-error")).toBeTruthy());
  });
});