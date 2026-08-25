import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import {
  listBatches,
  createBatch,
} from "../inventory/inventoryService";
import type { Batch } from "../inventory/types";
import { ApiError } from "../auth/types";

export function BatchList() {
  const { currentLocationId } = useBusiness();
  const navigate = useNavigate();
  const [items, setItems] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState("BATCH-001");
  const [variant, setVariant] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expiredDate, setExpiredDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = () => {
    if (!currentLocationId) return;
    setLoading(true);
    setError(null);
    listBatches()
      .then(setItems)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        setError(e instanceof ApiError ? e.message : "Failed to load batches");
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [currentLocationId, navigate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setSubmitting(true);
    try {
      await createBatch({
        code,
        location: currentLocationId ?? "",
        variant,
        quantity: quantity === "" ? 0 : Number(quantity),
        expired_date: expiredDate ? expiredDate : null,
      });
      setCode("BATCH-001");
      setVariant("");
      setQuantity("");
      setExpiredDate("");
      load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setCreateError(
        err instanceof ApiError && err.errors?.code
          ? err.errors.code[0]
          : err instanceof Error
            ? err.message
            : "Failed to create batch",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-gray-500 py-8 text-center" data-testid="batch-list-loading">
          Loading…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div
            className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4"
            data-testid="batch-list-error"
          >
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="batch-list">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">Create Batch</h1>
              {createError && (
                <div
                  className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4 mb-4"
                  data-testid="batch-create-error"
                >
                  {createError}
                </div>
              )}
              <form data-testid="batch-create-form" onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Batch Code</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    data-testid="batch-code-input"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Variant</label>
                  <select
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    data-testid="batch-variant-input"
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
                    data-testid="batch-quantity-input"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Expiry Date</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    data-testid="batch-expired-date-input"
                    value={expiredDate}
                    onChange={(e) => setExpiredDate(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="batch-create-submit"
                  disabled={submitting}
                >
                  {submitting ? "…" : "Create batch"}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">Batch List</h2>
              {items.length === 0 ? (
                <div
                  className="text-center py-12 text-gray-500 text-sm"
                  data-testid="batch-list-empty"
                >
                  No batches.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {items.map((b) => (
                    <li
                      key={b.id}
                      className="py-3 flex items-center justify-between text-sm text-gray-900"
                      data-testid={`batch-item-${b.id}`}
                    >
                      <span data-testid="batch-code" className="font-medium text-gray-900">
                        {b.code}
                      </span>
                      <span data-testid="batch-quantity" className="font-semibold text-gray-700">
                        {b.quantity}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
