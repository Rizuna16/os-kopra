import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  listPlatformFeatures,
  createPlatformFeature,
  enablePlatformFeature,
  disablePlatformFeature,
  listPlatformModules,
  isForbidden,
  type PlatformFeature,
  type PlatformModule,
} from "../services/platformAdmin";
import { Forbidden } from "./Forbidden";

function FeatureRow({ feature, onToggle }: { feature: PlatformFeature; onToggle: (f: PlatformFeature) => void }) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-sm text-gray-900">{feature.name}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{feature.code}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{feature.description || "-"}</td>
      <td className="px-4 py-3">
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            feature.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
          }`}
        >
          {feature.is_active ? "ACTIVE" : "DISABLED"}
        </span>
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={() => onToggle(feature)}
          className="text-sm text-blue-600 hover:underline font-medium"
        >
          {feature.is_active ? "Disable" : "Enable"}
        </button>
      </td>
    </tr>
  );
}

export function SuperAdminFeatures() {
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "ok" | "forbidden">("loading");
  const [features, setFeatures] = useState<PlatformFeature[]>([]);
  const [modules, setModules] = useState<PlatformModule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      const [fData, mData] = await Promise.all([listPlatformFeatures(), listPlatformModules()]);
      setFeatures(fData);
      setModules(mData);
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
        const [fData, mData] = await Promise.all([listPlatformFeatures(), listPlatformModules()]);
        if (active) {
          setFeatures(fData);
          setModules(mData);
          setState("ok");
        }
      } catch (err) {
        if (active && isForbidden(err)) {
          setState("forbidden");
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

  const handleToggle = async (feature: PlatformFeature) => {
    try {
      const updated = feature.is_active
        ? await disablePlatformFeature(feature.id)
        : await enablePlatformFeature(feature.id);
      setFeatures((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const code = String(form.get("code") || "").trim();
    const name = String(form.get("name") || "").trim();
    const moduleId = String(form.get("module") || "").trim();
    const description = String(form.get("description") || "").trim();
    if (!code || !name || !moduleId) {
      setError("Module, code and name are required.");
      return;
    }
    try {
      const created = await createPlatformFeature({ code, name, module: moduleId, description });
      setFeatures((prev) => [created, ...prev]);
      setCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    }
  };

  if (state === "loading") return <div role="status">Loading…</div>;
  if (state === "forbidden") return <Forbidden />;

  return (
    <div data-testid="super-admin-features" className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Feature Management</h1>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
        >
          {creating ? "Batal" : "Buat Feature"}
        </button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="mb-4 bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <select name="module" className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm">
            <option value="">Pilih Module…</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.code})
              </option>
            ))}
          </select>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              name="code"
              placeholder="Code (e.g. INVENTORY_STOCK)"
              className="border border-gray-300 rounded-xl px-3 py-2 text-sm"
            />
            <input
              name="name"
              placeholder="Name"
              className="border border-gray-300 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <textarea
            name="description"
            placeholder="Description"
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-xl"
          >
            Simpan
          </button>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 bg-white rounded-xl border border-gray-200 shadow-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {features.map((f) => (
              <FeatureRow key={f.id} feature={f} onToggle={handleToggle} />
            ))}
            {features.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Tidak ada feature ditemukan.
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
