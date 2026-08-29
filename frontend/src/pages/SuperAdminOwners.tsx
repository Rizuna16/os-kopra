import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { apiFetch } from "../lib/apiClient";
import { ApiError } from "../auth/types";
import { Forbidden } from "./Forbidden";

interface OwnerSummary {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_email_verified: boolean;
  business_count: number;
}

export function SuperAdminOwners() {
  const [state, setState] = useState<"loading" | "ok" | "forbidden">("loading");
  const [owners, setOwners] = useState<OwnerSummary[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiFetch<OwnerSummary[]>("/admin/owners/");
        if (active) {
          setOwners(Array.isArray(data) ? data : []);
          setState("ok");
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          if (active) setState("forbidden");
        } else if (active) {
          setOwners([]);
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
    <div data-testid="super-admin-owners" className="p-4">
      <h1 className="text-2xl font-bold mb-6">Owner Management</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 bg-white rounded-xl border border-gray-200 shadow-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usaha</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {owners.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">{o.email}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{`${o.first_name} ${o.last_name}`.trim()}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{o.is_active ? "Active" : "Inactive"}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{o.business_count}</td>
                <td className="px-4 py-3">
                  <NavLink
                    to={`/platform-admin/owners/${o.id}`}
                    className="text-sm text-blue-600 hover:underline font-medium"
                  >
                    Detail
                  </NavLink>
                </td>
              </tr>
            ))}
            {owners.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Tidak ada owner ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
