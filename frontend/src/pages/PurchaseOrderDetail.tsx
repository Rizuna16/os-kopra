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
    <div data-testid="purchase-order-detail">
      <p data-testid="purchase-order-detail-id">{item.id}</p>
      <p data-testid="purchase-order-detail-status">{item.status}</p>
      <p data-testid="purchase-order-detail-created-at">{item.created_at}</p>
      <p data-testid="purchase-order-detail-updated-at">{item.updated_at}</p>
      {item.lines.length > 0 ? (
        <div data-testid="purchase-order-detail-lines" className="mt-4">
          {item.lines.map((line) => (
            <div key={line.id} className="mt-2">
              <span data-testid={`purchase-order-detail-line-${line.id}-variant`}>{line.variant}</span>
              <span data-testid={`purchase-order-detail-line-${line.id}-quantity`}>{line.quantity}</span>
              <span data-testid={`purchase-order-detail-line-${line.id}-unit-price`}>{line.unit_price}</span>
            </div>
          ))}
        </div>
      ) : (
        <p>No lines.</p>
      )}
      <PurchaseOrderDelete />
    </div>
  );
}