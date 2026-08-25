import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getStock } from "../inventory/inventoryService";
import type { Stock } from "../inventory/types";
import { ApiError } from "../auth/types";

export function StockDetail() {
  const { stockId } = useParams<{ stockId: string }>();
  const navigate = useNavigate();
  const [stock, setStock] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stockId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getStock(stockId)
      .then((data) => {
        if (cancelled) return;
        setStock(data);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        setError(e instanceof ApiError ? e.message : "Failed to load stock");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stockId, navigate]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-sm text-gray-500 py-8 text-center" data-testid="stock-detail-loading">Loading…</div>
    </div>
  );
  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4" data-testid="stock-detail-error">{error}</div>
      </div>
    </div>
  );
  if (!stock) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center py-12 text-gray-500 text-sm" data-testid="stock-detail-empty">No stock.</div>
    </div>
  );
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 max-w-xl mx-auto">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">Stock Detail</h1>
          <div className="space-y-4" data-testid="stock-detail">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-700">Stock ID</span>
              <span className="text-sm text-gray-900 font-mono" data-testid="stock-id">{stock.id}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-700">Location</span>
              <span className="text-sm text-gray-900 font-mono" data-testid="stock-location">{stock.location}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-700">Variant</span>
              <span className="text-sm text-gray-900 font-mono" data-testid="stock-variant">{stock.variant}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm font-medium text-gray-700">Quantity</span>
              <span className="text-sm font-semibold text-gray-900" data-testid="stock-quantity">{stock.quantity}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}