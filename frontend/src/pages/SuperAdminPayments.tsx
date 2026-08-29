import { useState, useEffect } from "react";
import {
  listPlatformPayments,
  isForbidden,
  type PlatformPayment,
} from "../services/platformAdmin";
import { Forbidden } from "./Forbidden";

function statusBadge(status: string | null | undefined) {
  const s = status ?? "";
  const cls =
    s === "PAID"
      ? "bg-green-100 text-green-800"
      : s === "PENDING"
        ? "bg-amber-100 text-amber-800"
        : s === "FAILED"
          ? "bg-red-100 text-red-800"
          : s === "EXPIRED"
            ? "bg-gray-100 text-gray-700"
            : s === "CANCELED"
              ? "bg-red-100 text-red-800"
              : "bg-gray-100 text-gray-700";
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${cls}`}>
      {s || "—"}
    </span>
  );
}

export function SuperAdminPayments() {
  const [state, setState] = useState<"loading" | "ok" | "forbidden">("loading");
  const [payments, setPayments] = useState<PlatformPayment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await listPlatformPayments();
        if (active) {
          setPayments(data);
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
    <div data-testid="super-admin-payments" className="p-4">
      <h1 className="text-2xl font-bold mb-6">Payment &amp; Billing Governance</h1>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 bg-white rounded-xl border border-gray-200 shadow-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">
                  {p.business_name ?? p.business_id ?? "—"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {p.owner_email ?? p.owner_id ?? "—"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {p.plan?.name ?? "—"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {p.currency} {p.amount}
                </td>
                <td className="px-4 py-3">{statusBadge(p.status)}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {p.provider}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {p.paid_at ? new Date(p.paid_at).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Tidak ada payment ditemukan.
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
