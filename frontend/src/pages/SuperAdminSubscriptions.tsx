import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  listPlatformSubscriptions,
  isForbidden,
  type PlatformSubscription,
} from "../services/platformAdmin";
import { Forbidden } from "./Forbidden";

function statusBadge(status: string | null | undefined) {
  const s = status ?? "";
  const cls =
    s === "ACTIVE"
      ? "bg-green-100 text-green-800"
      : s === "SUSPENDED"
        ? "bg-red-100 text-red-800"
        : s === "CANCELED"
          ? "bg-red-100 text-red-800"
          : "bg-amber-100 text-amber-800";
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${cls}`}>
      {s || "—"}
    </span>
  );
}

export function SuperAdminSubscriptions() {
  const [state, setState] = useState<"loading" | "ok" | "forbidden">("loading");
  const [subs, setSubs] = useState<PlatformSubscription[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await listPlatformSubscriptions();
        if (active) {
          setSubs(data);
          setState("ok");
        }
      } catch (err) {
        if (isForbidden(err)) {
          if (active) setState("forbidden");
        } else if (active) {
          setError(err instanceof Error ? err.message : "Request failed.");
          setState("ok");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (state === "loading") return <div role="status">Loading…</div>;
  if (state === "forbidden") return <Forbidden />;

  return (
    <div data-testid="super-admin-subscriptions" className="p-4">
      <h1 className="text-2xl font-bold mb-6">Subscription Governance</h1>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 bg-white rounded-xl border border-gray-200 shadow-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {subs.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">
                  {s.business_name ?? s.business_id}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {s.owner_email ?? s.owner_id ?? "—"}
                </td>
                <td className="px-4 py-3">{statusBadge(s.status)}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3">
                  <NavLink
                    to={`/platform-admin/subscriptions/${s.id}`}
                    className="text-sm text-blue-600 hover:underline font-medium"
                  >
                    Detail
                  </NavLink>
                </td>
              </tr>
            ))}
            {subs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Tidak ada subscription ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
          {error}
        </p>
      )}
    </div>
  );
}
