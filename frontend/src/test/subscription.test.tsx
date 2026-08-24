import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSubscription } from "../business/businessService";
import type { SubscriptionSummary } from "../business/types";

const BIZ_ID = "11111111-1111-1111-1111-111111111111";
const SERVER_SUB: SubscriptionSummary = {
  id: "s1",
  business: BIZ_ID,
  status: "ONBOARDING",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

function mockSubscriptionPost() {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (String(url).includes(`/api/v1/businesses/${BIZ_ID}/subscription/`)) {
      return new Response(JSON.stringify(SERVER_SUB), {
        status: 201,
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

describe("Subscription creation (onboarding)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("POSTs an empty JSON body to the current business subscription endpoint", async () => {
    const fetchMock = mockSubscriptionPost();
    const result = await createSubscription(BIZ_ID);
    expect(result.id).toBe("s1");
    expect(result.status).toBe("ONBOARDING");
    const call = fetchMock.mock.calls[0];
    expect(String(call[0])).toBe(
      `/api/v1/businesses/${BIZ_ID}/subscription/`,
    );
    expect((call[1] as RequestInit).method).toBe("POST");
    expect(JSON.parse((call[1] as RequestInit).body as string)).toEqual({});
  });

  it("preserves the ONBOARDING status from the backend", async () => {
    mockSubscriptionPost();
    const result = await createSubscription(BIZ_ID);
    expect(result.status).toBe("ONBOARDING");
    expect(result.business).toBe(BIZ_ID);
  });
});
