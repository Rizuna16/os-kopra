import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  listNotifications,
  getNotification,
  markNotificationRead,
} from "../notifications/notificationService";

const BIZ = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function setupFetch(handler: (url: string, init?: RequestInit) => Response) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => handler(url, init));
  (globalThis as any).fetch = fn;
  return fn;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("notificationService", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("lists notifications from the business-scoped endpoint", async () => {
    const mockNotifs = [
      {
        id: "notif-1",
        type: "info",
        title: "New sale",
        message: "Sale completed",
        is_read: false,
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "notif-2",
        type: "success",
        title: "Payment received",
        message: "Customer paid",
        is_read: true,
        created_at: "2024-01-02T00:00:00Z",
      },
    ];

    const fn = setupFetch((url) =>
      String(url).includes(`/businesses/${BIZ}/notifications/`)
        ? jsonResponse(mockNotifs)
        : jsonResponse({}),
    );
    const res = await listNotifications(BIZ);
    expect(res).toEqual(mockNotifs);
    const call: { url: string; method: string } = {
      url: fn.mock.calls[0][0],
      method: fn.mock.calls[0][1]?.method ?? "GET",
    };
    expect(String(call.url).endsWith(`/businesses/${BIZ}/notifications/`)).toBe(true);
    expect(call.method).toBe("GET");
  });

  it("fetches a single notification by id", async () => {
    const mockNotif = {
      id: "notif-1",
      type: "info",
      title: "New sale",
      message: "Sale completed",
      is_read: false,
      created_at: "2024-01-01T00:00:00Z",
    };

    const fn = setupFetch((url) => {
      if (String(url).includes(`/businesses/${BIZ}/notifications/notif-1/`)) {
        return jsonResponse(mockNotif);
      }
      return jsonResponse({});
    });
    const res = await getNotification(BIZ, "notif-1");
    expect(res).toEqual(mockNotif);
    expect(String(fn.mock.calls[0][0]).endsWith(`/businesses/${BIZ}/notifications/notif-1/`)).toBe(true);
    expect(fn.mock.calls[0][1]?.method ?? "GET").toBe("GET");
  });

  it("marks notification read via PATCH /read/ and omits arbitrary request body", async () => {
    const fn = setupFetch((url, init) => {
      if (String(url).includes(`/businesses/${BIZ}/notifications/notif-1/read/`)) {
        if (init?.body) {
          const body = JSON.parse(init.body as string);
          // Contract: request body should NOT contain arbitrary fields
          expect(body).toEqual({});
        }
        return jsonResponse({ is_read: true });
      }
      return jsonResponse({});
    });
    (globalThis as any).fetch = fn;
    const res = await markNotificationRead(BIZ, "notif-1");
    expect(res.is_read).toBe(true);
  });

  it("propagates errors on API failure", async () => {
    setupFetch(() => {
      return new Response("Internal Server Error", { status: 500 });
    });
    await expect(listNotifications(BIZ)).rejects.toThrow();
  });
});