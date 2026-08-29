import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  listPlatformPlans,
  enablePlatformPlan,
  disablePlatformPlan,
  isForbidden,
  type PlatformPlan,
} from "../services/platformAdmin";
import { Forbidden } from "./Forbidden";

function PlanRow({ plan, onToggle }: { plan: PlatformPlan; onToggle: (p: PlatformPlan) => void }) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-sm text-gray-900">{plan.name}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{plan.code}</td>
      <td className="px-4 py-3 text-sm text-gray-900">
        {plan.currency} {plan.amount} / {plan.billing_interval}
      </td>
      <td className="px-4 py-3">
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            plan.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
          }`}
        >
          {plan.is_active ? "ACTIVE" : "DISABLED"}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <NavLink
            to={`/platform-admin/plans/${plan.id}`}
            className="text-sm text-blue-600 hover:underline font-medium"
          >
            Detail
          </NavLink>
          <button
            type="button"
            onClick={() => onToggle(plan)}
            className="text-sm text-blue-600 hover:underline font-medium"
          >
            {plan.is_active ? "Disable" : "Enable"}
          </button>
        </div>
      </td>
    </tr>
  );
}

export function SuperAdminPlans() {
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "ok" | "forbidden">("loading");
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await listPlatformPlans();
      setPlans(data);
      setState("ok");
    } catch (err) {
      if (isForbidden(err)) {
        setState("forbidden");
      } else {
        setError(err instanceof Error ? err.message : "Request failed.");
        setState("ok");
      }
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await listPlatformPlans();
        if (active) {
          setPlans(data);
          setState("ok");
        }
      } catch (err) {
        if (active && isForbidden(err)) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = async (plan: PlatformPlan) => {
    try {
      const updated = plan.is_active
        ? await disablePlatformPlan(plan.id)
        : await enablePlatformPlan(plan.id);
      setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    }
  };

  if (state === "loading") return <div role="status">Loading…</div>;
  if (state === "forbidden") return <Forbidden />;

  return (
    <div data-testid="super-admin-plans" className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Plan Governance</h1>
        <button
          type="button"
          onClick={() => navigate("/platform-admin/plans/new")}
          className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
        >
          Buat Plan
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 bg-white rounded-xl border border-gray-200 shadow-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harga</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {plans.map((p) => (
              <PlanRow key={p.id} plan={p} onToggle={handleToggle} />
            ))}
            {plans.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Tidak ada plan ditemukan.
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
