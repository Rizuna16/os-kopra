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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div data-testid="sale-list-loading" className="text-sm text-gray-500 py-8 text-center">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div data-testid="sale-list-error" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">Sales</h1>
          <div data-testid="sale-list">
            {items.length === 0 ? (
              <div data-testid="sale-list-empty" className="text-center py-12 text-gray-500 text-sm">No sales.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {items.map((po) => (
                  <li key={po.id} data-testid={`sale-item-${po.id}`} className="py-4 flex justify-between items-center">
                    <span data-testid={`sale-item-id-${po.id}`} className="text-sm font-medium text-gray-900">{po.id}</span>
                    <span data-testid={`sale-item-status-${po.id}`} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{po.status}</span>
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
