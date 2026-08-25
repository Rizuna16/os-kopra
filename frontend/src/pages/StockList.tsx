import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { listStocks } from "../inventory/inventoryService";
import type { Stock } from "../inventory/types";
import { ApiError } from "../auth/types";

export function StockList() {
  const { currentBusinessId, currentLocationId } = useBusiness();
  const navigate = useNavigate();
  const [loc, setLoc] = useState<string | null>(currentLocationId);
  useEffect(() => {
    if (currentLocationId) setLoc(currentLocationId);
  }, [currentLocationId]);
  const [items, setItems] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBusinessId || !loc) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    listStocks(currentBusinessId, loc)
      .then((data) => {
        if (cancelled) return;
        setItems(data);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        setError(e instanceof ApiError ? e.message : "Failed to load stocks");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId, loc, navigate]);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-sm text-gray-500 py-8 text-center" data-testid="stock-list-loading">Loading…</div></div>;
  if (error) return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4"><div className="w-full max-w-md"><div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4" data-testid="stock-list-error">{error}</div></div></div>;
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">Stock List</h1>
          <div data-testid="stock-list">
            {items.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm" data-testid="stock-list-empty">No stocks.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {items.map((s) => (
                  <li key={s.id} className="py-3 flex items-center justify-between text-sm text-gray-900" data-testid={`stock-item-${s.id}`}>
                    <span>Variant: {s.variant}</span>
                    <span className="font-semibold">{s.quantity}</span>
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