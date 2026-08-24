import { vi } from "vitest";
import type { User } from "../auth/types";
import { useBusiness } from "../business/BusinessContext";

export function BusinessProbe() {
  const b = useBusiness();
  return (
    <div data-testid="biz-probe">
      {JSON.stringify({
        businesses: b.businesses,
        currentBusinessId: b.currentBusinessId,
        currentLocationId: b.currentLocationId,
        currentBusiness: b.currentBusiness,
        locations: b.locations,
        currentLocation: b.currentLocation,
        isOnboardingComplete: b.isOnboardingComplete,
        subscriptionCreated: b.subscriptionCreated,
      })}
    </div>
  );
}

export const userObj: User = {
  id: "1",
  email: "a@b.com",
  first_name: "",
  last_name: "",
  is_email_verified: true,
  created_at: "",
  updated_at: "",
};

export async function bootAuth(authed: boolean): Promise<void> {
  const ts = await import("../lib/tokenStore");
  if (authed) {
    ts.setRefreshToken("r");
    ts.setAccessToken("a");
  } else {
    ts.clearTokens();
  }
  (globalThis as any).fetch = vi.fn(
    async (url: string) => {
      if (String(url).includes("/auth/me/")) {
        if (authed) {
          return new Response(JSON.stringify(userObj), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: true, message: "u", status_code: 401 }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  );
}
