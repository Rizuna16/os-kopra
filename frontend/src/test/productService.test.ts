import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../product/productService";
import type { Product } from "../product/types";

const BID = "11111111-1111-1111-1111-111111111111";
const PID = "22222222-2222-2222-2222-222222222222";

function mockFetch(
  handler: (url: string, init?: RequestInit) => Response,
): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => handler(url, init));
  (globalThis as any).fetch = fetchMock;
  return fetchMock;
}

const sample: Product = {
  id: PID,
  name: "Beras 5kg",
  price: 55000,
  business: BID,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("productService", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("listProducts requests GET on the business products collection and returns a plain array", async () => {
    const fetchMock = mockFetch(
      (url) =>
        new Response(JSON.stringify([sample]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await listProducts(BID);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/api/v1/businesses/${BID}/products/`);
    expect(init?.method ?? "GET").toBe("GET");
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].id).toBe(PID);
  });

  it("listProducts does NOT parse pagination metadata (plain array contract)", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify([sample]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await listProducts(BID);
    expect(result).toEqual([sample]);
  });

  it("getProduct requests GET on the business/product detail URL", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify(sample), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await getProduct(BID, PID);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(
      `/api/v1/businesses/${BID}/products/${PID}/`,
    );
    expect(init?.method ?? "GET").toBe("GET");
    expect(result.id).toBe(PID);
  });

  it("createProduct sends POST with only name and price", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("POST");
      const body = JSON.parse(String(init?.body));
      expect(Object.keys(body).sort()).toEqual(["name", "price"]);
      expect(body).not.toHaveProperty("business");
      expect(body).not.toHaveProperty("id");
      expect(body).not.toHaveProperty("created_at");
      expect(body).not.toHaveProperty("updated_at");
      return new Response(JSON.stringify(sample), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });
    const result = await createProduct(BID, { name: "Beras 5kg", price: 55000 });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/api/v1/businesses/${BID}/products/`);
    expect(String(url)).not.toContain(`/products/${PID}`);
    expect(result.id).toBe(PID);
  });

  it("createProduct supports integer price", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify(sample), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await createProduct(BID, { name: "X", price: 1000 });
    expect(result.price).toBe(55000);
  });

  it("createProduct supports decimal-string-compatible price", async () => {
    const decimalSample = { ...sample, price: "55000.50" };
    mockFetch(
      () =>
        new Response(JSON.stringify(decimalSample), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await createProduct(BID, { name: "X", price: "55000.50" });
    expect(result.price).toBe("55000.50");
  });

  it("updateProduct sends PATCH with only writable fields", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("PATCH");
      const body = JSON.parse(String(init?.body));
      expect(Object.keys(body).sort()).toEqual(["name", "price"]);
      expect(body).not.toHaveProperty("business");
      expect(body).not.toHaveProperty("id");
      expect(body).not.toHaveProperty("created_at");
      expect(body).not.toHaveProperty("updated_at");
      return new Response(JSON.stringify(sample), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const result = await updateProduct(BID, PID, { name: "Beras 5kg baru", price: 60000 });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(
      `/api/v1/businesses/${BID}/products/${PID}/`,
    );
    expect(result.id).toBe(PID);
  });

  it("updateProduct does NOT use PUT", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify(sample), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await updateProduct(BID, PID, { name: "X" });
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe("PATCH");
    expect(init?.method).not.toBe("PUT");
  });

  it("deleteProduct sends DELETE and tolerates 204 empty body", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("DELETE");
      expect(String(url)).toContain(
        `/api/v1/businesses/${BID}/products/${PID}/`,
      );
      return new Response(null, { status: 204 });
    });
    await expect(deleteProduct(BID, PID)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
