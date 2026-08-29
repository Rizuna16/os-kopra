import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { apiFetch } from "../lib/apiClient";
import { ApiError } from "../auth/types";
import { Forbidden } from "./Forbidden";

interface AccountSummary {
  owner_id: string;
  owner_email: string;
  owner_name: string;
  business_count: number;
  user_count: number;
  subscription_summary: { total: number; active: number; expired: number };
}

export function SuperAdminAccounts() {
  const [state, setState] = useState<"loading" | "ok" | "forbidden">("loading");
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiFetch<AccountSummary[]>("/admin/accounts/");
        if (active) {
          setAccounts(Array.isArray(data) ? data : []);
          setState("ok");
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          if (active) setState("forbidden");
        } else if (active) {
          setAccounts([]);
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
    <div data-testid="super-admin-accounts" className="p-4">
      <h1 className="text-2xl font-bold mb-6">Account Management</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 bg-white rounded-xl border border-gray-200 shadow-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usaha</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subscription</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {accounts.map((a) => (
              <tr key={a.owner_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">{a.owner_name || a.owner_email}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{a.business_count}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{a.user_count}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{a.subscription_summary.active} aktif</td>
                <td className="px-4 py-3">
                  <NavLink
                    to={`/platform-admin/accounts/${a.owner_id}`}
                    className="text-sm text-blue-600 hover:underline font-medium"
                  >
                    Detail
                  </NavLink>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Tidak ada account ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
