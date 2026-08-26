import { describe, it, expect, beforeEach, vi } from "vitest";
import { createPayment } from "../business/businessService";

const SUB_ID = "11111111-1111-1111-1111-111111111111";
const PLAN_ID = "22222222-2222-2222-2222-222222222222";

describe("PART 21 — Payment Service Contract (RED)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("calls POST /api/v1/billing/payments/ with subscription_id and plan_id", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      return new Response(
        JSON.stringify({
          id: "pay-1",
          status: "PENDING",
          provider_reference: "snap-token-abc",
          redirect_url: "https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-abc",
          token: "snap-token-abc",
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    });
    (globalThis as any).fetch = fetchMock;

    const result = await createPayment(SUB_ID, PLAN_ID);
    expect(result.id).toBe("pay-1");
    expect(result.status).toBe("PENDING");
    expect(result.token).toBe("snap-token-abc");

    const call = fetchMock.mock.calls[0];
    expect(String(call[0])).toContain("/api/v1/billing/payments/");
    expect((call[1] as RequestInit).method).toBe("POST");

    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body.subscription_id).toBe(SUB_ID);
    expect(body.plan_id).toBe(PLAN_ID);
  });

  it("does not send amount, currency, status, provider_reference, or paid_at from client", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse((init?.body as string) || "{}");
      expect(body.amount).toBeUndefined();
      expect(body.currency).toBeUndefined();
      expect(body.status).toBeUndefined();
      expect(body.provider_reference).toBeUndefined();
      expect(body.paid_at).toBeUndefined();
      return new Response(
        JSON.stringify({
          id: "pay-1",
          status: "PENDING",
          provider_reference: "token",
          redirect_url: "url",
          token: "token",
        }),
        { status: 201 }
      );
    });
    (globalThis as any).fetch = fetchMock;

    await createPayment(SUB_ID, PLAN_ID);
  });
});
