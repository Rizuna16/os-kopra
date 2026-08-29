import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getPlatformPlan,
  createPlatformPlan,
  updatePlatformPlan,
  enablePlatformPlan,
  disablePlatformPlan,
  isForbidden,
  type PlatformPlan,
  type PlanInput,
} from "../services/platformAdmin";
import { Forbidden } from "./Forbidden";

const INTERVALS = ["MONTHLY", "YEARLY"];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block mb-4">
      <span className="text-sm text-gray-600">{label}</span>
      {children}
    </label>
  );
}

export function SuperAdminPlanDetail() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const isCreate = !planId || planId === "new";

  const [state, setState] = useState<"loading" | "ok" | "forbidden" | "notfound">(
    isCreate ? "ok" : "loading",
  );
  const [plan, setPlan] = useState<PlatformPlan | null>(null);
  const [form, setForm] = useState<PlanInput>({
    name: "",
    code: "",
    amount: "",
    billing_interval: "MONTHLY",
    is_active: true,
    currency: "IDR",
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isCreate) return;
    let active = true;
    (async () => {
      try {
        const data = await getPlatformPlan(planId as string);
        if (active) {
          setPlan(data);
          setForm({
            name: data.name,
            code: data.code,
            amount: data.amount,
            billing_interval: data.billing_interval,
            is_active: data.is_active,
            currency: data.currency,
          });
          setState("ok");
        }
      } catch (err) {
        if (isForbidden(err)) {
          if (active) setState("forbidden");
        } else if (active) {
          setError(err instanceof Error ? err.message : "Request failed.");
          setState("notfound");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [planId, isCreate]);

  const update = (patch: Partial<PlanInput>) =>
    setForm((f) => ({ ...f, ...patch }));

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    try {
      const payload: PlanInput = {
        ...form,
        amount: typeof form.amount === "string" ? Number(form.amount) : form.amount,
      };
      const savedPlan = isCreate
        ? await createPlatformPlan(payload)
        : await updatePlatformPlan(planId as string, payload);
      setPlan(savedPlan);
      setSaved(true);
      if (isCreate) navigate(`/platform-admin/plans/${savedPlan.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    }
  };

  const handleToggle = async () => {
    if (!plan) return;
    try {
      const updated = plan.is_active
        ? await disablePlatformPlan(plan.id)
        : await enablePlatformPlan(plan.id);
      setPlan(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    }
  };

  if (state === "loading") return <div role="status">Loading…</div>;
  if (state === "forbidden") return <Forbidden />;

  return (
    <div data-testid="super-admin-plan-detail" className="p-4 max-w-2xl">
      <button
        type="button"
        onClick={() => navigate("/platform-admin/plans")}
        className="mb-4 text-sm text-blue-600 hover:underline"
      >
        ← Kembali ke daftar
      </button>
      <h1 className="text-2xl font-bold mb-6">
        {isCreate ? "Buat Plan Baru" : "Plan Detail & Edit"}
      </h1>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <Field label="Nama">
          <input
            type="text"
            value={form.name}
            onChange={(e) => update({ name: e.target.value })}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </Field>
        <Field label="Code">
          <input
            type="text"
            value={form.code}
            onChange={(e) => update({ code: e.target.value })}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </Field>
        <Field label="Amount">
          <input
            type="number"
            value={String(form.amount)}
            onChange={(e) => update({ amount: e.target.value })}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </Field>
        <Field label="Currency">
          <input
            type="text"
            value={form.currency}
            onChange={(e) => update({ currency: e.target.value })}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </Field>
        <Field label="Billing Interval">
          <select
            value={form.billing_interval}
            onChange={(e) => update({ billing_interval: e.target.value })}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            {INTERVALS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex items-center gap-4 mt-2">
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
          >
            {isCreate ? "Buat" : "Simpan Perubahan"}
          </button>
          {!isCreate && plan && (
            <button
              type="button"
              onClick={handleToggle}
              className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-xl"
            >
              {plan.is_active ? "Disable" : "Enable"}
            </button>
          )}
        </div>
      </div>

      {saved && (
        <p className="mt-4 text-green-700 bg-green-50 border border-green-100 rounded-xl p-3">
          Tersimpan.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
          {error}
        </p>
      )}
    </div>
  );
}
