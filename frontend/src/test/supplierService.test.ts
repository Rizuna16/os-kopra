import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "../supplier/supplierService";

interface Supplier {
  id: string;
  business: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  created_at: string;
  updated_at: string;
}

const BID = "11111111-1111-1111-1111-111111111111";
const SID = "33333333-3333-3333-3333-333333333333";

function mockFetch(
  handler: (url: string, init?: RequestInit) => Response,
): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => handler(url, init));
  (globalThis as any).fetch = fetchMock;
  return fetchMock;
}

const sample: Supplier = {
  id: SID,
  business: BID,
  name: "Supplier A",
  phone: "081234567890",
  email: "a@supplier.com",
  address: "Jl. Contoh 1",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("supplierService", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("listSuppliers requests GET on the exact business suppliers collection and returns a plain array", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify([sample]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await listSuppliers(BID);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/api/v1/businesses/${BID}/suppliers/`);
    expect(init?.method ?? "GET").toBe("GET");
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].id).toBe(SID);
  });

  it("listSuppliers does NOT parse pagination metadata (plain array contract)", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify([sample]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await listSuppliers(BID);
    expect(result).toEqual([sample]);
    expect(result).not.toHaveProperty("count");
    expect(result).not.toHaveProperty("next");
    expect(result).not.toHaveProperty("results");
  });

  it("getSupplier requests GET on the exact business/supplier detail URL", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify(sample), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await getSupplier(BID, SID);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/api/v1/businesses/${BID}/suppliers/${SID}/`);
    expect(init?.method ?? "GET").toBe("GET");
    expect(result.id).toBe(SID);
  });

  it("createSupplier sends POST with exactly name, phone, email, address", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("POST");
      const body = JSON.parse(String(init?.body));
      expect(Object.keys(body).sort()).toEqual(["address", "email", "name", "phone"]);
      expect(body).not.toHaveProperty("business");
      expect(body).not.toHaveProperty("id");
      expect(body).not.toHaveProperty("created_at");
      expect(body).not.toHaveProperty("updated_at");
      return new Response(JSON.stringify(sample), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });
    const result = await createSupplier(BID, {
      name: "Supplier A",
      phone: "081234567890",
      email: "a@supplier.com",
      address: "Jl. Contoh 1",
    });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/api/v1/businesses/${BID}/suppliers/`);
    expect(String(url)).not.toContain(`/suppliers/${SID}`);
    expect(result.id).toBe(SID);
  });

  it("updateSupplier sends PATCH with only writable fields", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("PATCH");
      const body = JSON.parse(String(init?.body));
      expect(Object.keys(body).sort()).toEqual(["address", "email", "name", "phone"]);
      expect(body).not.toHaveProperty("business");
      expect(body).not.toHaveProperty("id");
      expect(body).not.toHaveProperty("created_at");
      expect(body).not.toHaveProperty("updated_at");
      return new Response(JSON.stringify({ ...sample, name: "Supplier B" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const result = await updateSupplier(BID, SID, {
      name: "Supplier B",
      phone: "081234567890",
      email: "a@supplier.com",
      address: "Jl. Contoh 1",
    });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/api/v1/businesses/${BID}/suppliers/${SID}/`);
    expect(result.name).toBe("Supplier B");
  });

  it("updateSupplier does NOT use PUT", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify(sample), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await updateSupplier(BID, SID, { name: "X" });
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe("PATCH");
    expect(init?.method).not.toBe("PUT");
  });

  it("deleteSupplier sends DELETE and tolerates 204 empty body", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("DELETE");
      expect(String(url)).toContain(`/api/v1/businesses/${BID}/suppliers/${SID}/`);
      return new Response(null, { status: 204 });
    });
    await expect(deleteSupplier(BID, SID)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("createSupplier surfaces 400 DRF field errors without faking success", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify({ name: ["Name must not be empty or whitespace only."] }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await expect(createSupplier(BID, { name: "" })).rejects.toThrow();
  });

  it("updateSupplier surfaces 400 DRF field errors without faking success", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify({ email: ["Enter a valid email address."] }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await expect(updateSupplier(BID, SID, { email: "bad" })).rejects.toThrow();
  });

  it("getSupplier surfaces 404 without exposing existence", async () => {
    mockFetch(
      () =>
        new Response("Not found", {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await expect(getSupplier(BID, SID)).rejects.toThrow();
  });
});
