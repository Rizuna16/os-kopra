import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { adjustStock } from "../inventory/inventoryService";
import { ApiError } from "../auth/types";
import type { Stock } from "../inventory/types";

export function StockAdjustment() {
  const { currentLocationId } = useBusiness();
  const navigate = useNavigate();
  const [location, setLocation] = useState(currentLocationId ?? "");
  const [variant, setVariant] = useState("");
  const [quantity, setQuantity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Stock | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    const qty = quantity === "" ? 0 : Number(quantity);
    setSubmitting(true);
    try {
      const res = await adjustStock({ location, variant, quantity: qty });
      setResult(res);
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
            : "Failed to adjust stock",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 max-w-xl mx-auto">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">Stock Adjustment</h1>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4 mb-4" data-testid="stock-adjustment-error">{error}</div>}
          <form data-testid="stock-adjustment-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
              <select
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                data-testid="stock-adjustment-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                <option value="">Select location</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Variant</label>
              <select
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                data-testid="stock-adjustment-variant"
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
              >
                <option value="">Select variant</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity</label>
              <input
                type="text"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                data-testid="stock-adjustment-quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="stock-adjustment-submit"
              disabled={submitting}
            >
              {submitting ? "…" : "Adjust"}
            </button>
            {result && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 mt-4" data-testid="stock-adjustment-result">
                <div className="text-sm text-gray-900">
                  Adjustment quantity: <span className="font-semibold">{result.quantity}</span>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}