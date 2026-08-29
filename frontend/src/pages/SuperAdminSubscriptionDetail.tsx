import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getPlatformSubscription,
  isForbidden,
  type PlatformSubscription,
} from "../services/platformAdmin";
import { Forbidden } from "./Forbidden";

function statusBadge(status: string | null | undefined) {
  const s = status ?? "";
  const cls =
    s === "ACTIVE"
      ? "bg-green-100 text-green-800"
      : s === "SUSPENDED"
        ? "bg-red-100 text-red-800"
        : s === "CANCELED"
          ? "bg-red-100 text-red-800"
          : "bg-amber-100 text-amber-800";
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${cls}`}>
      {s || "—"}
    </span>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-gray-100 py-2">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-900 font-medium">{value}</span>
    </div>
  );
}

export function SuperAdminSubscriptionDetail() {
  const { subscriptionId } = useParams<{ subscriptionId: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "ok" | "forbidden" | "notfound">("loading");
  const [sub, setSub] = useState<PlatformSubscription | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!subscriptionId) {
      setState("notfound");
      return;
    }
    (async () => {
      try {
        const data = await getPlatformSubscription(subscriptionId);
        if (active) {
          setSub(data);
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
  }, [subscriptionId]);

  if (state === "loading") return <div role="status">Loading…</div>;
  if (state === "forbidden") return <Forbidden />;
  if (state === "notfound" || !sub) {
    return (
      <div className="p-4" data-testid="super-admin-subscription-detail">
        <p role="alert" className="text-red-600">
          {error ?? "Subscription tidak ditemukan."}
        </p>
        <button
          type="button"
          onClick={() => navigate("/platform-admin/subscriptions")}
          className="mt-4 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
        >
          Kembali
        </button>
      </div>
    );
  }

  return (
    <div data-testid="super-admin-subscription-detail" className="p-4 max-w-2xl">
      <button
        type="button"
        onClick={() => navigate("/platform-admin/subscriptions")}
        className="mb-4 text-sm text-blue-600 hover:underline"
      >
        ← Kembali ke daftar
      </button>
      <h1 className="text-2xl font-bold mb-6">Subscription Detail</h1>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <Row label="ID" value={sub.id} />
        <Row label="Business" value={sub.business_name ?? sub.business_id} />
        <Row label="Business ID" value={sub.business_id} />
        <Row label="Owner" value={sub.owner_email ?? sub.owner_id ?? "—"} />
        <Row label="Owner ID" value={sub.owner_id ?? "—"} />
        <Row label="Status" value={statusBadge(sub.status)} />
        <Row
          label="Created"
          value={sub.created_at ? new Date(sub.created_at).toLocaleString() : "—"}
        />
        <Row
          label="Updated"
          value={sub.updated_at ? new Date(sub.updated_at).toLocaleString() : "—"}
        />
      </div>

      {error && (
        <p role="alert" className="mt-4 text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
          {error}
        </p>
      )}
    </div>
  );
}
