import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  listStocks,
  createStock,
  getStock,
  updateStock,
  deleteStock,
  transferStock,
  adjustStock,
  opnameStock,
  listBatches,
  createBatch,
  getBatch,
  updateBatch,
  deleteBatch,
  listSerials,
  createSerial,
  getSerial,
  updateSerial,
  deleteSerial,
} from "../inventory/inventoryService";

interface Stock {
  id: string;
  location: string;
  variant: string;
  quantity: string;
  created_at: string;
  updated_at: string;
}

interface Batch {
  id: string;
  code: string;
  location: string;
  variant: string;
  quantity: string;
  expired_date: string | null;
  created_at: string;
  updated_at: string;
}

interface SerialNumber {
  id: string;
  batch: string;
  serial_number: string;
  created_at: string;
  updated_at: string;
}

const BID = "11111111-1111-1111-1111-111111111111";
const LOC = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const LOC_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const VID = "vvvvvvvv-vvvv-vvvv-vvvv-vvvvvvvvvvvv";
const SID = "ssssssss-ssss-ssss-ssss-ssssssssssss";
const BATCH_ID = "bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb";
const SERIAL_ID = "cccccccc-1111-1111-1111-cccccccccccc";

function mockFetch(handler: (url: string, init?: RequestInit) => Response): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => handler(url, init));
  (globalThis as any).fetch = fetchMock;
  return fetchMock;
}

const stockSample: Stock = {
  id: SID,
  location: LOC,
  variant: VID,
  quantity: "100.00",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const batchSample: Batch = {
  id: BATCH_ID,
  code: "BATCH-001",
  location: LOC,
  variant: VID,
  quantity: "10.00",
  expired_date: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const serialSample: SerialNumber = {
  id: SERIAL_ID,
  batch: BATCH_ID,
  serial_number: "SN-001",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("inventoryService — Stock collection", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("listStocks requests GET on the exact business/location stocks URL", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify([stockSample]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await listStocks(BID, LOC);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      `/api/v1/businesses/${BID}/locations/${LOC}/stocks/`,
    );
    expect(init?.method ?? "GET").toBe("GET");
    expect(Array.isArray(result)).toBe(true);
  });

  it("listStocks returns a plain array with no pagination envelope", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify([stockSample]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await listStocks(BID, LOC);
    expect(result).toEqual([stockSample]);
    expect(result).not.toHaveProperty("count");
    expect(result).not.toHaveProperty("next");
    expect(result).not.toHaveProperty("results");
  });

  it("createStock sends POST to the exact URL with ONLY variant_id and quantity", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("POST");
      const body = JSON.parse(String(init?.body));
      expect(Object.keys(body).sort()).toEqual(["quantity", "variant_id"]);
      expect(body).not.toHaveProperty("business");
      expect(body).not.toHaveProperty("location");
      expect(body).not.toHaveProperty("id");
      return new Response(JSON.stringify(stockSample), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });
    const result = await createStock(BID, LOC, { variant_id: VID, quantity: 50 });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      `/api/v1/businesses/${BID}/locations/${LOC}/stocks/`,
    );
    expect(result.id).toBe(SID);
  });

  it("createStock requires quantity > 0 (positive numeric)", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify(stockSample), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await createStock(BID, LOC, { variant_id: VID, quantity: 1 });
    expect(result.quantity).toBe("100.00");
  });
});

describe("inventoryService — Stock detail (special /api/stocks/ path)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("getStock requests GET on /api/stocks/<id>/ WITHOUT /v1/", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify(stockSample), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await getStock(SID);
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/api/stocks/${SID}/`);
    expect(String(url)).not.toContain("/api/v1/stocks/");
  });

  it("updateStock sends PATCH to /api/stocks/<id>/ with quantity only, no PUT", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("PATCH");
      const body = JSON.parse(String(init?.body));
      expect(Object.keys(body).sort()).toEqual(["quantity"]);
      expect(body).not.toHaveProperty("location");
      expect(body).not.toHaveProperty("variant");
      expect(body).not.toHaveProperty("id");
      return new Response(JSON.stringify(stockSample), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    await updateStock(SID, { quantity: 200 });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/api/stocks/${SID}/`);
    expect(String(url)).not.toContain("/api/v1/stocks/");
  });

  it("deleteStock sends DELETE to /api/stocks/<id>/ and tolerates 204 empty body", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("DELETE");
      expect(String(url)).toContain(`/api/stocks/${SID}/`);
      return new Response(null, { status: 204 });
    });
    await expect(deleteStock(SID)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("getStock returns quantity as a string (decimal)", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify(stockSample), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await getStock(SID);
    expect(typeof result.quantity).toBe("string");
    expect(result.quantity).toBe("100.00");
  });
});

describe("inventoryService — Transfer / Adjustment / Opname", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("transferStock POSTs to /api/v1/stocks/transfer/ with the required payload", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("POST");
      const body = JSON.parse(String(init?.body));
      expect(Object.keys(body).sort()).toEqual([
        "destination_location",
        "quantity",
        "source_location",
        "variant",
      ]);
      expect(body).not.toHaveProperty("business");
      return new Response(
        JSON.stringify({
          source: stockSample,
          destination: { ...stockSample, location: LOC_B, quantity: "40.00" },
          transferred_quantity: "40.00",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    const result = await transferStock({
      source_location: LOC,
      destination_location: LOC_B,
      variant: VID,
      quantity: 40,
    });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("/api/v1/stocks/transfer/");
    expect(result.transferred_quantity).toBe("40.00");
    expect(result.source.id).toBe(SID);
    expect(result.destination.location).toBe(LOC_B);
  });

  it("adjustStock POSTs to /api/v1/stocks/adjustment/ with location, variant, quantity", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("POST");
      const body = JSON.parse(String(init?.body));
      expect(Object.keys(body).sort()).toEqual(["location", "quantity", "variant"]);
      return new Response(JSON.stringify(stockSample), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const result = await adjustStock({ location: LOC, variant: VID, quantity: 5 });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("/api/v1/stocks/adjustment/");
    expect(result.id).toBe(SID);
  });

  it("opnameStock POSTs to /api/v1/stocks/opname/ with location, variant, quantity", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("POST");
      const body = JSON.parse(String(init?.body));
      expect(Object.keys(body).sort()).toEqual(["location", "quantity", "variant"]);
      return new Response(JSON.stringify(stockSample), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const result = await opnameStock({ location: LOC, variant: VID, quantity: 7 });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("/api/v1/stocks/opname/");
    expect((result as Stock).id).toBe(SID);
  });

  it("opnameStock handles the detail-only success response when no stock exists", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify({ detail: "No stock found and physical quantity is 0." }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await opnameStock({ location: LOC, variant: VID, quantity: 0 });
    expect((result as { detail: string }).detail).toBe(
      "No stock found and physical quantity is 0.",
    );
  });
});

describe("inventoryService — Batch", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("listBatches GETs /api/v1/inventory/batches/ and returns a plain array", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify([batchSample]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await listBatches();
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("/api/v1/inventory/batches/");
    expect(init?.method ?? "GET").toBe("GET");
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].code).toBe("BATCH-001");
  });

  it("createBatch POSTs with code, location, variant, quantity, expired_date", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("POST");
      const body = JSON.parse(String(init?.body));
      expect(Object.keys(body).sort()).toEqual([
        "code",
        "expired_date",
        "location",
        "quantity",
        "variant",
      ]);
      return new Response(JSON.stringify(batchSample), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });
    await createBatch({
      code: "BATCH-001",
      location: LOC,
      variant: VID,
      quantity: 10,
      expired_date: null,
    });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("/api/v1/inventory/batches/");
  });

  it("getBatch GETs /api/v1/inventory/batches/<id>/", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify(batchSample), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await getBatch(BATCH_ID);
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`/api/v1/inventory/batches/${BATCH_ID}/`);
  });

  it("updateBatch PATCHes writable code/quantity/expired_date only (no location/variant)", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("PATCH");
      const body = JSON.parse(String(init?.body));
      expect(Object.keys(body).sort()).toEqual(["code", "expired_date", "quantity"]);
      expect(body).not.toHaveProperty("location");
      expect(body).not.toHaveProperty("variant");
      return new Response(JSON.stringify(batchSample), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    await updateBatch(BATCH_ID, { code: "BATCH-002", quantity: 25, expired_date: "2027-06-30" });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`/api/v1/inventory/batches/${BATCH_ID}/`);
  });

  it("updateBatch allows clearing expired_date to null", async () => {
    mockFetch((url, init) => {
      const body = JSON.parse(String(init?.body));
      expect(body.expired_date).toBeNull();
      return new Response(JSON.stringify({ ...batchSample, expired_date: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const result = await updateBatch(BATCH_ID, { expired_date: null });
    expect(result.expired_date).toBeNull();
  });

  it("deleteBatch DELETEs /api/v1/inventory/batches/<id>/ and tolerates 204", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("DELETE");
      return new Response(null, { status: 204 });
    });
    await expect(deleteBatch(BATCH_ID)).resolves.toBeUndefined();
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`/api/v1/inventory/batches/${BATCH_ID}/`);
  });

  it("Batch.quantity is independent from Stock.quantity (no equality assumption)", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify(batchSample), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const batch = await getBatch(BATCH_ID);
    expect(typeof batch.quantity).toBe("string");
    expect(batch).not.toHaveProperty("stock_quantity");
  });
});

describe("inventoryService — Serial Number", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("listSerials GETs /api/v1/inventory/serial-numbers/ and returns a plain array", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify([serialSample]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await listSerials();
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("/api/v1/inventory/serial-numbers/");
    expect(init?.method ?? "GET").toBe("GET");
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].serial_number).toBe("SN-001");
  });

  it("createSerial POSTs with batch and serial_number only", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("POST");
      const body = JSON.parse(String(init?.body));
      expect(Object.keys(body).sort()).toEqual(["batch", "serial_number"]);
      return new Response(JSON.stringify(serialSample), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });
    await createSerial({ batch: BATCH_ID, serial_number: "SN-001" });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("/api/v1/inventory/serial-numbers/");
  });

  it("getSerial GETs /api/v1/inventory/serial-numbers/<id>/", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify(serialSample), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await getSerial(SERIAL_ID);
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`/api/v1/inventory/serial-numbers/${SERIAL_ID}/`);
  });

  it("updateSerial PATCHes serial_number only (batch is NOT sent)", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("PATCH");
      const body = JSON.parse(String(init?.body));
      expect(Object.keys(body).sort()).toEqual(["serial_number"]);
      expect(body).not.toHaveProperty("batch");
      return new Response(JSON.stringify({ ...serialSample, serial_number: "SN-002" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    await updateSerial(SERIAL_ID, { serial_number: "SN-002" });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`/api/v1/inventory/serial-numbers/${SERIAL_ID}/`);
  });

  it("deleteSerial DELETEs /api/v1/inventory/serial-numbers/<id>/ and tolerates 204", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("DELETE");
      return new Response(null, { status: 204 });
    });
    await expect(deleteSerial(SERIAL_ID)).resolves.toBeUndefined();
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`/api/v1/inventory/serial-numbers/${SERIAL_ID}/`);
  });
});

describe("inventoryService — Error contract", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("createStock surfaces 400 DRF field errors without faking success", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify({ variant_id: ["Variant tidak ditemukan."] }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await expect(
      createStock(BID, LOC, { variant_id: VID, quantity: 1 }),
    ).rejects.toThrow();
  });

  it("getStock surfaces 404 without exposing existence", async () => {
    mockFetch(
      () =>
        new Response("Not found", {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await expect(getStock(SID)).rejects.toThrow();
  });

  it("transferStock surfaces cross-business/same-business 400 errors", async () => {
    mockFetch(
      () =>
        new Response(
          JSON.stringify({ non_field_errors: ["Source and destination must be in the same business."] }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        ),
    );
    await expect(
      transferStock({ source_location: LOC, destination_location: LOC_B, variant: VID, quantity: 1 }),
    ).rejects.toThrow();
  });
});
