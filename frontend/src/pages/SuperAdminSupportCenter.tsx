import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  listSupportTickets,
  isForbidden,
  type SupportTicketListItem,
} from "../services/platformAdmin";
import { Forbidden } from "./Forbidden";

function statusBadge(status: string | null | undefined) {
  const s = status ?? "";
  const cls =
    s === "OPEN"
      ? "bg-blue-100 text-blue-800"
      : s === "IN_PROGRESS"
        ? "bg-amber-100 text-amber-800"
        : s === "RESOLVED"
          ? "bg-green-100 text-green-800"
          : s === "CLOSED"
            ? "bg-gray-100 text-gray-700"
            : "bg-gray-100 text-gray-700";
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${cls}`}>
      {s || "—"}
    </span>
  );
}

function priorityBadge(priority: string | null | undefined) {
  const p = priority ?? "";
  const cls =
    p === "URGENT"
      ? "bg-red-100 text-red-800"
      : p === "HIGH"
        ? "bg-orange-100 text-orange-800"
        : p === "MEDIUM"
          ? "bg-yellow-100 text-yellow-800"
          : p === "LOW"
            ? "bg-gray-100 text-gray-700"
            : "bg-gray-100 text-gray-700";
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${cls}`}>
      {p || "—"}
    </span>
  );
}

export function SuperAdminSupportCenter() {
  const [state, setState] = useState<"loading" | "ok" | "forbidden">("loading");
  const [tickets, setTickets] = useState<SupportTicketListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await listSupportTickets();
        if (active) {
          setTickets(data);
          setState("ok");
        }
      } catch (err) {
        if (isForbidden(err)) {
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

  if (state === "loading") return <div role="status">Loading…</div>;
  if (state === "forbidden") return <Forbidden />;

  return (
    <div data-testid="super-admin-support" className="p-4">
      <h1 className="text-2xl font-bold mb-6">Support Center</h1>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 bg-white rounded-xl border border-gray-200 shadow-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requester</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Replies</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {tickets.map((t) => (
              <tr
                key={t.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/platform-admin/support/${t.id}`)}
                data-testid="support-ticket-row"
              >
                <td className="px-4 py-3 text-sm text-gray-900">{t.subject}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {t.requester?.email ?? "—"}
                </td>
                <td className="px-4 py-3">{statusBadge(t.status)}</td>
                <td className="px-4 py-3">{priorityBadge(t.priority)}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{t.replies_count}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {t.created_at ? new Date(t.created_at).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Tidak ada ticket ditemukan.
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
