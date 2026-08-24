import { useEffect, useState } from "react";
import { useBusiness } from "../business/BusinessContext";
import { listProducts } from "../product/productService";
import type { Product } from "../product/types";
import { ApiError } from "../auth/types";

export function ProductList() {
  const { currentBusinessId } = useBusiness();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBusinessId) {
      setItems([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    listProducts(currentBusinessId)
      .then((data) => {
        if (cancelled) return;
        setItems(data);
      })
      .catch((e) => {
        if (cancelled) return;
        const msg = e instanceof ApiError ? e.message : "Failed to load products";
        setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId]);

  if (loading) return <div data-testid="product-list-loading">Loading…</div>;
  if (error) return <div data-testid="product-list-error">{error}</div>;
  return (
    <div data-testid="product-list">
      {items.length === 0 ? (
        <div data-testid="product-list-empty">No products.</div>
      ) : (
        <ul>
          {items.map((p) => (
            <li key={p.id} data-testid={`product-item-${p.id}`}>
              {p.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}