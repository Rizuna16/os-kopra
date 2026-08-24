import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  listSales,
  getSale,
  createSale,
  updateSale,
  deleteSale,
} from "../sales/saleService";

const BID = "11111111-1111-1111-1111-111111111111";
const SALEID = "55555555-5555-5555-5555-555555555555";
const LID = "44444444-4444-4444-4444-444444444444";
const VID = "66666666-6666-6666-6666-666666666666";

const sampleLine = {
  id: "l1",
  variant: VID,
  quantity: 10,
  unit_price: 5000,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const sampleSale = {
  id: SALEID,
  business: BID,
  location: LID,
  status: "DRAFT",
  lines: [sampleLine],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

function mockFetch(
  handler: (url: string, init?: RequestInit) => Response,
): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => handler(url, init));
  (globalThis as any).fetch = fetchMock;
  return fetchMock;
}

describe("saleService", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("listSales requests GET on the business sales collection and returns a plain array", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify([sampleSale]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await listSales(BID);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/api/v1/businesses/${BID}/sales/`);
    expect(init?.method ?? "GET").toBe("GET");
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].id).toBe(SALEID);
  });

  it("listSales does NOT parse pagination metadata (plain array contract)", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify([sampleSale]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await listSales(BID);
    expect(result).toEqual([sampleSale]);
    expect(result).not.toHaveProperty("count");
    expect(result).not.toHaveProperty("next");
    expect(result).not.toHaveProperty("results");
  });

  it("getSale requests GET on the exact business/sale detail URL", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify(sampleSale), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await getSale(BID, SALEID);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(
      `/api/v1/businesses/${BID}/sales/${SALEID}/`,
    );
    expect(init?.method ?? "GET").toBe("GET");
    expect(result.id).toBe(SALEID);
  });

  it("createSale sends POST with location, status, lines and no business/id/timestamps", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("POST");
      const body = JSON.parse(String(init?.body));
      expect(body).toHaveProperty("location", LID);
      expect(body).toHaveProperty("status", "DRAFT");
      expect(Array.isArray(body.lines)).toBe(true);
      expect(body.lines[0]).toHaveProperty("variant", VID);
      expect(body.lines[0]).toHaveProperty("quantity", 10);
      expect(body.lines[0]).toHaveProperty("unit_price", 5000);
      expect(body.lines[0]).not.toHaveProperty("id");
      expect(body).not.toHaveProperty("business");
      expect(body).not.toHaveProperty("id");
      expect(body).not.toHaveProperty("created_at");
      expect(body).not.toHaveProperty("updated_at");
      return new Response(JSON.stringify(sampleSale), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });
    const result = await createSale(BID, {
      location: LID,
      status: "DRAFT",
      lines: [{ variant: VID, quantity: 10, unit_price: 5000 }],
    });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/api/v1/businesses/${BID}/sales/`);
    expect(String(url)).not.toContain(`/sales/${SALEID}`);
    expect(result.id).toBe(SALEID);
  });

  it("updateSale sends PATCH with only the provided fields", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("PATCH");
      const body = JSON.parse(String(init?.body));
      expect(Object.keys(body).sort()).toEqual(["status"]);
      expect(body).not.toHaveProperty("business");
      expect(body).not.toHaveProperty("id");
      expect(body).not.toHaveProperty("created_at");
      expect(body).not.toHaveProperty("updated_at");
      return new Response(JSON.stringify({ ...sampleSale, status: "COMPLETED" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const result = await updateSale(BID, SALEID, { status: "COMPLETED" });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(
      `/api/v1/businesses/${BID}/sales/${SALEID}/`,
    );
    expect(result.status).toBe("COMPLETED");
  });

  it("updateSale replaces the full lines set when lines are sent", async () => {
    const fetchMock = mockFetch((url, init) => {
      const body = JSON.parse(String(init?.body));
      expect(Array.isArray(body.lines)).toBe(true);
      expect(body.lines).toHaveLength(1);
      expect(body.lines[0]).toHaveProperty("variant", VID);
      expect(body.lines[0]).toHaveProperty("quantity", 5);
      expect(body.lines[0]).toHaveProperty("unit_price", 7000);
      expect(body.lines[0]).not.toHaveProperty("id");
      return new Response(
        JSON.stringify({
          ...sampleSale,
          lines: [{ ...sampleLine, quantity: 5, unit_price: 7000 }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    await updateSale(BID, SALEID, {
      lines: [{ variant: VID, quantity: 5, unit_price: 7000 }],
    });
  });

  it("updateSale does NOT use PUT", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify(sampleSale), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await updateSale(BID, SALEID, { status: "COMPLETED" });
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe("PATCH");
    expect(init?.method).not.toBe("PUT");
  });

  it("deleteSale sends DELETE and tolerates 204 empty body", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("DELETE");
      expect(String(url)).toContain(
        `/api/v1/businesses/${BID}/sales/${SALEID}/`,
      );
      return new Response(null, { status: 204 });
    });
    await expect(deleteSale(BID, SALEID)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("createSale surfaces 400 DRF field errors without faking success", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify({ location: ["This field is required."] }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await expect(
      createSale(BID, { location: "" }),
    ).rejects.toThrow();
  });

  it("updateSale surfaces 400 DRF field errors without faking success", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify({ lines: ["Invalid variant."] }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await expect(
      updateSale(BID, SALEID, { lines: [] }),
    ).rejects.toThrow();
  });

  it("getSale surfaces 404 without exposing existence", async () => {
    mockFetch(
      () =>
        new Response("Not found", {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await expect(getSale(BID, SALEID)).rejects.toThrow();
  });
});
