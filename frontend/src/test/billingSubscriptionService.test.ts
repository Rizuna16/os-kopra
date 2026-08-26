import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSubscription } from "../business/businessService";
import type { SubscriptionSummary } from "../business/types";

const BIZ_ID = "22222222-2222-2222-2222-222222222222";
const SERVER_SUB: SubscriptionSummary = {
  id: "sub-1",
  business: BIZ_ID,
  status: "ONBOARDING",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("PART 20 — Subscription Service Contract", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("calls POST /api/v1/businesses/<business_id>/subscription/ using current business ID with empty body", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes(`/api/v1/businesses/${BIZ_ID}/subscription/`)) {
        return new Response(JSON.stringify(SERVER_SUB), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("{}", { status: 200 });
    });
    (globalThis as any).fetch = fetchMock;

    const result = await createSubscription(BIZ_ID);
    expect(result).toEqual(SERVER_SUB);

    const call = fetchMock.mock.calls[0];
    expect(String(call[0])).toBe(`/api/v1/businesses/${BIZ_ID}/subscription/`);
    expect((call[1] as RequestInit).method).toBe("POST");
    expect(JSON.parse((call[1] as RequestInit).body as string)).toEqual({});
  });

  it("request does not include plan_id, owner, user, business, or payment in body", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse((init?.body as string) || "{}");
      expect(body.plan_id).toBeUndefined();
      expect(body.owner).toBeUndefined();
      expect(body.user).toBeUndefined();
      expect(body.business).toBeUndefined();
      expect(body.payment).toBeUndefined();
      return new Response(JSON.stringify(SERVER_SUB), { status: 201 });
    });
    (globalThis as any).fetch = fetchMock;

    await createSubscription(BIZ_ID);
  });

  it("initial status is ONBOARDING and response correctly represents id, business, status, timestamps", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify(SERVER_SUB), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    });
    (globalThis as any).fetch = fetchMock;

    const res = await createSubscription(BIZ_ID);
    expect(res.status).toBe("ONBOARDING");
    expect(res.id).toBe("sub-1");
    expect(res.business).toBe(BIZ_ID);
    expect(res.created_at).toBeTruthy();
    expect(res.updated_at).toBeTruthy();
  });
});
