import { describe, it, expect, beforeEach, vi } from "vitest";
import { listPlans } from "../business/businessService";
import type { Plan } from "../business/types";

const SERVER_PLANS: Plan[] = [
  {
    id: "plan-1",
    name: "Basic",
    code: "BASIC",
    amount: "50000.00",
    currency: "IDR",
    billing_interval: "MONTHLY",
  },
  {
    id: "plan-2",
    name: "Pro",
    code: "PRO",
    amount: "200000.00",
    currency: "IDR",
    billing_interval: "MONTHLY",
  },
];

function mockPlansGet() {
  const fetchMock = vi.fn(async (url: string) => {
    if (String(url).includes("/api/v1/billing/plans/")) {
      return new Response(JSON.stringify(SERVER_PLANS), {
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

describe("Plan loading (onboarding)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("loads plans from /api/v1/billing/plans/", async () => {
    const fetchMock = mockPlansGet();
    const plans = await listPlans();
    expect(plans).toEqual(SERVER_PLANS);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/api/v1/billing/plans/",
    );
  });

  it("plans expose server-defined fields only (no client invention)", async () => {
    mockPlansGet();
    const plans = await listPlans();
    const keys = Object.keys(plans[0]).sort();
    expect(keys).toEqual(
      ["amount", "billing_interval", "code", "currency", "id", "name"].sort(),
    );
  });
});
