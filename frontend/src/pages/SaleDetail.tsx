import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { getSale } from "../sales/saleService";
import type { Sale } from "../sales/types";
import { ApiError } from "../auth/types";
import { SaleDelete } from "./SaleDelete";

export function SaleDetail() {
  const { saleId } = useParams();
  const { currentBusinessId } = useBusiness();
  const [item, setItem] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBusinessId || !saleId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getSale(currentBusinessId, saleId)
      .then((d) => {
        if (!cancelled) setItem(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Failed to load sale");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId, saleId]);

  if (loading) return <div data-testid="sale-detail-loading">Loading…</div>;
  if (error) return <div data-testid="sale-detail-error">{error}</div>;
  if (!item) return <div data-testid="sale-detail">No sale.</div>;
  return (
    <div data-testid="sale-detail">
      <p data-testid="sale-detail-id">{item.id}</p>
      <p data-testid="sale-detail-status">{item.status}</p>
      <p data-testid="sale-detail-created-at">{item.created_at}</p>
      <p data-testid="sale-detail-updated-at">{item.updated_at}</p>
      {item.lines.length > 0 ? (
        <div data-testid="sale-detail-lines" className="mt-4">
          {item.lines.map((line) => (
            <div key={line.id} className="mt-2">
              <span data-testid={`sale-detail-line-${line.id}-variant`}>{line.variant}</span>
              <span data-testid={`sale-detail-line-${line.id}-quantity`}>{line.quantity}</span>
              <span data-testid={`sale-detail-line-${line.id}-unit-price`}>{line.unit_price}</span>
            </div>
          ))}
        </div>
      ) : (
        <p>No lines.</p>
      )}
      <SaleDelete />
    </div>
  );
}
