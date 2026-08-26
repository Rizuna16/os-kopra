import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getPublicStore,
  getPublicCatalog,
  getCart,
  addCartItem,
  checkout,
} from "../onlinestore/storefrontService";

const SLUG = "toko-keren";

function mockFetch(
  handler: (url: string, init?: RequestInit) => Response,
): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => handler(url, init));
  (globalThis as any).fetch = fetchMock;
  return fetchMock;
}

describe("storefrontService (Public operations)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("getPublicStore requests GET for active store info by slug", async () => {
    const fetchMock = mockFetch(
      () => new Response(JSON.stringify({ id: "s1", name: "Store A", slug: SLUG, is_active: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    const res = await getPublicStore(SLUG);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain(`/api/v1/stores/${SLUG}/`);
    expect(res.slug).toBe(SLUG);
  });

  it("getPublicCatalog requests GET for store products catalog", async () => {
    const fetchMock = mockFetch(
      () => new Response(JSON.stringify([{ id: "p1", name: "Baju", price: "50000.00", variants: [] }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    const res = await getPublicCatalog(SLUG);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain(`/api/v1/stores/${SLUG}/products/`);
    expect(res[0].name).toBe("Baju");
  });

  it("getCart requests GET passing session_token in query param", async () => {
    const sessionToken = "session-123";
    const fetchMock = mockFetch(
      () => new Response(JSON.stringify({ id: "c1", session_token: sessionToken, items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    const res = await getCart(SLUG, sessionToken);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain(`/api/v1/stores/${SLUG}/cart/`);
    expect(fetchMock.mock.calls[0][0]).toContain(`session_token=${sessionToken}`);
    expect(res.session_token).toBe(sessionToken);
  });

  it("addCartItem sends POST to cart endpoint with variant & quantity", async () => {
    const payload = { session_token: "session-123", variant: "v1", quantity: "2.00" };
    const fetchMock = mockFetch(
      () => new Response(JSON.stringify({ id: "c1", session_token: "session-123", items: [{ id: "ci1", variant: "v1", quantity: "2.00" }] }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );
    const res = await addCartItem(SLUG, payload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain(`/api/v1/stores/${SLUG}/cart/`);
    expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
    expect(res.session_token).toBe("session-123");
  });

  it("checkout sends POST to checkout endpoint with order info", async () => {
    const payload = {
      guest_name: "John Doe",
      shipping_address: "Jakarta",
      lines: [{ variant: "v1", quantity: "1" }],
    };
    const fetchMock = mockFetch(
      () => new Response(JSON.stringify({ id: "o1", status: "PENDING", guest_name: "John Doe" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );
    const res = await checkout(SLUG, payload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain(`/api/v1/stores/${SLUG}/checkout/`);
    expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
    expect(res.guest_name).toBe("John Doe");
  });
});