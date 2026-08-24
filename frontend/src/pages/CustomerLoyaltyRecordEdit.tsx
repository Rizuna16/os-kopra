import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { getCustomerLoyaltyRecord, updateCustomerLoyaltyRecord } from "../promotion_loyalty/promotionLoyaltyService";
import type { CustomerLoyaltyRecord, CustomerLoyaltyRecordUpdatePayload } from "../promotion_loyalty/types";
import { ApiError } from "../auth/types";

export function CustomerLoyaltyRecordEdit() {
  const { programId, recordId } = useParams();
  const { currentBusinessId } = useBusiness();
  const navigate = useNavigate();
  const [item, setItem] = useState<CustomerLoyaltyRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pointsRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusinessId || !programId || !recordId) return;
    setError(null);
    setLoading(true);
    const payload: CustomerLoyaltyRecordUpdatePayload = {
      points_balance: pointsRef.current?.value ?? "",
    };
    try {
      await updateCustomerLoyaltyRecord(currentBusinessId, programId, recordId, payload);
      navigate(`/loyalty-programs/${programId}/customers/${recordId}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 400 && e.errors) {
        const first =
          e.errors.points_balance?.[0] ?? e.errors.non_field_errors?.[0] ?? e.message;
        setError(first ?? e.message);
      } else {
        setError(e instanceof Error ? e.message : "Failed to update loyalty record");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div data-testid="customer-loyalty-record-edit-loading">Loading…</div>;
  if (error) return <div data-testid="customer-loyalty-record-edit-error">{error}</div>;
  if (!item) return <div data-testid="customer-loyalty-record-edit">Loyalty record not found.</div>;
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Edit loyalty record</h1>
      <form data-testid="customer-loyalty-record-edit-form" onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="points_balance" className="block">Points balance</label>
          <input
            id="points_balance"
            type="number"
            step="0.01"
            data-testid="customer-loyalty-record-points-input"
            ref={pointsRef}
            defaultValue={String(item.points_balance)}
            className="border rounded px-2 py-1 w-full"
          />
        </div>
        {error && <div data-testid="customer-loyalty-record-edit-error" className="text-red-600">{error}</div>}
        <button
          type="submit"
          data-testid="customer-loyalty-record-edit-submit"
          disabled={loading}
          className="bg-blue-600 text-white rounded px-3 py-1"
        >
          {loading ? "…" : "Update record"}
        </button>
      </form>
    </div>
  );
}