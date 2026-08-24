import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { listVariants } from "../product/variantService";
import type { Variant } from "../product/variantTypes";
import { ApiError } from "../auth/types";

export function VariantList() {
  const { productId } = useParams();
  const { currentBusinessId } = useBusiness();
  const [items, setItems] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBusinessId || !productId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    listVariants(currentBusinessId, productId)
      .then((d) => {
        if (!cancelled) setItems(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Failed to load variants");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId, productId]);

  if (loading) return <div data-testid="variant-list-loading">Loading…</div>;
  if (error) return <div data-testid="variant-list-error">{error}</div>;
  return (
    <div data-testid="variant-list" className="p-4">
      {items.length === 0 ? (
        <div data-testid="variant-list-empty" className="text-gray-500">
          No variants.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((v) => (
            <li key={v.id} data-testid={`variant-item-${v.id}`} className="border rounded p-2">
              {v.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
