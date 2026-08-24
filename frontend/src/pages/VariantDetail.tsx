import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { getVariant } from "../product/variantService";
import type { Variant } from "../product/variantTypes";
import { ApiError } from "../auth/types";

export function VariantDetail() {
  const { productId, variantId } = useParams();
  const { currentBusinessId } = useBusiness();
  const [item, setItem] = useState<Variant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBusinessId || !productId || !variantId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getVariant(currentBusinessId, productId, variantId)
      .then((d) => {
        if (!cancelled) setItem(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Failed to load variant");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId, productId, variantId]);

  if (loading) return <div data-testid="variant-detail-loading">Loading…</div>;
  if (error) return <div data-testid="variant-detail-error">{error}</div>;
  if (!item) return <div data-testid="variant-detail">No variant.</div>;
  return (
    <div data-testid="variant-detail" className="p-4 space-y-2">
      <p data-testid="variant-detail-id">{item.id}</p>
      <p data-testid="variant-detail-name">{item.name}</p>
      <p data-testid="variant-detail-product">{item.product}</p>
      <p data-testid="variant-detail-created-at">{item.created_at}</p>
      <p data-testid="variant-detail-updated-at">{item.updated_at}</p>
    </div>
  );
}
