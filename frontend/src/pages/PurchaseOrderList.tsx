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
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">Purchase Orders</h1>
          <div data-testid="purchase-order-list">
            {items.length === 0 ? (
              <div data-testid="purchase-order-list-empty">No purchase orders.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {items.map((po) => (
                  <li key={po.id} data-testid={`purchase-order-item-${po.id}`} className="py-4 flex justify-between items-center">
                    <span data-testid={`purchase-order-item-id-${po.id}`} className="text-sm font-medium text-gray-900">{po.id}</span>
                    <span data-testid={`purchase-order-item-status-${po.id}`} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{po.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
