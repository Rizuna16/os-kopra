import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { transferStock } from "../inventory/inventoryService";
import { ApiError } from "../auth/types";
import type { TransferResponse } from "../inventory/types";

export function StockTransfer() {
  const { currentLocationId, locations } = useBusiness();
  const navigate = useNavigate();
  const [sourceLocation, setSourceLocation] = useState(currentLocationId ?? "");
  const [destinationLocation, setDestinationLocation] = useState("");
  const [variant, setVariant] = useState("");
  const [quantity, setQuantity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TransferResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    const qty = quantity === "" ? 0 : Number(quantity);
    setSubmitting(true);
    try {
      const res = await transferStock({
        source_location: sourceLocation,
        destination_location: destinationLocation,
        variant,
        quantity: qty,
      });
      setResult(res);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setError(
        err instanceof ApiError && err.errors
          ? err.errors.non_field_errors?.[0] ??
              err.errors.quantity?.[0] ??
              err.errors.source_location?.[0] ??
              err.errors.destination_location?.[0] ??
              err.message
          : err instanceof Error
            ? err.message
            : "Failed to transfer stock",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">Stock Transfer</h1>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 sm:p-4 mb-4" data-testid="stock-transfer-error">{error}</div>}
          <form data-testid="stock-transfer-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Source Location</label>
              <select
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                data-testid="stock-transfer-source"
                value={sourceLocation}
                onChange={(e) => setSourceLocation(e.target.value)}
              >
                <option value="">Select source</option>
                {(locations ?? []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Destination Location</label>
              <select
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                data-testid="stock-transfer-destination"
                value={destinationLocation}
                onChange={(e) => setDestinationLocation(e.target.value)}
              >
                <option value="">Select destination</option>
                {(locations ?? []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Variant</label>
              <select
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                data-testid="stock-transfer-variant"
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
                data-testid="stock-transfer-quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 font-medium text-sm text-white rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="stock-transfer-submit"
              disabled={submitting}
            >
              {submitting ? "…" : "Transfer"}
            </button>
            {result && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 mt-4" data-testid="stock-transfer-result">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Source</span>
                    <span className="text-gray-900" data-testid="stock-transfer-source-result">{result.source.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Destination</span>
                    <span className="text-gray-900" data-testid="stock-transfer-destination-result">{result.destination.location}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-100">
                    <span className="font-medium text-gray-700">Transferred Quantity</span>
                    <span className="font-semibold text-blue-600" data-testid="stock-transfer-transferred-quantity">{result.transferred_quantity}</span>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}