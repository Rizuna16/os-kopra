import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { getProduct } from "../product/productService";
import type { Product } from "../product/types";
import { ApiError } from "../auth/types";

export function ProductDetail() {
  const { productId } = useParams();
  const { currentBusinessId } = useBusiness();
  const [item, setItem] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBusinessId || !productId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getProduct(currentBusinessId, productId)
      .then((d) => {
        if (!cancelled) setItem(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Failed to load product");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId, productId]);

  if (loading) return <div data-testid="product-detail-loading">Loading…</div>;
  if (error) return <div data-testid="product-detail-error">{error}</div>;
  if (!item) return <div data-testid="product-detail">No product.</div>;
  return (
    <div data-testid="product-detail">
      <p data-testid="product-detail-id">{item.id}</p>
      <p data-testid="product-detail-name">{item.name}</p>
      <p data-testid="product-detail-price">{String(item.price)}</p>
      <p data-testid="product-detail-business">{item.business}</p>
      <p data-testid="product-detail-created-at">{item.created_at}</p>
      <p data-testid="product-detail-updated-at">{item.updated_at}</p>
    </div>
  );
}