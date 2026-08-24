import { useEffect, useState } from "react";
import { useBusiness } from "../business/BusinessContext";
import { listSales } from "../sales/saleService";
import type { Sale } from "../sales/types";
import { ApiError } from "../auth/types";

export function SaleList() {
  const { currentBusinessId } = useBusiness();
  const [items, setItems] = useState<Sale[]>([]);
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
    listSales(currentBusinessId)
      .then((data) => {
        if (cancelled) return;
        setItems(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : "Failed to load sales");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId]);

  if (loading) return <div data-testid="sale-list-loading">Loading…</div>;
  if (error) return <div data-testid="sale-list-error">{error}</div>;
  return (
    <div data-testid="sale-list" className="p-4">
      {items.length === 0 ? (
        <div data-testid="sale-list-empty">No sales.</div>
      ) : (
        <ul className="divide-y">
          {items.map((po) => (
            <li key={po.id} data-testid={`sale-item-${po.id}`}>
              <span data-testid={`sale-item-id-${po.id}`}>{po.id}</span>
              <span data-testid={`sale-item-status-${po.id}`}>{po.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
