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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div data-testid="sale-detail-loading" className="text-sm text-gray-500 py-8 text-center">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div data-testid="sale-detail-error" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4">{error}</div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <div data-testid="sale-detail" className="text-sm text-gray-500">No sale.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <div data-testid="sale-detail" className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">Sale Details</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6 border-b border-gray-100">
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Sale ID</span>
                <span data-testid="sale-detail-id" className="text-sm font-medium text-gray-900">{item.id}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Status</span>
                <span data-testid="sale-detail-status" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{item.status}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Created At</span>
                <span data-testid="sale-detail-created-at" className="text-sm text-gray-500">{item.created_at}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Updated At</span>
                <span data-testid="sale-detail-updated-at" className="text-sm text-gray-500">{item.updated_at}</span>
              </div>
            </div>

            <div className="py-4">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Lines</h2>
              {item.lines.length > 0 ? (
                <div data-testid="sale-detail-lines" className="space-y-3">
                  {item.lines.map((line) => (
                    <div key={line.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                      <span data-testid={`sale-detail-line-${line.id}-variant`} className="text-sm font-medium text-gray-900">{line.variant}</span>
                      <div className="flex gap-4">
                        <span data-testid={`sale-detail-line-${line.id}-quantity`} className="text-sm text-gray-500">Qty: {line.quantity}</span>
                        <span data-testid={`sale-detail-line-${line.id}-unit-price`} className="text-sm font-semibold text-gray-900">Price: {line.unit_price}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No lines.</p>
              )}
            </div>

            <div className="pt-6 border-t border-gray-100">
              <SaleDelete />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
