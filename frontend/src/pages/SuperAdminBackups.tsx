import { useState, useEffect } from "react";
import { apiFetch } from "../lib/apiClient";
import { ApiError } from "../auth/types";
import { Forbidden } from "./Forbidden";

interface BackupEntry {
  id: string;
  triggered_by: string;
  created_at: string;
  status: string;
  integrity: string | null;
  verified: boolean;
  restored_at: string | null;
  notes: string | null;
}

export function SuperAdminBackups() {
  const [state, setState] = useState<"loading" | "ok" | "forbidden">("loading");
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadBackups = async () => {
    try {
      const data = await apiFetch<BackupEntry[]>("/admin/backups/");
      setBackups(Array.isArray(data) ? data : []);
      setState("ok");
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setState("forbidden");
      } else {
        setError(err instanceof Error ? err.message : "Request failed.");
        setState("ok");
      }
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleTriggerBackup = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await apiFetch<BackupEntry>("/admin/backups/trigger/", { method: "POST" });
      await loadBackups();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trigger backup failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    const confirmed = window.confirm("Are you sure you want to restore this backup? This will overwrite the current system state.");
    if (!confirmed) return;

    setActionLoading(true);
    setError(null);
    try {
      await apiFetch<BackupEntry>(`/admin/backups/${backupId}/restore/`, { method: "POST" });
      await loadBackups();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore backup failed.");
    } finally {
      setActionLoading(false);
    }
  };

  if (state === "loading") {
    return <div role="status">Loading…</div>;
  }

  if (state === "forbidden") {
    return <Forbidden />;
  }

  return (
    <div data-testid="super-admin-backups" className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Backup & Restore</h1>
        <button
          type="button"
          disabled={actionLoading}
          onClick={handleTriggerBackup}
          data-testid="trigger-backup-btn"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-sm transition-colors"
        >
          {actionLoading ? "Processing…" : "Trigger New Backup"}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 bg-white rounded-xl border border-gray-200 shadow-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Triggered By</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Restored At</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-sm">
            {backups.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {new Date(b.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-gray-900">{b.triggered_by}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    b.status === "COMPLETED" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}>
                    {b.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-900">{b.verified ? "Yes" : "No"}</td>
                <td className="px-4 py-3 text-gray-500">
                  {b.restored_at ? new Date(b.restored_at).toLocaleString() : "Never"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleRestoreBackup(b.id)}
                    data-testid={`restore-backup-btn-${b.id}`}
                    className="text-red-600 hover:underline font-medium disabled:opacity-50"
                  >
                    Restore
                  </button>
                </td>
              </tr>
            ))}
            {backups.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No backup records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}