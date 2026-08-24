import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { getSupplier } from "../supplier/supplierService";
import type { Supplier } from "../supplier/types";
import { ApiError } from "../auth/types";
import { SupplierDelete } from "./SupplierDelete";

export function SupplierDetail() {
  const { supplierId } = useParams();
  const { currentBusinessId } = useBusiness();
  const [item, setItem] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBusinessId || !supplierId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getSupplier(currentBusinessId, supplierId)
      .then((d) => {
        if (!cancelled) setItem(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Failed to load supplier");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId, supplierId]);

  if (loading) return <div data-testid="supplier-detail-loading">Loading…</div>;
  if (error) return <div data-testid="supplier-detail-error">{error}</div>;
  if (!item) return <div data-testid="supplier-detail">No supplier.</div>;
  return (
    <div data-testid="supplier-detail" className="p-4 space-y-2">
      <h1 className="text-2xl font-bold">Supplier</h1>
      <p data-testid="supplier-detail-id">{item.id}</p>
      <p data-testid="supplier-detail-business">{item.business}</p>
      <p data-testid="supplier-detail-name">{item.name}</p>
      <p data-testid="supplier-detail-phone">{item.phone}</p>
      <p data-testid="supplier-detail-email">{item.email}</p>
      <p data-testid="supplier-detail-address">{item.address}</p>
      <p data-testid="supplier-detail-created-at">{item.created_at}</p>
      <p data-testid="supplier-detail-updated-at">{item.updated_at}</p>
      <SupplierDelete />
    </div>
  );
}
