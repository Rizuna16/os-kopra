import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { createStock } from "../inventory/inventoryService";
import { listVariantsForBusiness, type Variant } from "../inventory/variantLookup";
import { ApiError } from "../auth/types";

export function StockCreate() {
  const { currentBusinessId, currentLocationId } = useBusiness();
  const navigate = useNavigate();
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBusinessId) return;
    listVariantsForBusiness(currentBusinessId)
      .then(setVariants)
      .catch(() => setVariants([]));
  }, [currentBusinessId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const qty = Number(quantity);
    if (!variantId || !quantity || Number.isNaN(qty) || qty <= 0) {
      setError("Quantity must be a positive number and a variant must be selected.");
      return;
    }
    if (!currentBusinessId || !currentLocationId) return;
    setSubmitting(true);
    try {
      await createStock(currentBusinessId, currentLocationId, {
        variant_id: variantId,
        quantity: qty,
      });
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
            : "Failed to create stock",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 max-w-xl mx-auto">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">Create Stock</h1>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4 mb-4" data-testid="stock-create-error">{error}</div>}
          <form data-testid="stock-create-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Variant</label>
              <select
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                data-testid="stock-variant-input"
                value={variantId}
                onChange={(e) => setVariantId(e.target.value)}
              >
                <option value="">Select variant</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
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
              data-testid="stock-create-submit"
              disabled={submitting}
            >
              {submitting ? "…" : "Create stock"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}