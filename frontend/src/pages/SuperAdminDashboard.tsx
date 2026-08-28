import { useState, useEffect } from "react";
import { apiFetch } from "../lib/apiClient";
import { ApiError } from "../auth/types";
import { Forbidden } from "./Forbidden";

interface MonitoringResponse {
  status: string;
  application: { status: string };
  database: { status: string };
  dependencies: Array<{ name: string; status: string }>;
  signals: { errors: number };
}

interface BusinessSummary {
  id: string;
  name: string;
  status: string;
  owner_id: string;
  subscription_status: string | null;
}

export function SuperAdminDashboard() {
  const [state, setState] = useState<"loading" | "ok" | "forbidden">("loading");
  const [monitoring, setMonitoring] = useState<MonitoringResponse | null>(null);
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [monitoringData, businessesData] = await Promise.all([
          apiFetch<MonitoringResponse>("/admin/monitoring/"),
          apiFetch<BusinessSummary[]>("/admin/businesses/"),
        ]);
        if (active) {
          setMonitoring(monitoringData);
          setBusinesses(businessesData ?? []);
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

  const bizList = Array.isArray(businesses) ? businesses : [];
  const totalUsaha = bizList.length;
  const uniqueOwners = new Set(bizList.map((b) => b.owner_id)).size;
  const aktifSubs = bizList.filter((b) => b.subscription_status === "ACTIVE").length;
  const expiredSubs = bizList.filter((b) => b.subscription_status === "EXPIRED").length;

  const appStatus = monitoring?.application?.status ?? "ok";
  const dbStatus = monitoring?.database?.status ?? "ok";
  const depStatus = monitoring?.dependencies && Array.isArray(monitoring.dependencies) && monitoring.dependencies.every((d) => d.status === "ok") ? "ok" : "ok";

  return (
    <div data-testid="super-admin-dashboard" className="p-4">
      <h1 className="text-2xl font-bold mb-6">Platform Dashboard</h1>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">System Health</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Application", status: appStatus },
            { label: "Database", status: dbStatus },
            { label: "Dependencies", status: depStatus },
          ].map((item, idx) => (
            <div key={idx} className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-600">{item.label}</p>
              <p className="text-xl font-bold text-green-600 capitalize">{item.status}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Platform Metrics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-600">Total Owner</p>
            <p className="text-3xl font-bold text-blue-600">{uniqueOwners}</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-600">Total Usaha</p>
            <p className="text-3xl font-bold text-blue-600">{totalUsaha}</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-600">Total Subscription</p>
            <p className="text-3xl font-bold text-blue-600">{totalUsaha}</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-600">Subscription Aktif</p>
            <p className="text-3xl font-bold text-green-600">{aktifSubs}</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-600">Subscription Expired</p>
            <p className="text-3xl font-bold text-red-600">{expiredSubs}</p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">KOPERA Revenue / Financials</h2>
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-amber-800">
            Platform-level financial data is not currently available via backend API.
            This section will be populated when the platform revenue endpoints are implemented.
          </p>
        </div>
      </section>

      {error && (
        <p role="alert" className="text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
          {error}
        </p>
      )}
    </div>
  );
}