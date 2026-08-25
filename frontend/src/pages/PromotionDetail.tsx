import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { getPromotion } from "../promotion_loyalty/promotionLoyaltyService";
import type { Promotion } from "../promotion_loyalty/types";
import { ApiError } from "../auth/types";
import { PromotionDelete } from "./PromotionDelete";

export function PromotionDetail() {
  const { promotionId } = useParams();
  const { currentBusinessId } = useBusiness();
  const [item, setItem] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBusinessId || !promotionId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPromotion(currentBusinessId, promotionId)
      .then((d) => {
        if (!cancelled) setItem(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Failed to load promotion");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId, promotionId]);

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Promotion</h1>
            <div data-testid="promotion-detail-loading">Loading…</div>
          </div>
        </div>
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Promotion</h1>
            <div
              data-testid="promotion-detail-error"
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
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Promotion</h1>
            <div data-testid="promotion-detail" className="text-gray-500 text-sm">
              No promotion.
            </div>
          </div>
        </div>
      </div>
    );
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div data-testid="promotion-detail" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-4">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Promotion</h1>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</span>
              <span data-testid="promotion-detail-id" className="text-sm text-gray-900">{item.id}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Business ID</span>
              <span data-testid="promotion-detail-business" className="text-sm text-gray-900">{item.business}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</span>
              <span data-testid="promotion-detail-name" className="text-sm text-gray-900">{item.name}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Discount Type</span>
              <span data-testid="promotion-detail-discount-type" className="text-sm text-gray-900">{item.discount_type}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Discount Value</span>
              <span data-testid="promotion-detail-discount-value" className="text-sm text-gray-900">{String(item.discount_value)}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Valid From</span>
              <span data-testid="promotion-detail-valid-from" className="text-sm text-gray-900">{item.valid_from}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Valid To</span>
              <span data-testid="promotion-detail-valid-to" className="text-sm text-gray-900">{item.valid_to}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</span>
              <span data-testid="promotion-detail-status" className="text-sm text-gray-900">{item.status}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Applicability</span>
              <span data-testid="promotion-detail-applicability" className="text-sm text-gray-900">{item.applicability}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Target Product (UUID)</span>
              <span data-testid="promotion-detail-target-product" className="text-sm text-gray-900">{item.target_product ?? ""}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Target Variant (UUID)</span>
              <span data-testid="promotion-detail-target-variant" className="text-sm text-gray-900">{item.target_variant ?? ""}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Created At</span>
              <span data-testid="promotion-detail-created-at" className="text-sm text-gray-900">{item.created_at}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Updated At</span>
              <span data-testid="promotion-detail-updated-at" className="text-sm text-gray-900">{item.updated_at}</span>
            </div>
          </div>
          <PromotionDelete />
        </div>
      </div>
    </div>
  );
}
