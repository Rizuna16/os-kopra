import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  listPromotions,
  getPromotion,
  createPromotion,
  updatePromotion,
  deletePromotion,
  listLoyaltyPrograms,
  getLoyaltyProgram,
  createLoyaltyProgram,
  updateLoyaltyProgram,
  deleteLoyaltyProgram,
  listCustomerLoyaltyRecords,
  getCustomerLoyaltyRecord,
  createCustomerLoyaltyRecord,
  updateCustomerLoyaltyRecord,
  deleteCustomerLoyaltyRecord,
  PromotionPayload,
} from "../promotion_loyalty/promotionLoyaltyService";

const BID = "11111111-1111-1111-1111-111111111111";
const PID = "22222222-2222-2222-2222-222222222222";
const PROGID = "33333333-3333-3333-3333-333333333333";
const RECID = "44444444-4444-4444-4444-444444444444";
const TARGET_PRODUCT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const TARGET_VARIANT = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const samplePromotion = {
  id: PID,
  business: BID,
  name: "Promo A",
  discount_type: "PERCENTAGE",
  discount_value: "10.00",
  valid_from: "2024-01-01T00:00:00Z",
  valid_to: "2024-12-31T23:59:59Z",
  status: "ACTIVE",
  applicability: "BUSINESS_WIDE",
  target_product: null,
  target_variant: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const sampleProgram = {
  id: PROGID,
  business: BID,
  name: "Loyalty Pro",
  status: "ACTIVE",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const sampleRecord = {
  id: RECID,
  business: BID,
  program: PROGID,
  customer: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  points_balance: "100.00",
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

describe("promotionLoyaltyService", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("listPromotions requests GET on the exact business promotions collection and returns a plain array", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify([samplePromotion]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await listPromotions(BID);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/api/v1/businesses/${BID}/promotions/`);
    expect(init?.method ?? "GET").toBe("GET");
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].id).toBe(PID);
  });

  it("listPromotions does NOT parse pagination metadata (plain array contract)", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify([samplePromotion]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await listPromotions(BID);
    expect(result).toEqual([samplePromotion]);
    expect(result).not.toHaveProperty("count");
    expect(result).not.toHaveProperty("next");
    expect(result).not.toHaveProperty("results");
  });

  it("getPromotion requests GET on the exact business/promotion detail URL", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify(samplePromotion), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await getPromotion(BID, PID);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/api/v1/businesses/${BID}/promotions/${PID}/`);
    expect(init?.method ?? "GET").toBe("GET");
    expect(result.id).toBe(PID);
  });

  it("createPromotion sends POST with exactly all writable fields and no business/id/timestamps", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("POST");
      const body = JSON.parse(String(init?.body));
      expect(Object.keys(body).sort()).toEqual([
        "applicability",
        "discount_type",
        "discount_value",
        "name",
        "status",
        "target_product",
        "target_variant",
        "valid_from",
        "valid_to",
      ]);
      expect(body).not.toHaveProperty("business");
      expect(body).not.toHaveProperty("id");
      expect(body).not.toHaveProperty("created_at");
      expect(body).not.toHaveProperty("updated_at");
      return new Response(JSON.stringify(samplePromotion), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });
    const payload: PromotionPayload = {
      name: "Promo A",
      discount_type: "PERCENTAGE",
      discount_value: "10.00",
      valid_from: "2024-01-01T00:00:00Z",
      valid_to: "2024-12-31T23:59:59Z",
      status: "ACTIVE",
      applicability: "BUSINESS_WIDE",
      target_product: null,
      target_variant: null,
    };
    const result = await createPromotion(BID, payload);
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/api/v1/businesses/${BID}/promotions/`);
    expect(String(url)).not.toContain(`/promotions/${PID}`);
    expect(result.id).toBe(PID);
  });

  it("updatePromotion sends PATCH with only writable fields", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("PATCH");
      const body = JSON.parse(String(init?.body));
      expect(Object.keys(body).sort()).toEqual([
        "applicability",
        "discount_type",
        "discount_value",
        "name",
        "status",
        "target_product",
        "target_variant",
        "valid_from",
        "valid_to",
      ]);
      expect(body).not.toHaveProperty("business");
      expect(body).not.toHaveProperty("id");
      expect(body).not.toHaveProperty("created_at");
      expect(body).not.toHaveProperty("updated_at");
      return new Response(JSON.stringify({ ...samplePromotion, name: "Promo B" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const result = await updatePromotion(BID, PID, {
      name: "Promo B",
      discount_type: "PERCENTAGE",
      discount_value: "10.00",
      valid_from: "2024-01-01T00:00:00Z",
      valid_to: "2024-12-31T23:59:59Z",
      status: "ACTIVE",
      applicability: "BUSINESS_WIDE",
      target_product: null,
      target_variant: null,
    });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/api/v1/businesses/${BID}/promotions/${PID}/`);
    expect(result.name).toBe("Promo B");
  });

  it("updatePromotion does NOT use PUT", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify(samplePromotion), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await updatePromotion(BID, PID, { name: "X" });
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe("PATCH");
    expect(init?.method).not.toBe("PUT");
  });

  it("deletePromotion sends DELETE and tolerates 204 empty body", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("DELETE");
      expect(String(url)).toContain(`/api/v1/businesses/${BID}/promotions/${PID}/`);
      return new Response(null, { status: 204 });
    });
    await expect(deletePromotion(BID, PID)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("createPromotion surfaces 400 DRF field errors without faking success", async () => {
    mockFetch(
      () =>
        new Response(
          JSON.stringify({ name: ["Name must not be empty or whitespace only."] }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        ),
    );
    await expect(
      createPromotion(BID, {
        name: "",
        discount_type: "PERCENTAGE",
        discount_value: "10.00",
        valid_from: "2024-01-01T00:00:00Z",
        valid_to: "2024-12-31T23:59:59Z",
        status: "ACTIVE",
        applicability: "BUSINESS_WIDE",
      }),
    ).rejects.toThrow();
  });

  it("updatePromotion surfaces 400 DRF field errors without faking success", async () => {
    mockFetch(
      () =>
        new Response(
          JSON.stringify({ discount_value: ["Discount value must be positive."] }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        ),
    );
    await expect(
      updatePromotion(BID, PID, { discount_value: "0" }),
    ).rejects.toThrow();
  });

  it("getPromotion surfaces 404 without exposing existence", async () => {
    mockFetch(
      () =>
        new Response("Not found", {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await expect(getPromotion(BID, PID)).rejects.toThrow();
  });

  // --- LoyaltyProgram ---
  it("listLoyaltyPrograms requests GET on the exact business loyalty-programs collection and returns a plain array", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify([sampleProgram]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await listLoyaltyPrograms(BID);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/api/v1/businesses/${BID}/loyalty-programs/`);
    expect(init?.method ?? "GET").toBe("GET");
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].id).toBe(PROGID);
  });

  it("getLoyaltyProgram requests GET on the exact business/program detail URL", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify(sampleProgram), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await getLoyaltyProgram(BID, PROGID);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/api/v1/businesses/${BID}/loyalty-programs/${PROGID}/`);
    expect(init?.method ?? "GET").toBe("GET");
    expect(result.id).toBe(PROGID);
  });

  it("createLoyaltyProgram sends POST with exactly name and status, no business/id/timestamps", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("POST");
      const body = JSON.parse(String(init?.body));
      expect(Object.keys(body).sort()).toEqual(["name", "status"]);
      expect(body).not.toHaveProperty("business");
      expect(body).not.toHaveProperty("id");
      expect(body).not.toHaveProperty("created_at");
      expect(body).not.toHaveProperty("updated_at");
      return new Response(JSON.stringify(sampleProgram), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });
    const result = await createLoyaltyProgram(BID, { name: "Loyalty Pro", status: "ACTIVE" });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/api/v1/businesses/${BID}/loyalty-programs/`);
    expect(result.id).toBe(PROGID);
  });

  it("updateLoyaltyProgram sends PATCH with only writable fields", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("PATCH");
      const body = JSON.parse(String(init?.body));
      expect(Object.keys(body).sort()).toEqual(["name"]);
      expect(body).not.toHaveProperty("business");
      expect(body).not.toHaveProperty("id");
      expect(body).not.toHaveProperty("created_at");
      expect(body).not.toHaveProperty("updated_at");
      return new Response(JSON.stringify({ ...sampleProgram, name: "Loyalty Pro 2" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const result = await updateLoyaltyProgram(BID, PROGID, { name: "Loyalty Pro 2" });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/api/v1/businesses/${BID}/loyalty-programs/${PROGID}/`);
    expect(result.name).toBe("Loyalty Pro 2");
  });

  it("updateLoyaltyProgram does NOT use PUT", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify(sampleProgram), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await updateLoyaltyProgram(BID, PROGID, { name: "X" });
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe("PATCH");
    expect(init?.method).not.toBe("PUT");
  });

  it("deleteLoyaltyProgram sends DELETE and tolerates 204 empty body", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("DELETE");
      expect(String(url)).toContain(`/api/v1/businesses/${BID}/loyalty-programs/${PROGID}/`);
      return new Response(null, { status: 204 });
    });
    await expect(deleteLoyaltyProgram(BID, PROGID)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("createLoyaltyProgram surfaces 400 DRF field errors", async () => {
    mockFetch(
      () =>
        new Response(
          JSON.stringify({ name: ["Name must not be empty or whitespace only."] }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        ),
    );
    await expect(createLoyaltyProgram(BID, { name: "" })).rejects.toThrow();
  });

  it("getLoyaltyProgram surfaces 404", async () => {
    mockFetch(
      () =>
        new Response("Not found", {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await expect(getLoyaltyProgram(BID, PROGID)).rejects.toThrow();
  });

  // --- CustomerLoyaltyRecord ---
  it("listCustomerLoyaltyRecords requests GET on the exact nested program customers collection", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify([sampleRecord]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await listCustomerLoyaltyRecords(BID, PROGID);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(
      `/api/v1/businesses/${BID}/loyalty-programs/${PROGID}/customers/`,
    );
    expect(init?.method ?? "GET").toBe("GET");
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].id).toBe(RECID);
  });

  it("getCustomerLoyaltyRecord requests GET on the exact nested program/customer detail URL", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify(sampleRecord), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await getCustomerLoyaltyRecord(BID, PROGID, RECID);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(
      `/api/v1/businesses/${BID}/loyalty-programs/${PROGID}/customers/${RECID}/`,
    );
    expect(init?.method ?? "GET").toBe("GET");
    expect(result.id).toBe(RECID);
  });

  it("createCustomerLoyaltyRecord sends POST with customer and points_balance, no business/program/id/timestamps", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("POST");
      const body = JSON.parse(String(init?.body));
      expect(Object.keys(body).sort()).toEqual(["customer", "points_balance"]);
      expect(body).not.toHaveProperty("business");
      expect(body).not.toHaveProperty("program");
      expect(body).not.toHaveProperty("id");
      expect(body).not.toHaveProperty("created_at");
      expect(body).not.toHaveProperty("updated_at");
      return new Response(JSON.stringify(sampleRecord), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });
    const result = await createCustomerLoyaltyRecord(BID, PROGID, {
      customer: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      points_balance: "100.00",
    });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(
      `/api/v1/businesses/${BID}/loyalty-programs/${PROGID}/customers/`,
    );
    expect(result.id).toBe(RECID);
  });

  it("updateCustomerLoyaltyRecord sends PATCH with only points_balance", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("PATCH");
      const body = JSON.parse(String(init?.body));
      expect(Object.keys(body).sort()).toEqual(["points_balance"]);
      expect(body).not.toHaveProperty("business");
      expect(body).not.toHaveProperty("program");
      expect(body).not.toHaveProperty("customer");
      expect(body).not.toHaveProperty("id");
      expect(body).not.toHaveProperty("created_at");
      expect(body).not.toHaveProperty("updated_at");
      return new Response(
        JSON.stringify({ ...sampleRecord, points_balance: "200.00" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    const result = await updateCustomerLoyaltyRecord(BID, PROGID, RECID, {
      points_balance: "200.00",
    });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(
      `/api/v1/businesses/${BID}/loyalty-programs/${PROGID}/customers/${RECID}/`,
    );
    expect(result.points_balance).toBe("200.00");
  });

  it("updateCustomerLoyaltyRecord does NOT use PUT", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify(sampleRecord), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await updateCustomerLoyaltyRecord(BID, PROGID, RECID, { points_balance: "50" });
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe("PATCH");
    expect(init?.method).not.toBe("PUT");
  });

  it("deleteCustomerLoyaltyRecord sends DELETE and tolerates 204", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("DELETE");
      expect(String(url)).toContain(
        `/api/v1/businesses/${BID}/loyalty-programs/${PROGID}/customers/${RECID}/`,
      );
      return new Response(null, { status: 204 });
    });
    await expect(deleteCustomerLoyaltyRecord(BID, PROGID, RECID)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("createCustomerLoyaltyRecord surfaces 400 DRF field errors", async () => {
    mockFetch(
      () =>
        new Response(
          JSON.stringify({ points_balance: ["Points balance must not be negative."] }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        ),
    );
    await expect(
      createCustomerLoyaltyRecord(BID, PROGID, {
        customer: "cccccccc-cccc-cccc-cccc-cccccccccccc",
        points_balance: "-1",
      }),
    ).rejects.toThrow();
  });

  it("getCustomerLoyaltyRecord surfaces 404", async () => {
    mockFetch(
      () =>
        new Response("Not found", {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await expect(getCustomerLoyaltyRecord(BID, PROGID, RECID)).rejects.toThrow();
  });
});