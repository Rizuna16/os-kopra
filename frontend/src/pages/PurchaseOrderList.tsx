import { useEffect, useState } from "react";
import { useBusiness } from "../business/BusinessContext";
import { listPurchaseOrders } from "../purchasing/purchasingService";
import type { PurchaseOrder } from "../purchasing/types";
import { ApiError } from "../auth/types";

export function PurchaseOrderList() {
  const { currentBusinessId } = useBusiness();
  const [items, setItems] = useState<PurchaseOrder[]>([]);
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
    listPurchaseOrders(currentBusinessId)
      .then((data) => {
        if (cancelled) return;
        setItems(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : "Failed to load purchase orders");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId]);

  if (loading) return <div data-testid="purchase-order-list-loading">Loading…</div>;
  if (error) return <div data-testid="purchase-order-list-error">{error}</div>;
  return (
    <div data-testid="purchase-order-list" className="p-4">
      {items.length === 0 ? (
        <div data-testid="purchase-order-list-empty">No purchase orders.</div>
      ) : (
        <ul className="divide-y">
          {items.map((po) => (
            <li key={po.id} data-testid={`purchase-order-item-${po.id}`}>
              <span data-testid={`purchase-order-item-id-${po.id}`}>{po.id}</span>
              <span data-testid={`purchase-order-item-status-${po.id}`}>{po.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
