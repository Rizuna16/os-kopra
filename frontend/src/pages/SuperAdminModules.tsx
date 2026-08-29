import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  listPlatformModules,
  createPlatformModule,
  enablePlatformModule,
  disablePlatformModule,
  isForbidden,
  type PlatformModule,
} from "../services/platformAdmin";
import { Forbidden } from "./Forbidden";

function ModuleRow({ module, onToggle }: { module: PlatformModule; onToggle: (m: PlatformModule) => void }) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-sm text-gray-900">{module.name}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{module.code}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{module.description || "-"}</td>
      <td className="px-4 py-3">
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            module.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
          }`}
        >
          {module.is_active ? "ACTIVE" : "DISABLED"}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggle(module)}
            className="text-sm text-blue-600 hover:underline font-medium"
          >
            {module.is_active ? "Disable" : "Enable"}
          </button>
        </div>
      </td>
    </tr>
  );
}

export function SuperAdminModules() {
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "ok" | "forbidden">("loading");
  const [modules, setModules] = useState<PlatformModule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      const data = await listPlatformModules();
      setModules(data);
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
        const data = await listPlatformModules();
        if (active) {
          setModules(data);
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

  const handleToggle = async (mod: PlatformModule) => {
    try {
      const updated = mod.is_active
        ? await disablePlatformModule(mod.id)
        : await enablePlatformModule(mod.id);
      setModules((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
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
    const description = String(form.get("description") || "").trim();
    if (!code || !name) {
      setError("Code and name are required.");
      return;
    }
    try {
      const created = await createPlatformModule({ code, name, description });
      setModules((prev) => [created, ...prev]);
      setCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    }
  };

  if (state === "loading") return <div role="status">Loading…</div>;
  if (state === "forbidden") return <Forbidden />;

  return (
    <div data-testid="super-admin-modules" className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Module Management</h1>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
        >
          {creating ? "Batal" : "Buat Module"}
        </button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="mb-4 bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              name="code"
              placeholder="Code (e.g. INVENTORY)"
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
            {modules.map((m) => (
              <ModuleRow key={m.id} module={m} onToggle={handleToggle} />
            ))}
            {modules.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Tidak ada module ditemukan.
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
