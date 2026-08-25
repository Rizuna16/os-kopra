import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getStock, updateStock } from "../inventory/inventoryService";
import type { Stock } from "../inventory/types";
import { ApiError } from "../auth/types";

export function StockEdit() {
  const { stockId } = useParams<{ stockId: string }>();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stockId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getStock(stockId)
      .then((data: Stock) => {
        if (cancelled) return;
        setQuantity(data.quantity);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockId) return;
    setError(null);
    setSubmitting(true);
    try {
      const qty = Number(quantity);
      await updateStock(stockId, { quantity: qty });
      navigate("/inventory/stocks");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setError(
        err instanceof ApiError && err.errors?.quantity
          ? err.errors.quantity[0]
          : err instanceof Error
            ? err.message
            : "Failed to update stock",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-sm text-gray-500 py-8 text-center" data-testid="stock-edit-loading">Loading…</div>
    </div>
  );
  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4" data-testid="stock-edit-error">{error}</div>
      </div>
    </div>
  );
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 max-w-xl mx-auto">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">Edit Stock</h1>
          <form data-testid="stock-edit-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="stock-quantity" className="block text-sm font-medium text-gray-700 mb-1.5">Quantity</label>
              <input
                id="stock-quantity"
                type="text"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                data-testid="stock-quantity-input"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="stock-edit-submit"
              disabled={submitting}
            >
              {submitting ? "…" : "Save"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}