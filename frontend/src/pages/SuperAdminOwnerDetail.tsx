import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../lib/apiClient";
import { ApiError } from "../auth/types";
import { Forbidden } from "./Forbidden";

interface OwnerDetail {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_email_verified: boolean;
  business_count: number;
  businesses: { id: string; name: string; status: string }[];
  subscription_summary: { total: number; active: number; expired: number };
}

export function SuperAdminOwnerDetail() {
  const { ownerId } = useParams();
  const [state, setState] = useState<"loading" | "ok" | "forbidden" | "notfound">("loading");
  const [owner, setOwner] = useState<OwnerDetail | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiFetch<OwnerDetail>(`/admin/owners/${ownerId}/`);
        if (active) {
          setOwner(data);
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
  }, [ownerId]);

  if (state === "loading") return <div role="status">Loading…</div>;
  if (state === "forbidden") return <Forbidden />;
  if (state === "notfound" || !owner)
    return <div data-testid="owner-not-found" className="p-4">Owner tidak ditemukan.</div>;

  return (
    <div data-testid="super-admin-owner-detail" className="p-4">
      <h1 className="text-2xl font-bold mb-6">Owner Detail</h1>
      <dl className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <dt className="text-xs text-gray-500 uppercase">Email</dt>
          <dd className="text-sm text-gray-900">{owner.email}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500 uppercase">Name</dt>
          <dd className="text-sm text-gray-900">{`${owner.first_name} ${owner.last_name}`.trim()}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500 uppercase">Status</dt>
          <dd className="text-sm text-gray-900">{owner.is_active ? "Active" : "Inactive"}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500 uppercase">Business Count</dt>
          <dd className="text-sm text-gray-900">{owner.business_count}</dd>
        </div>
      </dl>
      <h2 className="text-lg font-semibold mb-2">Businesses</h2>
      <ul className="space-y-1">
        {owner.businesses.map((b) => (
          <li key={b.id} className="text-sm text-gray-700">
            {b.name} — <span className="text-gray-500">{b.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
