import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  listOnlineStores,
  createOnlineStore,
  getOnlineStore,
  updateOnlineStore,
  deleteOnlineStore,
  listOnlineStoreProducts,
  publishProductToOnlineStore,
  updateProductPublishingStatus,
  listOnlineOrders,
} from "../onlinestore/onlineStoreService";

const BID = "11111111-1111-1111-1111-111111111111";
const SID = "22222222-2222-2222-2222-222222222222";
const PID = "33333333-3333-3333-3333-333333333333";
const OID = "44444444-4444-4444-4444-444444444444";

function mockFetch(
  handler: (url: string, init?: RequestInit) => Response,
): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => handler(url, init));
  (globalThis as any).fetch = fetchMock;
  return fetchMock;
}

describe("onlineStoreService (Merchant operations)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("listOnlineStores requests GET and returns store list", async () => {
    const fetchMock = mockFetch(
      () => new Response(JSON.stringify([{ id: SID, name: "Store A" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    const res = await listOnlineStores(BID);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain(`/api/v1/businesses/${BID}/online-stores/`);
    expect(res).toEqual([{ id: SID, name: "Store A" }]);
  });

  it("createOnlineStore sends POST with payload", async () => {
    const payload = { name: "Store A", slug: "store-a", default_location: "loc-1" };
    const fetchMock = mockFetch(
      () => new Response(JSON.stringify({ id: SID, ...payload }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );
    const res = await createOnlineStore(BID, payload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain(`/api/v1/businesses/${BID}/online-stores/`);
    expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
    expect(res.id).toBe(SID);
  });

  it("getOnlineStore requests GET", async () => {
    const fetchMock = mockFetch(
      () => new Response(JSON.stringify({ id: SID, name: "Store A" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    const res = await getOnlineStore(BID, SID);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain(`/api/v1/businesses/${BID}/online-stores/${SID}/`);
    expect(res.id).toBe(SID);
  });

  it("updateOnlineStore sends PATCH", async () => {
    const fetchMock = mockFetch(
      () => new Response(JSON.stringify({ id: SID, is_active: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    const res = await updateOnlineStore(BID, SID, { is_active: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain(`/api/v1/businesses/${BID}/online-stores/${SID}/`);
    expect(fetchMock.mock.calls[0][1]?.method).toBe("PATCH");
    expect(res.is_active).toBe(false);
  });

  it("deleteOnlineStore sends DELETE", async () => {
    const fetchMock = mockFetch(() => new Response(null, { status: 204 }));
    await deleteOnlineStore(BID, SID);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain(`/api/v1/businesses/${BID}/online-stores/${SID}/`);
    expect(fetchMock.mock.calls[0][1]?.method).toBe("DELETE");
  });

  it("listOnlineStoreProducts requests GET", async () => {
    const fetchMock = mockFetch(
      () => new Response(JSON.stringify([{ id: "link-1", product: PID }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    const res = await listOnlineStoreProducts(BID, SID);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain(`/api/v1/businesses/${BID}/online-stores/${SID}/products/`);
    expect(res[0].product).toBe(PID);
  });

  it("publishProductToOnlineStore sends POST", async () => {
    const fetchMock = mockFetch(
      () => new Response(JSON.stringify({ id: "link-1", product: PID, is_published: true }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );
    const res = await publishProductToOnlineStore(BID, SID, { product: PID, is_published: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain(`/api/v1/businesses/${BID}/online-stores/${SID}/products/`);
    expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
    expect(res.is_published).toBe(true);
  });

  it("updateProductPublishingStatus sends PATCH", async () => {
    const fetchMock = mockFetch(
      () => new Response(JSON.stringify({ id: "link-1", product: PID, is_published: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    const res = await updateProductPublishingStatus(BID, SID, PID, { is_published: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain(`/api/v1/businesses/${BID}/online-stores/${SID}/products/${PID}/`);
    expect(fetchMock.mock.calls[0][1]?.method).toBe("PATCH");
    expect(res.is_published).toBe(false);
  });

  it("listOnlineOrders requests GET scoped by store slug", async () => {
    const fetchMock = mockFetch(
      () => new Response(JSON.stringify([{ id: OID, status: "PENDING" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    const res = await listOnlineOrders("store-slug");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain(`/api/v1/stores/store-slug/orders/`);
    expect(res[0].id).toBe(OID);
  });
});