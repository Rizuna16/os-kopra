import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { apiFetch } from "../lib/apiClient";
import { ApiError } from "../auth/types";
import { Forbidden } from "./Forbidden";

interface BusinessSummary {
  id: string;
  name: string;
  status: string;
  owner_id: string;
  subscription_status: string | null;
}

export function SuperAdminBusinesses() {
  const [state, setState] = useState<"loading" | "ok" | "forbidden">("loading");
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiFetch<BusinessSummary[]>("/admin/businesses/");
        if (active) {
          setBusinesses(Array.isArray(data) ? data : []);
          setState("ok");
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
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

  if (state === "loading") {
    return <div role="status">Loading…</div>;
  }

  if (state === "forbidden") {
    return <Forbidden />;
  }

  return (
    <div data-testid="super-admin-businesses" className="p-4">
      <h1 className="text-2xl font-bold mb-6">Usaha Management</h1>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 bg-white rounded-xl border border-gray-200 shadow-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subscription</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {businesses.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">{b.name}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    b.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                  }`}>
                    {b.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{b.owner_id}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    b.subscription_status === "ACTIVE" ? "bg-green-100 text-green-800" :
                    b.subscription_status === "EXPIRED" ? "bg-red-100 text-red-800" :
                    b.subscription_status ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-500"
                  }`}>
                    {b.subscription_status ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <NavLink
                    to={`/platform-admin/businesses/${b.id}`}
                    className="text-sm text-blue-600 hover:underline font-medium"
                  >
                    Detail
                  </NavLink>
                </td>
              </tr>
            ))}
            {businesses.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Tidak ada usaha ditemukan.
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