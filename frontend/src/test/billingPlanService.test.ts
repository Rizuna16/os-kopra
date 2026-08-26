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
];

describe("PART 20 — Plan Service Contract", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("calls GET /api/v1/billing/plans/", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/api/v1/billing/plans/")) {
        return new Response(JSON.stringify(SERVER_PLANS), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    const plans = await listPlans();
    expect(plans).toEqual(SERVER_PLANS);
    const callUrl = String(fetchMock.mock.calls[0][0]);
    expect(callUrl).toContain("/api/v1/billing/plans/");
    expect(callUrl).not.toContain("business_id");
  });

  it("does not require business_id and returns Plan[] with string amount wire type", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/api/v1/billing/plans/")) {
        return new Response(JSON.stringify(SERVER_PLANS), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("[]", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    const plans = await listPlans();
    expect(Array.isArray(plans)).toBe(true);
    expect(typeof plans[0].amount).toBe("string");
    expect(plans[0].amount).toBe("50000.00");
  });
});
