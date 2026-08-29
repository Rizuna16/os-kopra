import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../lib/apiClient";
import { ApiError } from "../auth/types";
import { Forbidden } from "./Forbidden";

interface UserDetail {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  is_email_verified: boolean;
  created_at: string | null;
  accessible_businesses: { id: string; name: string; status: string }[];
  memberships: { business_id: string; role: string }[];
  employee_info: { business_id: string; name: string; code: string | null; active: boolean }[];
}

export function SuperAdminUserDetail() {
  const { userId } = useParams();
  const [state, setState] = useState<"loading" | "ok" | "forbidden" | "notfound">("loading");
  const [user, setUser] = useState<UserDetail | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiFetch<UserDetail>(`/admin/users/${userId}/`);
        if (active) {
          setUser(data);
          setState("ok");
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          if (active) setState("forbidden");
        } else if (active) {
          setState("notfound");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  if (state === "loading") return <div role="status">Loading…</div>;
  if (state === "forbidden") return <Forbidden />;
  if (state === "notfound" || !user)
    return <div data-testid="user-not-found" className="p-4">User tidak ditemukan.</div>;

  return (
    <div data-testid="super-admin-user-detail" className="p-4">
      <h1 className="text-2xl font-bold mb-6">User Detail</h1>
      <dl className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <dt className="text-xs text-gray-500 uppercase">Email</dt>
          <dd className="text-sm text-gray-900">{user.email}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500 uppercase">Name</dt>
          <dd className="text-sm text-gray-900">{`${user.first_name} ${user.last_name}`.trim()}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500 uppercase">Staff</dt>
          <dd className="text-sm text-gray-900">{user.is_staff ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500 uppercase">Superuser</dt>
          <dd className="text-sm text-gray-900">{user.is_superuser ? "Yes" : "No"}</dd>
        </div>
      </dl>
      <h2 className="text-lg font-semibold mb-2">Accessible Businesses</h2>
      <ul className="space-y-1 mb-4">
        {user.accessible_businesses.map((b) => (
          <li key={b.id} className="text-sm text-gray-700">
            {b.name} — <span className="text-gray-500">{b.status}</span>
          </li>
        ))}
      </ul>
      <h2 className="text-lg font-semibold mb-2">Memberships</h2>
      <ul className="space-y-1">
        {user.memberships.map((m) => (
          <li key={m.business_id} className="text-sm text-gray-700">
            Business {m.business_id} — Role: {m.role}
          </li>
        ))}
      </ul>
    </div>
  );
}
