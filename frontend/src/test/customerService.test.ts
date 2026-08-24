import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "../customer/customerService";

interface Customer {
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
const CID = "33333333-3333-3333-3333-333333333333";

function mockFetch(
  handler: (url: string, init?: RequestInit) => Response,
): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => handler(url, init));
  (globalThis as any).fetch = fetchMock;
  return fetchMock;
}

const sample: Customer = {
  id: CID,
  business: BID,
  name: "Customer A",
  phone: "081234567890",
  email: "a@customer.com",
  address: "Jl. Contoh 1",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("customerService", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("listCustomers requests GET on the exact business customers collection and returns a plain array", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify([sample]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await listCustomers(BID);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/api/v1/businesses/${BID}/customers/`);
    expect(init?.method ?? "GET").toBe("GET");
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].id).toBe(CID);
  });

  it("listCustomers does NOT parse pagination metadata (plain array contract)", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify([sample]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await listCustomers(BID);
    expect(result).toEqual([sample]);
    expect(result).not.toHaveProperty("count");
    expect(result).not.toHaveProperty("next");
    expect(result).not.toHaveProperty("results");
  });

  it("getCustomer requests GET on the exact business/customer detail URL", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify(sample), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await getCustomer(BID, CID);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/api/v1/businesses/${BID}/customers/${CID}/`);
    expect(init?.method ?? "GET").toBe("GET");
    expect(result.id).toBe(CID);
  });

  it("createCustomer sends POST with exactly name, phone, email, address", async () => {
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
    const result = await createCustomer(BID, {
      name: "Customer A",
      phone: "081234567890",
      email: "a@customer.com",
      address: "Jl. Contoh 1",
    });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/api/v1/businesses/${BID}/customers/`);
    expect(String(url)).not.toContain(`/customers/${CID}`);
    expect(result.id).toBe(CID);
  });

  it("updateCustomer sends PATCH with only writable fields", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("PATCH");
      const body = JSON.parse(String(init?.body));
      expect(Object.keys(body).sort()).toEqual(["address", "email", "name", "phone"]);
      expect(body).not.toHaveProperty("business");
      expect(body).not.toHaveProperty("id");
      expect(body).not.toHaveProperty("created_at");
      expect(body).not.toHaveProperty("updated_at");
      return new Response(JSON.stringify({ ...sample, name: "Customer B" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const result = await updateCustomer(BID, CID, {
      name: "Customer B",
      phone: "081234567890",
      email: "a@customer.com",
      address: "Jl. Contoh 1",
    });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/api/v1/businesses/${BID}/customers/${CID}/`);
    expect(result.name).toBe("Customer B");
  });

  it("updateCustomer does NOT use PUT", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify(sample), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await updateCustomer(BID, CID, { name: "X" });
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe("PATCH");
    expect(init?.method).not.toBe("PUT");
  });

  it("deleteCustomer sends DELETE and tolerates 204 empty body", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("DELETE");
      expect(String(url)).toContain(`/api/v1/businesses/${BID}/customers/${CID}/`);
      return new Response(null, { status: 204 });
    });
    await expect(deleteCustomer(BID, CID)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("createCustomer surfaces 400 DRF field errors without faking success", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify({ name: ["Name must not be empty or whitespace only."] }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await expect(createCustomer(BID, { name: "" })).rejects.toThrow();
  });

  it("updateCustomer surfaces 400 DRF field errors without faking success", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify({ email: ["Enter a valid email address."] }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await expect(updateCustomer(BID, CID, { email: "bad" })).rejects.toThrow();
  });

  it("getCustomer surfaces 404 without exposing existence", async () => {
    mockFetch(
      () =>
        new Response("Not found", {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await expect(getCustomer(BID, CID)).rejects.toThrow();
  });
});
