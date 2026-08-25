import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { getPurchaseOrder } from "../purchasing/purchasingService";
import type { PurchaseOrder } from "../purchasing/types";
import { ApiError } from "../auth/types";
import { PurchaseOrderDelete } from "./PurchaseOrderDelete";

export function PurchaseOrderDetail() {
  const { poId } = useParams();
  const { currentBusinessId } = useBusiness();
  const [item, setItem] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBusinessId || !poId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPurchaseOrder(currentBusinessId, poId)
      .then((d) => {
        if (!cancelled) setItem(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Failed to load purchase order");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId, poId]);

  if (loading) return <div data-testid="purchase-order-detail-loading">Loading…</div>;
  if (error) return <div data-testid="purchase-order-detail-error">{error}</div>;
  if (!item) return <div data-testid="purchase-order-detail">No purchase order.</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <div data-testid="purchase-order-detail" className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">Purchase Order Details</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6 border-b border-gray-100">
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">PO ID</span>
                <span data-testid="purchase-order-detail-id" className="text-sm font-medium text-gray-900">{item.id}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Status</span>
                <span data-testid="purchase-order-detail-status" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{item.status}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Created At</span>
                <span data-testid="purchase-order-detail-created-at" className="text-sm text-gray-500">{item.created_at}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Updated At</span>
                <span data-testid="purchase-order-detail-updated-at" className="text-sm text-gray-500">{item.updated_at}</span>
              </div>
            </div>

            <div className="py-4">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Lines</h2>
              {item.lines.length > 0 ? (
                <div data-testid="purchase-order-detail-lines" className="space-y-3">
                  {item.lines.map((line) => (
                    <div key={line.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                      <span data-testid={`purchase-order-detail-line-${line.id}-variant`} className="text-sm font-medium text-gray-900">{line.variant}</span>
                      <div className="flex gap-4">
                        <span data-testid={`purchase-order-detail-line-${line.id}-quantity`} className="text-sm text-gray-500">Qty: {line.quantity}</span>
                        <span data-testid={`purchase-order-detail-line-${line.id}-unit-price`} className="text-sm font-semibold text-gray-900">Price: {line.unit_price}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No lines.</p>
              )}
            </div>

            <div className="pt-6 border-t border-gray-100">
              <PurchaseOrderDelete />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
