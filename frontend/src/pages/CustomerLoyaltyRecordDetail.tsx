import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { getCustomerLoyaltyRecord } from "../promotion_loyalty/promotionLoyaltyService";
import type { CustomerLoyaltyRecord } from "../promotion_loyalty/types";
import { ApiError } from "../auth/types";
import { CustomerLoyaltyRecordDelete } from "./CustomerLoyaltyRecordDelete";

export function CustomerLoyaltyRecordDetail() {
  const { programId, recordId } = useParams();
  const { currentBusinessId } = useBusiness();
  const [item, setItem] = useState<CustomerLoyaltyRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBusinessId || !programId || !recordId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getCustomerLoyaltyRecord(currentBusinessId, programId, recordId)
      .then((d) => {
        if (!cancelled) setItem(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Failed to load loyalty record");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId, programId, recordId]);

  if (loading) return <div data-testid="customer-loyalty-record-detail-loading">Loading…</div>;
  if (error) return <div data-testid="customer-loyalty-record-detail-error">{error}</div>;
  if (!item) return <div data-testid="customer-loyalty-record-detail">No loyalty record.</div>;
  return (
    <div data-testid="customer-loyalty-record-detail" className="p-4 space-y-2">
      <h1 className="text-2xl font-bold">Loyalty Record</h1>
      <p data-testid="customer-loyalty-record-detail-id">{item.id}</p>
      <p data-testid="customer-loyalty-record-detail-business">{item.business}</p>
      <p data-testid="customer-loyalty-record-detail-program">{item.program}</p>
      <p data-testid="customer-loyalty-record-detail-customer">{item.customer}</p>
      <p data-testid="customer-loyalty-record-detail-points">{String(item.points_balance)}</p>
      <p data-testid="customer-loyalty-record-detail-created-at">{item.created_at}</p>
      <p data-testid="customer-loyalty-record-detail-updated-at">{item.updated_at}</p>
      <CustomerLoyaltyRecordDelete />
    </div>
  );
}