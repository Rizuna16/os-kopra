import { describe, it, expect, beforeEach, vi } from "vitest";
import { createLocation, listLocations } from "../business/businessService";
import type { LocationSummary } from "../business/types";

const BIZ_ID = "11111111-1111-1111-1111-111111111111";
const SERVER_LOC: LocationSummary = { id: "l1", name: "Toko Utama" };

function mockLocationPost() {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (String(url).includes(`/api/v1/businesses/${BIZ_ID}/locations/`)) {
      if ((init?.method ?? "GET") === "POST") {
        return new Response(JSON.stringify(SERVER_LOC), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify([SERVER_LOC]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("{}", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  (globalThis as any).fetch = fetchMock;
  return fetchMock;
}

describe("Location creation (onboarding)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("POSTs { name } and returns the server location id (no client id)", async () => {
    const fetchMock = mockLocationPost();
    const result = await createLocation(BIZ_ID, "Toko Utama");
    expect(result.id).toBe("l1");
    const call = fetchMock.mock.calls[0];
    expect(String(call[0])).toBe(
      `/api/v1/businesses/${BIZ_ID}/locations/`,
    );
    expect((call[1] as RequestInit).method).toBe("POST");
    expect(JSON.parse((call[1] as RequestInit).body as string)).toEqual({
      name: "Toko Utama",
    });
  });

  it("GET locations populates the location list for the business", async () => {
    mockLocationPost();
    const result = await listLocations(BIZ_ID);
    expect(result).toEqual([SERVER_LOC]);
    const fetchMock = (globalThis as unknown as { fetch: typeof fetch }).fetch as ReturnType<
      typeof vi.fn
    >;
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      `/api/v1/businesses/${BIZ_ID}/locations/`,
    );
  });

  it("location belongs to the current business id", async () => {
    mockLocationPost();
    const result = await createLocation(BIZ_ID, "Toko Utama");
    expect(result.id).toBe("l1");
    expect(typeof result.id).toBe("string");
  });
});
