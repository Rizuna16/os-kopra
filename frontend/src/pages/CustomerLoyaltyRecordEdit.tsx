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

  if (loading && !item)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Edit loyalty record</h1>
            <div data-testid="customer-loyalty-record-edit-loading">Loading…</div>
          </div>
        </div>
      </div>
    );
  if (error && !item)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Edit loyalty record</h1>
            <div
              data-testid="customer-loyalty-record-edit-error"
              className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4"
            >
              {error}
            </div>
          </div>
        </div>
      </div>
    );
  if (!item)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Edit loyalty record</h1>
            <div data-testid="customer-loyalty-record-edit" className="text-gray-500 text-sm">
              Loyalty record not found.
            </div>
          </div>
        </div>
      </div>
    );
  return (
    <div className="min-h-screen bg-gray-50" data-testid="customer-loyalty-record-edit">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-4">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Edit loyalty record</h1>
          <form data-testid="customer-loyalty-record-edit-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="points_balance" className="text-sm font-medium text-gray-700 block mb-1">Points balance</label>
              <input
                id="points_balance"
                type="number"
                step="0.01"
                data-testid="customer-loyalty-record-points-input"
                ref={pointsRef}
                defaultValue={String(item.points_balance)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>
            {error && (
              <div
                data-testid="customer-loyalty-record-edit-error"
                className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4"
              >
                {error}
              </div>
            )}
            <button
              type="submit"
              data-testid="customer-loyalty-record-edit-submit"
              disabled={loading}
              className="py-3 px-4 bg-blue-600 hover:bg-blue-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "…" : "Update record"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}