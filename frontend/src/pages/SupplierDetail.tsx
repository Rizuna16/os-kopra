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

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Supplier</h1>
            <div data-testid="supplier-detail-loading">Loading…</div>
          </div>
        </div>
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Supplier</h1>
            <div data-testid="supplier-detail-error" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4">{error}</div>
          </div>
        </div>
      </div>
    );
  if (!item) return <div data-testid="supplier-detail">No supplier.</div>;
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">Supplier</h1>
          <div data-testid="supplier-detail" className="space-y-2">
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
        </div>
      </div>
    </div>
  );
}
