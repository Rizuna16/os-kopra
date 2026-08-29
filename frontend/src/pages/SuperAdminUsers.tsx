import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { apiFetch } from "../lib/apiClient";
import { ApiError } from "../auth/types";
import { Forbidden } from "./Forbidden";

interface UserSummary {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
}

export function SuperAdminUsers() {
  const [state, setState] = useState<"loading" | "ok" | "forbidden">("loading");
  const [users, setUsers] = useState<UserSummary[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiFetch<UserSummary[]>("/admin/users/");
        if (active) {
          setUsers(Array.isArray(data) ? data : []);
          setState("ok");
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          if (active) setState("forbidden");
        } else if (active) {
          setUsers([]);
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
    <div data-testid="super-admin-users" className="p-4">
      <h1 className="text-2xl font-bold mb-6">User / Employee Management</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 bg-white rounded-xl border border-gray-200 shadow-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Superuser</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">{u.email}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{`${u.first_name} ${u.last_name}`.trim()}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{u.is_staff ? "Yes" : "No"}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{u.is_superuser ? "Yes" : "No"}</td>
                <td className="px-4 py-3">
                  <NavLink
                    to={`/platform-admin/users/${u.id}`}
                    className="text-sm text-blue-600 hover:underline font-medium"
                  >
                    Detail
                  </NavLink>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Tidak ada user ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
