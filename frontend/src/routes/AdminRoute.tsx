import type { ReactNode } from "react";
import { ProtectedRoute } from "./ProtectedRoute";

/**
 * Super-admin access is enforced server-side (IsSuperAdmin, PART 25).
 * /me does NOT expose is_superuser, so a reliable client pre-guard is not
 * possible from current data. The Admin page therefore handles the server
 * 403 response by rendering the Forbidden state. This route is simply the
 * authenticated guard.
 */
export function AdminRoute({ children }: { children: ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
