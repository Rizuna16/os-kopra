import { useState, useEffect } from "react";
import { apiFetch } from "../lib/apiClient";
import { ApiError } from "../auth/types";
import { Forbidden } from "./Forbidden";

interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  timestamp: string;
  business: string | null;
  location: string | null;
  target: string | null;
  resource: string | null;
  event_type: string | null;
  outcome: string | null;
}

export function SuperAdminAuditLogs() {
  const [state, setState] = useState<"loading" | "ok" | "forbidden">("loading");
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiFetch<AuditLogEntry[]>("/admin/audit-logs/");
        if (active) {
          setLogs(Array.isArray(data) ? data : []);
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

  const handleSelectLog = async (logId: string) => {
    try {
      const data = await apiFetch<AuditLogEntry>(`/admin/audit-logs/${logId}/`);
      setSelectedLog(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load details.");
    }
  };

  if (state === "loading") {
    return <div role="status">Loading…</div>;
  }

  if (state === "forbidden") {
    return <Forbidden />;
  }

  return (
    <div data-testid="super-admin-audit-logs" className="p-4">
      <h1 className="text-2xl font-bold mb-6">Audit Logs</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 bg-white rounded-xl border border-gray-200 shadow-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outcome</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-900 truncate max-w-[150px]">{log.actor}</td>
                  <td className="px-4 py-3 text-gray-900 font-semibold">{log.action}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      log.outcome === "success" ? "bg-green-100 text-green-800" :
                      log.outcome === "failure" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"
                    }`}>
                      {log.outcome ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <button
                      type="button"
                      onClick={() => handleSelectLog(log.id)}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No audit logs recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Log Details</h2>
          {selectedLog ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3 text-sm">
              <div>
                <span className="font-semibold text-gray-400 block uppercase text-xs">Log ID</span>
                <span className="font-mono">{selectedLog.id}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-400 block uppercase text-xs">Timestamp</span>
                <span>{new Date(selectedLog.timestamp).toLocaleString()}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-400 block uppercase text-xs">Actor</span>
                <span>{selectedLog.actor}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-400 block uppercase text-xs">Action</span>
                <span>{selectedLog.action}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-400 block uppercase text-xs">Resource / Event Type</span>
                <span>{selectedLog.resource ?? selectedLog.event_type ?? "—"}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-400 block uppercase text-xs">Target</span>
                <span>{selectedLog.target ?? "—"}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-400 block uppercase text-xs">Outcome</span>
                <span>{selectedLog.outcome ?? "—"}</span>
              </div>
              {selectedLog.business && (
                <div>
                  <span className="font-semibold text-gray-400 block uppercase text-xs">Business Context</span>
                  <span className="font-mono text-xs">{selectedLog.business}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-center text-gray-500 text-sm">
              Select a log to view inspection details.
            </div>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}