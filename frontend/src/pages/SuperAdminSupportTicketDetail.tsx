import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  getSupportTicket,
  updateSupportTicket,
  replyToSupportTicket,
  isForbidden,
  type SupportTicketDetail,
  type SupportTicketRequester,
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

const STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export function SuperAdminSupportTicketDetail() {
  const { ticketId = "" } = useParams();
  const [state, setState] = useState<"loading" | "ok" | "forbidden" | "missing">("loading");
  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null);
  const [status, setStatus] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getSupportTicket(ticketId);
        if (active) {
          setTicket(data);
          setStatus(data.status);
          setPriority(data.priority);
          setState("ok");
        }
      } catch (err) {
        if (isForbidden(err)) {
          if (active) setState("forbidden");
        } else if (active) {
          setError(err instanceof Error ? err.message : "Request failed.");
          setState("missing");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [ticketId]);

  async function handleMutation() {
    if (!ticket) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateSupportTicket(ticket.id, { status, priority });
      setTicket(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReply() {
    if (!ticket || !message.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await replyToSupportTicket(ticket.id, message.trim());
      const updated = await getSupportTicket(ticket.id);
      setTicket(updated);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reply failed.");
    } finally {
      setSaving(false);
    }
  }

  if (state === "loading") return <div role="status">Loading…</div>;
  if (state === "forbidden") return <Forbidden />;
  if (state === "missing" || !ticket) {
    return (
      <div data-testid="support-ticket-not-found" className="p-4">
        <h1 className="text-2xl font-bold mb-4">Ticket Not Found</h1>
        {error && (
          <p role="alert" className="text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
            {error}
          </p>
        )}
      </div>
    );
  }

  const requester: SupportTicketRequester | undefined = ticket.requester;

  return (
    <div data-testid="super-admin-support-detail" className="p-4">
      <h1 className="text-2xl font-bold mb-4">{ticket.subject}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Requester</h2>
          <p className="text-sm text-gray-900">
            {requester?.email ?? "—"}
          </p>
          <p className="text-sm text-gray-500">
            {[requester?.first_name, requester?.last_name].filter(Boolean).join(" ") || "—"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Description</h2>
          <p className="text-sm text-gray-900 whitespace-pre-wrap">{ticket.description}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Status &amp; Priority</h2>
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="block text-xs text-gray-500">Status</label>
            <div className="mt-1">{statusBadge(status)}</div>
          </div>
          <div>
            <label className="block text-xs text-gray-500">Priority</label>
            <div className="mt-1">{priorityBadge(priority)}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1" htmlFor="status-select">Update Status</label>
            <select
              id="status-select"
              className="w-full border border-gray-300 rounded-lg p-2"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1" htmlFor="priority-select">Update Priority</label>
            <select
              id="priority-select"
              className="w-full border border-gray-300 rounded-lg p-2"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50"
          onClick={() => void handleMutation()}
          disabled={saving}
          data-testid="support-mutation-button"
        >
          Save Changes
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Replies</h2>
        <ul className="space-y-2">
          {ticket.replies.map((r) => (
            <li key={r.id} className="text-sm text-gray-900 border-b border-gray-100 pb-2">
              <span className="font-medium">{r.author?.email ?? "—"}</span>
              <span className="text-gray-400 ml-2">
                {r.created_at ? new Date(r.created_at).toLocaleString() : ""}
              </span>
              <p className="mt-1 whitespace-pre-wrap">{r.message}</p>
            </li>
          ))}
          {ticket.replies.length === 0 && (
            <li className="text-sm text-gray-500">Belum ada balasan.</li>
          )}
        </ul>

        <textarea
          className="mt-3 w-full border border-gray-300 rounded-lg p-2"
          rows={3}
          placeholder="Tulis balasan…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          data-testid="support-reply-input"
        />
        <button
          type="button"
          className="mt-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-xl disabled:opacity-50"
          onClick={() => void handleReply()}
          disabled={saving || !message.trim()}
          data-testid="support-reply-button"
        >
          Send Reply
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
          {error}
        </p>
      )}
    </div>
  );
}
