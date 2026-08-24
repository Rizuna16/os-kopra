import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { listCustomerLoyaltyRecords } from "../promotion_loyalty/promotionLoyaltyService";
import type { CustomerLoyaltyRecord } from "../promotion_loyalty/types";
import { ApiError } from "../auth/types";

export function CustomerLoyaltyRecordList() {
  const { programId } = useParams();
  const { currentBusinessId } = useBusiness();
  const [items, setItems] = useState<CustomerLoyaltyRecord[] | null>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBusinessId || !programId) {
      setItems([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    listCustomerLoyaltyRecords(currentBusinessId, programId)
      .then((data) => {
        if (cancelled) return;
        setItems(data);
      })
      .catch((e) => {
        if (cancelled) return;
        const msg = e instanceof ApiError ? e.message : "Failed to load loyalty records";
        setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId, programId]);

  if (loading) return <div data-testid="customer-loyalty-record-list-loading">Loading…</div>;
  if (error) return <div data-testid="customer-loyalty-record-list-error">{error}</div>;
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Loyalty Records</h1>
        {programId && (
          <Link
            to={`/loyalty-programs/${programId}/customers/new`}
            className="bg-blue-600 text-white rounded px-3 py-1"
          >
            New record
          </Link>
        )}
      </div>
      <div data-testid="customer-loyalty-record-list">
        {!items || items.length === 0 ? (
          <div data-testid="customer-loyalty-record-list-empty">No loyalty records.</div>
        ) : (
          <ul className="divide-y">
            {items.map((s) => (
              <li key={s.id} data-testid={`customer-loyalty-record-item-${s.id}`}>
                <Link
                  to={`/loyalty-programs/${programId}/customers/${s.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {String(s.points_balance)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}