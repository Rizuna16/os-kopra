import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../lib/apiClient";
import { ApiError } from "../auth/types";
import { Forbidden } from "./Forbidden";

interface AdminDetail {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_superuser: boolean;
  is_active: boolean;
}

export function SuperAdminAdminDetail() {
  const { adminId } = useParams();
  const [state, setState] = useState<"loading" | "ok" | "forbidden" | "notfound">("loading");
  const [admin, setAdmin] = useState<AdminDetail | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiFetch<AdminDetail>(`/admin/admins/${adminId}/`);
        if (active) {
          setAdmin(data);
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
  }, [adminId]);

  if (state === "loading") return <div role="status">Loading…</div>;
  if (state === "forbidden") return <Forbidden />;
  if (state === "notfound" || !admin)
    return <div data-testid="admin-not-found" className="p-4">Admin tidak ditemukan.</div>;

  return (
    <div data-testid="super-admin-admin-detail" className="p-4">
      <h1 className="text-2xl font-bold mb-6">KOPERA Admin Detail</h1>
      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-xs text-gray-500 uppercase">Email</dt>
          <dd className="text-sm text-gray-900">{admin.email}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500 uppercase">Name</dt>
          <dd className="text-sm text-gray-900">{`${admin.first_name} ${admin.last_name}`.trim()}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500 uppercase">Staff</dt>
          <dd className="text-sm text-gray-900">{admin.is_staff ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500 uppercase">Superuser</dt>
          <dd className="text-sm text-gray-900">{admin.is_superuser ? "Yes" : "No"}</dd>
        </div>
      </dl>
    </div>
  );
}
