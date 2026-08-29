import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../lib/apiClient";
import { ApiError } from "../auth/types";
import { Forbidden } from "./Forbidden";

interface AccountDetail {
  owner_id: string;
  owner_email: string;
  owner_name: string;
  business_count: number;
  businesses: { id: string; name: string; status: string }[];
  user_count: number;
  subscription_summary: { total: number; active: number; expired: number };
}

export function SuperAdminAccountDetail() {
  const { ownerUserId } = useParams();
  const [state, setState] = useState<"loading" | "ok" | "forbidden" | "notfound">("loading");
  const [account, setAccount] = useState<AccountDetail | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiFetch<AccountDetail>(`/admin/accounts/${ownerUserId}/`);
        if (active) {
          setAccount(data);
          setState("ok");
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          if (active) setState("forbidden");
        } else if (err instanceof ApiError && err.status === 404) {
          if (active) setState("notfound");
        } else if (active) {
          setState("notfound");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [ownerUserId]);

  if (state === "loading") return <div role="status">Loading…</div>;
  if (state === "forbidden") return <Forbidden />;
  if (state === "notfound" || !account)
    return <div data-testid="account-not-found" className="p-4">Account tidak ditemukan.</div>;

  return (
    <div data-testid="super-admin-account-detail" className="p-4">
      <h1 className="text-2xl font-bold mb-6">Account Detail</h1>
      <dl className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <dt className="text-xs text-gray-500 uppercase">Owner</dt>
          <dd className="text-sm text-gray-900">{account.owner_name || account.owner_email}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500 uppercase">Email</dt>
          <dd className="text-sm text-gray-900">{account.owner_email}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500 uppercase">Business Count</dt>
          <dd className="text-sm text-gray-900">{account.business_count}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500 uppercase">User Count</dt>
          <dd className="text-sm text-gray-900">{account.user_count}</dd>
        </div>
      </dl>
      <h2 className="text-lg font-semibold mb-2">Businesses</h2>
      <ul className="space-y-1">
        {account.businesses.map((b) => (
          <li key={b.id} className="text-sm text-gray-700">
            {b.name} — <span className="text-gray-500">{b.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
