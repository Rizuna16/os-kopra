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
  await bootAuthCapture(authed);
}

/**
 * bootAuthCapture simulates a specific actor profile for platform/admin auth tests.
 * - authed=false  -> /auth/me/ returns 401 (unauthenticated)
 * - superuser=false -> platform /api/v1/admin/* endpoints return 403 (denied)
 * - superuser=true  -> platform /api/v1/admin/* endpoints return 200 (allowed)
 * This mirrors the real backend IsSuperAdmin boundary (server-side is_superuser),
 * which the frontend cannot pre-detect because /auth/me/ omits is_superuser.
 */
export async function bootAuthCapture(
  authed: boolean,
  opts: { superuser?: boolean } = {},
): Promise<void> {
  const superuser = opts.superuser ?? false;
  const ts = await import("../lib/tokenStore");
  if (authed) {
    ts.setRefreshToken("r");
    ts.setAccessToken("a");
  } else {
    ts.clearTokens();
  }
  (globalThis as any).fetch = vi.fn(
    async (url: string, init?: { method?: string }) => {
      const method = (init?.method ?? "GET").toUpperCase();
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
      if (String(url).includes("/api/v1/admin/")) {
        if (!superuser) {
          return new Response(
            JSON.stringify({ error: true, message: "Forbidden", status_code: 403 }),
            { status: 403, headers: { "Content-Type": "application/json" } },
          );
        }
        // Superuser: return sane payloads per endpoint + method.
        if (
          String(url).includes("/businesses/") ||
          String(url).includes("/audit-logs/")
        ) {
          return new Response("[]", {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (String(url).includes("/backups/") && method === "GET") {
          return new Response(
            JSON.stringify([
              {
                id: "bk-1",
                triggered_by: "super@kopera.dev",
                created_at: "2024-01-01T00:00:00Z",
                status: "COMPLETED",
                integrity: "abc",
                verified: true,
                restored_at: null,
                notes: null,
              },
            ]),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        // POST trigger/restore or GET monitoring
        return new Response("{}", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  );
}
