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

  if (loading) return <div data-testid="promotion-detail-loading">Loading…</div>;
  if (error) return <div data-testid="promotion-detail-error">{error}</div>;
  if (!item) return <div data-testid="promotion-detail">No promotion.</div>;
  return (
    <div data-testid="promotion-detail" className="p-4 space-y-2">
      <h1 className="text-2xl font-bold">Promotion</h1>
      <p data-testid="promotion-detail-id">{item.id}</p>
      <p data-testid="promotion-detail-business">{item.business}</p>
      <p data-testid="promotion-detail-name">{item.name}</p>
      <p data-testid="promotion-detail-discount-type">{item.discount_type}</p>
      <p data-testid="promotion-detail-discount-value">{String(item.discount_value)}</p>
      <p data-testid="promotion-detail-valid-from">{item.valid_from}</p>
      <p data-testid="promotion-detail-valid-to">{item.valid_to}</p>
      <p data-testid="promotion-detail-status">{item.status}</p>
      <p data-testid="promotion-detail-applicability">{item.applicability}</p>
      <p data-testid="promotion-detail-target-product">{item.target_product ?? ""}</p>
      <p data-testid="promotion-detail-target-variant">{item.target_variant ?? ""}</p>
      <p data-testid="promotion-detail-created-at">{item.created_at}</p>
      <p data-testid="promotion-detail-updated-at">{item.updated_at}</p>
      <PromotionDelete />
    </div>
  );
}
