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

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Loyalty Record</h1>
            <div data-testid="customer-loyalty-record-detail-loading">Loading…</div>
          </div>
        </div>
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Loyalty Record</h1>
            <div
              data-testid="customer-loyalty-record-detail-error"
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
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Loyalty Record</h1>
            <div data-testid="customer-loyalty-record-detail" className="text-gray-500 text-sm">
              No loyalty record.
            </div>
          </div>
        </div>
      </div>
    );
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div data-testid="customer-loyalty-record-detail" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-4">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Loyalty Record</h1>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</span>
              <span data-testid="customer-loyalty-record-detail-id" className="text-sm text-gray-900">{item.id}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Business ID</span>
              <span data-testid="customer-loyalty-record-detail-business" className="text-sm text-gray-900">{item.business}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Program</span>
              <span data-testid="customer-loyalty-record-detail-program" className="text-sm text-gray-900">{item.program}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</span>
              <span data-testid="customer-loyalty-record-detail-customer" className="text-sm text-gray-900">{item.customer}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Points Balance</span>
              <span data-testid="customer-loyalty-record-detail-points" className="text-sm text-gray-900">{String(item.points_balance)}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Created At</span>
              <span data-testid="customer-loyalty-record-detail-created-at" className="text-sm text-gray-900">{item.created_at}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Updated At</span>
              <span data-testid="customer-loyalty-record-detail-updated-at" className="text-sm text-gray-900">{item.updated_at}</span>
            </div>
          </div>
          <CustomerLoyaltyRecordDelete />
        </div>
      </div>
    </div>
  );
}