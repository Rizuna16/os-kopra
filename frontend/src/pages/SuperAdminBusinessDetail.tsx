import { useState, useEffect } from "react";
import { useParams, NavLink } from "react-router-dom";
import { apiFetch } from "../lib/apiClient";
import { ApiError } from "../auth/types";
import { Forbidden } from "./Forbidden";

interface BusinessDetail {
  id: string;
  name: string;
  status: string;
  owner_id: string;
  subscription_status: string | null;
}

export function SuperAdminBusinessDetail() {
  const { businessId } = useParams<{ businessId: string }>();
  const [state, setState] = useState<"loading" | "ok" | "forbidden">("loading");
  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiFetch<BusinessDetail>(`/admin/businesses/${businessId}/`);
        if (active) {
          setBusiness(data);
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
  }, [businessId]);

  if (state === "loading") {
    return <div role="status">Loading…</div>;
  }

  if (state === "forbidden") {
    return <Forbidden />;
  }

  if (!business && error) {
    return (
      <div className="p-4">
        <p role="alert" className="text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
          {error}
        </p>
        <NavLink to="/platform-admin/businesses" className="text-blue-600 hover:underline mt-4 inline-block">
          &larr; Kembali ke daftar usaha
        </NavLink>
      </div>
    );
  }

  return (
    <div data-testid="super-admin-business-detail" className="p-4 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Detail Usaha</h1>
        <NavLink to="/platform-admin/businesses" className="text-sm text-blue-600 hover:underline">
          &larr; Kembali
        </NavLink>
      </div>

      {business && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">ID Usaha</span>
            <span className="text-gray-900 font-mono text-sm">{business.id}</span>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Nama Usaha</span>
            <span className="text-gray-950 font-semibold">{business.name}</span>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Status</span>
            <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
              business.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
            }`}>
              {business.status}
            </span>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Owner ID</span>
            <span className="text-gray-900 font-mono text-sm">{business.owner_id}</span>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Subscription Status</span>
            <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
              business.subscription_status === "ACTIVE" ? "bg-green-100 text-green-800" :
              business.subscription_status === "EXPIRED" ? "bg-red-100 text-red-800" :
              business.subscription_status ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-500"
            }`}>
              {business.subscription_status ?? "None"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}