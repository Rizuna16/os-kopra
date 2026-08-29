import { useState, useEffect } from "react";
import { apiFetch } from "../lib/apiClient";
import { ApiError } from "../auth/types";
import { Forbidden } from "./Forbidden";

interface DashboardResponse {
  total_accounts: number;
  total_owners: number;
  total_businesses: number;
  total_users: number;
  active_subscriptions: number;
  revenue_summary: {
    total_paid_revenue: string;
    total_paid_payments: number;
    total_pending: number;
    total_failed: number;
    total_expired: number;
    total_canceled: number;
  };
  system_status: {
    status: string;
    application: { status: string };
    database: { status: string };
    dependencies: Array<{ name: string; status: string }>;
  };
}

function formatCurrency(value: string): string {
  try {
    const num = Number(value);
    if (Number.isNaN(num)) return value;
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return value;
  }
}

export function SuperAdminDashboard() {
  const [state, setState] = useState<"loading" | "ok" | "forbidden">("loading");
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const dashboardData = await apiFetch<DashboardResponse>("/admin/dashboard/");
        if (active) {
          setData(dashboardData);
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

  const sys = data?.system_status;
  const appStatus = sys?.application?.status ?? "ok";
  const dbStatus = sys?.database?.status ?? "ok";
  const depStatus =
    sys?.dependencies && Array.isArray(sys.dependencies) && sys.dependencies.length > 0
      ? sys.dependencies.every((d) => d.status === "ok")
        ? "ok"
        : "error"
      : "ok";

  const revenue = data?.revenue_summary;

  return (
    <div data-testid="super-admin-dashboard" className="p-4">
      <h1 className="text-2xl font-bold mb-6">Platform Dashboard</h1>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">System Health</h2>
        <div className="mb-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600">Overall System Status</p>
          <p
            data-testid="metric-system-status"
            className="text-2xl font-bold text-green-600 capitalize"
          >
            {depStatus === "ok" && dbStatus === "ok" && appStatus === "ok" ? "operational" : "degraded"}
          </p>
        </div>
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
            <p className="text-sm text-gray-600">Total Account</p>
            <p data-testid="metric-total-accounts" className="text-3xl font-bold text-blue-600">
              {data?.total_accounts ?? 0}
            </p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-600">Total Owner</p>
            <p data-testid="metric-total-owners" className="text-3xl font-bold text-blue-600">
              {data?.total_owners ?? 0}
            </p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-600">Total Usaha</p>
            <p data-testid="metric-total-businesses" className="text-3xl font-bold text-blue-600">
              {data?.total_businesses ?? 0}
            </p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-600">Total User</p>
            <p data-testid="metric-total-users" className="text-3xl font-bold text-blue-600">
              {data?.total_users ?? 0}
            </p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-600">Active Subscription</p>
            <p
              data-testid="metric-active-subscriptions"
              className="text-3xl font-bold text-green-600"
            >
              {data?.active_subscriptions ?? 0}
            </p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">KOPERA Revenue / Financials</h2>
        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600">Total Paid Revenue</p>
          <p data-testid="metric-revenue-summary" className="text-3xl font-bold text-emerald-600">
            {revenue ? formatCurrency(revenue.total_paid_revenue) : "Rp0"}
          </p>
          <div className="mt-3 text-sm text-gray-500 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <span>Paid: {revenue?.total_paid_payments ?? 0}</span>
            <span>Pending: {revenue?.total_pending ?? 0}</span>
            <span>Failed: {revenue?.total_failed ?? 0}</span>
            <span>Expired: {revenue?.total_expired ?? 0}</span>
          </div>
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
