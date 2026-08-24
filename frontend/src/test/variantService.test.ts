import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  listVariants,
  createVariant,
  getVariant,
  updateVariant,
  deleteVariant,
} from "../product/variantService";

interface Variant {
  id: string;
  product: string;
  name: string;
  created_at: string;
  updated_at: string;
}

const BID = "11111111-1111-1111-1111-111111111111";
const PID = "22222222-2222-2222-2222-222222222222";
const VID = "33333333-3333-3333-3333-333333333333";

function mockFetch(
  handler: (url: string, init?: RequestInit) => Response,
): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => handler(url, init));
  (globalThis as any).fetch = fetchMock;
  return fetchMock;
}

const sample: Variant = {
  id: VID,
  product: PID,
  name: "Hitam - 40",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("variantService", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("listVariants requests GET on the exact business/product variants collection and returns a plain array", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify([sample]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await listVariants(BID, PID);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/api/v1/businesses/${BID}/products/${PID}/variants/`);
    expect(init?.method ?? "GET").toBe("GET");
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].id).toBe(VID);
  });

  it("listVariants does NOT parse pagination metadata (plain array contract)", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify([sample]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await listVariants(BID, PID);
    expect(result).toEqual([sample]);
    expect(result).not.toHaveProperty("count");
    expect(result).not.toHaveProperty("next");
    expect(result).not.toHaveProperty("results");
  });

  it("getVariant requests GET on the exact business/product/variant detail URL", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify(sample), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await getVariant(BID, PID, VID);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/api/v1/businesses/${BID}/products/${PID}/variants/${VID}/`);
    expect(init?.method ?? "GET").toBe("GET");
    expect(result.id).toBe(VID);
  });

  it("createVariant sends POST with only name", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("POST");
      const body = JSON.parse(String(init?.body));
      expect(Object.keys(body).sort()).toEqual(["name"]);
      expect(body).not.toHaveProperty("business");
      expect(body).not.toHaveProperty("product");
      expect(body).not.toHaveProperty("id");
      expect(body).not.toHaveProperty("created_at");
      expect(body).not.toHaveProperty("updated_at");
      return new Response(JSON.stringify(sample), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });
    const result = await createVariant(BID, PID, { name: "Hitam - 40" });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/api/v1/businesses/${BID}/products/${PID}/variants/`);
    expect(String(url)).not.toContain(`/variants/${VID}`);
    expect(result.id).toBe(VID);
  });

  it("updateVariant sends PATCH with only name", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("PATCH");
      const body = JSON.parse(String(init?.body));
      expect(Object.keys(body).sort()).toEqual(["name"]);
      expect(body).not.toHaveProperty("business");
      expect(body).not.toHaveProperty("product");
      expect(body).not.toHaveProperty("id");
      expect(body).not.toHaveProperty("created_at");
      expect(body).not.toHaveProperty("updated_at");
      return new Response(JSON.stringify({ ...sample, name: "Putih - 41" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const result = await updateVariant(BID, PID, VID, { name: "Putih - 41" });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/api/v1/businesses/${BID}/products/${PID}/variants/${VID}/`);
    expect(result.name).toBe("Putih - 41");
  });

  it("updateVariant does NOT use PUT", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify(sample), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await updateVariant(BID, PID, VID, { name: "X" });
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe("PATCH");
    expect(init?.method).not.toBe("PUT");
  });

  it("deleteVariant sends DELETE and tolerates 204 empty body", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("DELETE");
      expect(String(url)).toContain(`/api/v1/businesses/${BID}/products/${PID}/variants/${VID}/`);
      return new Response(null, { status: 204 });
    });
    await expect(deleteVariant(BID, PID, VID)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("createVariant surfaces 400 DRF field errors without faking success", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify({ name: ["Name must not be empty or whitespace only."] }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await expect(createVariant(BID, PID, { name: "" })).rejects.toThrow();
  });

  it("getVariant surfaces 404 without exposing existence", async () => {
    mockFetch(
      () =>
        new Response("Not found", {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await expect(getVariant(BID, PID, VID)).rejects.toThrow();
  });
});