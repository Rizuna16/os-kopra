import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "../employee/employeeService";
import type { Employee } from "../employee/types";

const BID = "11111111-1111-1111-1111-111111111111";
const EID = "33333333-3333-3333-3333-333333333333";

function mockFetch(
  handler: (url: string, init?: RequestInit) => Response,
): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => handler(url, init));
  (globalThis as any).fetch = fetchMock;
  return fetchMock;
}

const sample: Employee = {
  id: EID,
  business: BID,
  name: "Employee A",
  code: "EMP001",
  hire_date: "2024-01-01",
  active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("employeeService", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("listEmployees requests GET on the exact business employees collection and returns a plain array", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify([sample]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await listEmployees(BID);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/api/v1/businesses/${BID}/employees/`);
    expect(init?.method ?? "GET").toBe("GET");
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].id).toBe(EID);
  });

  it("listEmployees does NOT parse pagination metadata (plain array contract)", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify([sample]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await listEmployees(BID);
    expect(result).toEqual([sample]);
    expect(result).not.toHaveProperty("count");
    expect(result).not.toHaveProperty("next");
    expect(result).not.toHaveProperty("results");
  });

  it("getEmployee requests GET on the exact business/employee detail URL", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify(sample), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const result = await getEmployee(BID, EID);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/api/v1/businesses/${BID}/employees/${EID}/`);
    expect(init?.method ?? "GET").toBe("GET");
    expect(result.id).toBe(EID);
  });

  it("createEmployee sends POST with exactly name, code, hire_date, active", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("POST");
      const body = JSON.parse(String(init?.body));
      expect(Object.keys(body).sort()).toEqual(["active", "code", "hire_date", "name"]);
      expect(body).not.toHaveProperty("business");
      expect(body).not.toHaveProperty("id");
      expect(body).not.toHaveProperty("created_at");
      expect(body).not.toHaveProperty("updated_at");
      return new Response(JSON.stringify(sample), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });
    const result = await createEmployee(BID, {
      name: "Employee A",
      code: "EMP001",
      hire_date: "2024-01-01",
      active: true,
    });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/api/v1/businesses/${BID}/employees/`);
    expect(String(url)).not.toContain(`/employees/${EID}`);
    expect(result.id).toBe(EID);
  });

  it("updateEmployee sends PATCH with only writable fields", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("PATCH");
      const body = JSON.parse(String(init?.body));
      expect(Object.keys(body).sort()).toEqual(["active", "code", "hire_date", "name"]);
      expect(body).not.toHaveProperty("business");
      expect(body).not.toHaveProperty("id");
      expect(body).not.toHaveProperty("created_at");
      expect(body).not.toHaveProperty("updated_at");
      return new Response(JSON.stringify({ ...sample, name: "Employee B" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const result = await updateEmployee(BID, EID, {
      name: "Employee B",
      code: "EMP001",
      hire_date: "2024-01-01",
      active: true,
    });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/api/v1/businesses/${BID}/employees/${EID}/`);
    expect(result.name).toBe("Employee B");
  });

  it("updateEmployee does NOT use PUT", async () => {
    const fetchMock = mockFetch(
      () =>
        new Response(JSON.stringify(sample), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await updateEmployee(BID, EID, { name: "X" });
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe("PATCH");
    expect(init?.method).not.toBe("PUT");
  });

  it("deleteEmployee sends DELETE and tolerates 204 empty body", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.method).toBe("DELETE");
      expect(String(url)).toContain(`/api/v1/businesses/${BID}/employees/${EID}/`);
      return new Response(null, { status: 204 });
    });
    await expect(deleteEmployee(BID, EID)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("createEmployee surfaces 400 DRF field errors without faking success", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify({ name: ["This field is required."] }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await expect(createEmployee(BID, { name: "" })).rejects.toThrow();
  });

  it("updateEmployee surfaces 400 DRF field errors without faking success", async () => {
    mockFetch(
      () =>
        new Response(JSON.stringify({ code: ["Employee with this code already exists for the business."] }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await expect(updateEmployee(BID, EID, { code: "EMP001" })).rejects.toThrow();
  });

  it("getEmployee surfaces 404 without exposing existence", async () => {
    mockFetch(
      () =>
        new Response("Not found", {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
    );
    await expect(getEmployee(BID, EID)).rejects.toThrow();
  });
});
